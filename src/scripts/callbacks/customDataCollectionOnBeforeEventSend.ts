/**
 * Launch Extension - Before Event Send Callback
 *
 * This script is meant to be copy/pasted into:
 * Launch Extension -> Data Collection -> Edit on before event send callback
 *
 * Purpose:
 * - Extracts partner data from cookies (using extractPartnerData logic)
 * - Extracts partner card metadata from event.composedPath()
 * - Sets both in content.xdm._adobepartners
 * - Only runs for non-page-view events
 *
 * Architecture:
 * - This callback does ALL DATA EXTRACTION
 * - Filtering happens in customDataCollectionOnFilterClickCallback
 * - No window._adobePartners storage needed
 */

import { executeScript } from '../../utils/script';
import { extractPartnerDataScript } from '../data/extractPartnerData';
import {
  getAttribute,
  getTextContent,
  queryShadow,
  findInComposedPath,
  createElementMatcher,
  extractStructuredAttribute,
} from '../../utils/dom';
import { getStorageItem } from '../../utils/storage';
import logEventInfo, { shouldProcessEventType } from '../../utils/events';
import { setNestedValue, conditionalProperties, mergeNonNull } from '../../utils/object';
import type { PartnerCardCtx, CheckoutData, CartItem } from '../../types';
import { createLogger } from '../../utils/logger';
import { DEFAULT_COOKIE_KEYS, ATTENDEE_STORAGE_KEY } from '../../utils/constants';
import { isHostnameMatch } from '../../utils/url';
import { extractImsDataScript } from '../data/extractImsData';
import { extractPublisherDataScript } from '../data/extractPublisherData';

// Constants for card metadata extraction
const SELECTORS = {
  CARD_TITLE: '.card-title',
  PARTNER_CARDS: '.partner-cards',
  FIRST_LINK: 'a',
} as const;

const ATTRIBUTES = {
  DAA_LH: 'daa-lh',
  DAA_LL: 'daa-ll',
} as const;

const CARD_TYPES = {
  TAG_NAME: 'single-partner-card',
  CLASS_NAME: 'card-wrapper',
} as const;

const WRAPPER_CLASS = 'dx-card-collection-wrapper';
const CONTENT_TYPE = 'partner_card' as const;

const DAA_LH_INDICES = {
  POSITION: 0,
  CONTENT_ID: 2,
} as const;

// Checkout extraction selectors
const CHECKOUT_SELECTORS = {
  PAYMENT_METHOD_RADIO: 'input[name="payment[method]"]:checked',
  CART_ITEMS_CONTAINER: 'ol.minicart-items',
  CART_ITEM: 'li.product-item',
  PRODUCT_NAME: '.product-item-name',
} as const;

// Magento cache storage key
const MAGE_CACHE_STORAGE_KEY = 'mage-cache-storage';

// Type for Magento cache storage cart data
interface MageCacheCartItem {
  product_type: string;
  qty: number;
  product_id: string;
  product_name: string;
  product_sku: string;
  product_url: string;
  product_price_value: number;
  [key: string]: unknown;
}

interface MageCacheStorage {
  cart?: {
    items?: MageCacheCartItem[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Type for the content object passed to Launch's before event send callback
 */
interface LaunchEventContent {
  xdm?: {
    eventType?: string;
    _adobepartners?: {
      partnerData?: unknown;
      cardCollection?: unknown;
      linkClickLabel?: string;
      Checkout?: CheckoutData;
      eventData?: unknown;
      attendeeData?: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// Create element matchers using utility functions
const isPartnerCard = createElementMatcher(CARD_TYPES.TAG_NAME, CARD_TYPES.CLASS_NAME);
const isCardWrapper = createElementMatcher(undefined, WRAPPER_CLASS);

/**
 * Extracts context metadata for a wrapper element
 */
function extractWrapperContext(
  wrapper: Element,
  logger: ReturnType<typeof createLogger>
): { sectionID: string; filterContext: string } {
  // Get section ID from parent element
  if (!wrapper.parentElement) {
    logger.warn('Wrapper has no parent element, sectionID will be empty');
  }
  const sectionID = getAttribute(wrapper.parentElement, ATTRIBUTES.DAA_LH);

  // Get filter context from shadow DOM
  const { shadowRoot } = wrapper as Element & { shadowRoot?: ShadowRoot };
  const partnerCardsElement = shadowRoot?.querySelector(SELECTORS.PARTNER_CARDS);
  const filterContext = getAttribute(partnerCardsElement, ATTRIBUTES.DAA_LH);

  if (!sectionID) {
    logger.warn('Wrapper missing sectionID (parent daa-lh attribute)');
  }

  return { sectionID, filterContext };
}

/**
 * Extracts card metadata (contentID, position) from daa-lh attribute
 * @param cardElement - The card element
 * @returns Object with contentID and position
 */
function extractCardMetadata(cardElement: Element): { contentID: string; position: string } {
  const metadata = extractStructuredAttribute(cardElement, ATTRIBUTES.DAA_LH, '|', {
    contentID: DAA_LH_INDICES.CONTENT_ID,
    position: DAA_LH_INDICES.POSITION,
  });
  return {
    contentID: metadata.contentID || '',
    position: metadata.position || '',
  };
}

/**
 * Extracts card title from shadow DOM
 * @param cardElement - The card element
 * @param logger - Logger instance
 * @returns Card title or null if not found
 */
function extractCardTitle(
  cardElement: Element,
  logger: ReturnType<typeof createLogger>
): string | null {
  const cardTitleElement = queryShadow(cardElement, SELECTORS.CARD_TITLE);
  const cardTitle = getTextContent(cardTitleElement);

  if (!cardTitle) {
    logger.error('Card title not found in shadow DOM');
    return null;
  }

  return cardTitle;
}

/**
 * Extracts CTA text from first link in card
 * @param cardElement - The card element
 * @returns CTA text from daa-ll attribute
 */
function extractCtaText(cardElement: Element): string {
  const firstLink = queryShadow(cardElement, SELECTORS.FIRST_LINK);
  return getAttribute(firstLink, ATTRIBUTES.DAA_LL);
}

/**
 * Extracts daa-ll from clicked link in event's composed path
 * Works for all link clicks, not just partner cards
 * @param event - The click event
 * @returns daa-ll attribute value from the clicked link, or empty string if not found
 */
export function extractLinkDaaLl(
  event: PointerEvent | MouseEvent | undefined,
  logger: ReturnType<typeof createLogger>
): string {
  logger.log('extractLinkDaaLl called with event', event);
  if (!event) {
    logger.log('No event provided, returning empty string');
    return '';
  }
  const isLink = createElementMatcher('a');
  const linkElement = findInComposedPath(event, isLink);
  logger.log('Found link element', linkElement);
  const daaLlValue = getAttribute(linkElement, ATTRIBUTES.DAA_LL);
  logger.log('daa-ll value', daaLlValue);
  return daaLlValue;
}

/**
 * Checks if the clicked element is the Place Order button
 * @param event - The click event
 * @returns true if Place Order button was clicked
 */
function isPlaceOrderClick(event: PointerEvent | MouseEvent | undefined): boolean {
  if (!event) return false;

  const isPlaceOrderButton = createElementMatcher('button', 'action');
  const button = findInComposedPath(event, isPlaceOrderButton);

  if (!button) return false;

  // Verify it's the checkout button with Place Order text
  const hasCheckoutClass = button.classList.contains('checkout');
  const hasPlaceOrderText = button.textContent?.toLowerCase().includes('place order');

  return hasCheckoutClass && !!hasPlaceOrderText;
}

/**
 * Extracts the selected payment method title
 * @param logger - Logger instance
 * @returns Payment method title string, or empty string if not found
 */
function extractPaymentType(logger: ReturnType<typeof createLogger>): string {
  const checkedRadio = document.querySelector(
    CHECKOUT_SELECTORS.PAYMENT_METHOD_RADIO
  ) as HTMLInputElement | null;

  if (!checkedRadio) {
    logger.log('No payment method selected');
    return '';
  }

  // Find the label for this radio button
  const label = document.querySelector(`label[for="${checkedRadio.id}"]`);
  const rawPaymentType = getTextContent(label) || checkedRadio.value;
  const paymentType = rawPaymentType.startsWith('Invoice') ? 'Invoice' : 'Credit Card';

  logger.log('Extracted payment type', paymentType);
  return paymentType;
}

/**
 * Extracts cart items from Magento's mage-cache-storage in localStorage
 * @param logger - Logger instance
 * @returns Array of CartItem objects, or null if not found
 */
function extractCartItemsFromStorage(logger: ReturnType<typeof createLogger>): CartItem[] | null {
  const cacheData = getStorageItem<MageCacheStorage>(MAGE_CACHE_STORAGE_KEY);

  if (!cacheData?.cart?.items?.length) {
    return null;
  }

  const cartItems: CartItem[] = cacheData.cart.items.map((item) => ({
    type: item.product_type || '',
    quantity: Number(item.qty) || 0,
    productID: item.product_id || '',
    productName: item.product_name || '',
    SKU: item.product_sku || '',
    url: item.product_url || '',
    price: Number(item.product_price_value) || 0,
  }));

  logger.log('Extracted cart items from localStorage', cartItems);
  return cartItems;
}

/**
 * Extracts cart items from DOM (fallback when localStorage is unavailable)
 * Note: Only product names are available from DOM, other fields will be empty/zero
 * @param logger - Logger instance
 * @returns Array of CartItem objects with only productName populated
 */
function extractCartItemsFromDOM(logger: ReturnType<typeof createLogger>): CartItem[] {
  const itemElements = document.querySelectorAll(
    `${CHECKOUT_SELECTORS.CART_ITEMS_CONTAINER} ${CHECKOUT_SELECTORS.CART_ITEM}`
  );

  if (!itemElements.length) {
    logger.log('No cart items found in DOM');
    return [];
  }

  const cartItems: CartItem[] = [];

  itemElements.forEach((item) => {
    const nameElement = item.querySelector(CHECKOUT_SELECTORS.PRODUCT_NAME);
    const productName = getTextContent(nameElement);

    if (productName) {
      cartItems.push({
        type: '',
        quantity: 0,
        productID: '',
        productName,
        SKU: '',
        url: '',
        price: 0,
      });
    }
  });

  logger.log('Extracted cart items from DOM (fallback)', cartItems);
  return cartItems;
}

/**
 * Extracts cart items, trying localStorage first then falling back to DOM
 * @param logger - Logger instance
 * @returns Array of CartItem objects matching XDM schema
 */
function extractCartItems(logger: ReturnType<typeof createLogger>): CartItem[] {
  // Try localStorage first (has full data)
  const storageItems = extractCartItemsFromStorage(logger);
  if (storageItems) {
    return storageItems;
  }

  // Fallback to DOM extraction (limited data - only product names)
  logger.log('localStorage extraction failed, falling back to DOM');
  return extractCartItemsFromDOM(logger);
}

/**
 * Extracts checkout data when Place Order button is clicked
 * @param event - The click event
 * @param logger - Logger instance
 * @returns Checkout data or null if not a Place Order click
 */
function extractCheckoutData(
  event: PointerEvent | MouseEvent | undefined,
  logger: ReturnType<typeof createLogger>
): CheckoutData | null {
  if (!isPlaceOrderClick(event)) {
    return null;
  }

  logger.log('Place Order button clicked, extracting checkout data');

  const paymentType = extractPaymentType(logger);
  const itemsInCart = extractCartItems(logger);

  // Only return checkout data if we have at least payment type or cart items
  if (!paymentType && !itemsInCart.length) {
    logger.warn('Could not extract checkout data');
    return null;
  }

  const checkoutData: CheckoutData = {
    paymentType,
    itemsInCart,
  };

  logger.log('Extracted checkout data', checkoutData);
  return checkoutData;
}

/**
 * Extracts partner card context from a card element
 */
function extractCardCtxFromElement(
  cardElement: Element,
  sectionID: string,
  filterContext: string,
  logger: ReturnType<typeof createLogger>
): PartnerCardCtx | null {
  // Validate input
  if (!cardElement) {
    logger.error('Card element is required');
    return null;
  }

  // Extract all card data
  const { contentID, position } = extractCardMetadata(cardElement);
  const cardTitle = extractCardTitle(cardElement, logger);

  if (!cardTitle) {
    return null;
  }

  const ctaText = extractCtaText(cardElement);

  // Build result object
  const result: PartnerCardCtx = {
    cardTitle,
    contentID,
    contentType: CONTENT_TYPE,
    ctaText,
    filterContext,
    name: cardTitle,
    position,
    sectionID,
  };

  logger.log('Extracted card context', result);
  return result;
}

/**
 * Extracts partner card metadata from event's composed path
 *
 * @param event - The event object (PointerEvent or MouseEvent)
 * @param logger - Logger instance
 * @returns Partner card context or null if not a card click
 */
function extractCardMetadataFromEvent(
  event: PointerEvent | MouseEvent,
  logger: ReturnType<typeof createLogger>
): PartnerCardCtx | null {
  logger.log('Extracting card metadata from event.composedPath()');

  // Find the partner card element in the composed path
  const cardElement = findInComposedPath(event, isPartnerCard);

  if (!cardElement) {
    logger.log('Event did not occur within a partner card');
    return null;
  }

  logger.log('Found partner card element in composed path', cardElement);

  // Find the wrapper element to get section context
  const wrapper = findInComposedPath(event, isCardWrapper);

  if (!wrapper) {
    logger.log('No wrapper found in composed path');
    return null;
  }

  logger.log('Found wrapper element in composed path', wrapper);

  // Extract context metadata from wrapper
  const { sectionID, filterContext } = extractWrapperContext(wrapper, logger);

  // Extract the card context
  const cardContext = extractCardCtxFromElement(cardElement, sectionID, filterContext, logger);

  if (!cardContext) {
    logger.warn('Failed to extract card context');
    return null;
  }

  return cardContext;
}

/**
 * Extracts card collection data from event
 * @param event - The pointer/mouse event
 * @param logger - Logger instance
 * @returns Card collection context or null
 */
function extractCardCollectionFromEvent(
  event: PointerEvent | MouseEvent | undefined,
  logger: ReturnType<typeof createLogger>
): PartnerCardCtx | null {
  if (!event) {
    logger.log('No event provided, skipping card collection extraction');
    return null;
  }

  const cardCollection = extractCardMetadataFromEvent(event, logger);
  if (cardCollection) {
    logger.log('Extracted card collection from event', cardCollection);
  } else {
    logger.log('No card collection found in event (click was not on a partner card)');
  }

  return cardCollection;
}

/**
 * Reads event data from window global (stored by fetchEventData on page load)
 */
function extractEventDataFromGlobal(logger: ReturnType<typeof createLogger>): unknown | null {
  const eventData = window._adobePartners?.eventData?.apiResponse;
  if (!eventData) {
    logger.log('No event data in window._adobePartners');
    return null;
  }
  logger.log('Found event data from global state', eventData);
  return eventData;
}

/**
 * Reads attendee data from localStorage
 */
function extractAttendeeData(logger: ReturnType<typeof createLogger>): unknown | null {
  const data = getStorageItem(ATTENDEE_STORAGE_KEY);
  if (!data) {
    logger.log('No attendee data in localStorage');
    return null;
  }
  logger.log('Found attendee data', data);
  return data;
}

/**
 * Main script for setting partner data on event
 *
 * @param content - The content object from Launch's before event send callback
 * @param event - The original event object (PointerEvent or MouseEvent)
 * @param testMode - Enable verbose logging and test output (default: false)
 * @param cookieKeys - Array of cookie keys to extract from (later keys take precedence when merging)
 */
export default function customDataCollectionOnBeforeEventSendScript(
  content: LaunchEventContent,
  event?: PointerEvent | MouseEvent,
  testMode: boolean = false,
  cookieKeys: string[] = DEFAULT_COOKIE_KEYS
): LaunchEventContent {
  return executeScript(
    {
      scriptName: 'Before Send Callback',
      testMode,
      testHeaderTitle: 'BEFORE SEND EVENT CALLBACK - TEST MODE',
      testHeaderExtraInfo: `Cookie Keys: ${cookieKeys.join(', ')}`,
      onError: (error, logger) => {
        logger.error('Unexpected error in before send callback:', error);
        return content;
      },
    },
    (logger) => {
      // Log event information
      logEventInfo(event, logger);

      // Extract and set page name for ALL event types (including page views)
      const pageName = document.title;
      logger.log('Extracted page name', pageName);

      if (pageName) {
        setNestedValue(content, 'xdm.web.webPageDetails.name', pageName, true);
        setNestedValue(content, 'xdm.web.webPageDetails.viewName', pageName, true);
      }

      // Skip page view events for partner data enrichment
      if (
        !shouldProcessEventType(content.xdm?.eventType, ['web.webpagedetails.pageViews'], logger)
      ) {
        return content;
      }

      // Extract IMS data from localStorage
      const imsData = extractImsDataScript(testMode);
      logger.log('Extracted IMS data from localStorage', imsData);

      // Extract partner data from cookies
      const partnerData = extractPartnerDataScript(testMode, cookieKeys);
      logger.log('Extracted partner data from cookie', partnerData);

      // Extract publisher data from localStorage
      const publisherData = extractPublisherDataScript(testMode);
      logger.log('Extracted publisher data from localStorage', publisherData);

      // Extract card collection context from event if available
      const cardCollection = extractCardCollectionFromEvent(event, logger);

      // Extract daa-ll from any clicked link
      const linkClickLabel = extractLinkDaaLl(event, logger);
      if (linkClickLabel) {
        logger.log('Extracted link daa-ll', linkClickLabel);
      }

      // Extract checkout data if Place Order button was clicked
      const checkout = extractCheckoutData(event, logger);

      // Extract event and attendee data on adobeevents.com pages
      const isAdobeEventsPage = isHostnameMatch('*.adobeevents.com');
      const eventData = isAdobeEventsPage ? extractEventDataFromGlobal(logger) : null;
      const attendeeData = isAdobeEventsPage ? extractAttendeeData(logger) : null;

      // Set partner data in _adobepartners using nested object utilities
      setNestedValue(
        content,
        'xdm._adobepartners',
        mergeNonNull(
          { partnerData: partnerData as Record<string, never> },
          conditionalProperties(imsData !== null, {
            IMS: imsData as unknown as Record<string, never>,
          }),
          conditionalProperties(cardCollection !== null, { cardCollection }),
          conditionalProperties(linkClickLabel !== '', { linkClickLabel }),
          conditionalProperties(checkout !== null, { Checkout: checkout }),
          conditionalProperties(eventData !== null, { eventData }),
          conditionalProperties(attendeeData !== null, { attendeeData }),
          conditionalProperties(publisherData !== null, {
            publisherData: publisherData as unknown as Record<string, never>,
          })
        ),
        true
      );

      return content;
    }
  );
}
