/**
 * Launch Extension - Before Event Send Callback with Clicked Element
 *
 * This script is designed to work with Launch's before event send callback
 * where the content object contains a clickedElement property.
 *
 * Purpose:
 * - Extracts partner data from cookies
 * - Extracts partner card metadata directly from the clicked DOM element
 * - Sets data in content.xdm._adobepartners
 * - Stores card context in window._adobePartners.partnerCard.context
 *
 * Key Difference from customDataCollection.ts:
 * - Does NOT rely on event.composedPath() or event traversal
 * - Works with a direct reference to the clicked DOM element
 * - Extracts card metadata by traversing up from the clicked element to find the card
 */

import { createLogger } from '../utils/logger';
import { extractPartnerDataScript } from './extractPartnerData';
import { splitAndGet, getAttribute, getTextContent, queryShadow } from '../utils/dom';
import type { PartnerCardCtx } from '../types';

const DEFAULT_COOKIE_KEY = 'partner_data';

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

/**
 * Type for the content object passed to Launch's before event send callback
 */
interface LaunchEventContent {
  clickedElement?: Element; // The clicked DOM element
  xdm?: {
    eventType?: string;
    _adobepartners?: {
      partnerData?: unknown;
      cardCollection?: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Finds the closest ancestor element that matches a predicate
 *
 * @param element - The starting element
 * @param predicate - Function to test each ancestor
 * @param maxDepth - Maximum number of levels to traverse (default: 20)
 * @returns The first matching ancestor or null
 */
function findAncestor(
  element: Element | null,
  predicate: (el: Element) => boolean,
  maxDepth: number = 20
): Element | null {
  let current = element;
  let depth = 0;

  while (current && depth < maxDepth) {
    if (predicate(current)) {
      return current;
    }

    // Handle shadow DOM boundaries
    const parent = current.parentElement;
    if (!parent && current.getRootNode) {
      const root = current.getRootNode();
      if (root instanceof ShadowRoot) {
        current = root.host as Element;
      } else {
        break;
      }
    } else {
      current = parent;
    }

    depth += 1;
  }

  return null;
}

/**
 * Checks if an element is or matches a partner card
 */
function isPartnerCard(element: Element): boolean {
  const tagName = element.tagName.toLowerCase();
  const hasClass = element.classList.contains(CARD_TYPES.CLASS_NAME);

  return tagName === CARD_TYPES.TAG_NAME || hasClass;
}

/**
 * Checks if an element is a card collection wrapper
 */
function isCardWrapper(element: Element): boolean {
  return element.classList.contains(WRAPPER_CLASS);
}

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

  // Extract card metadata from daa-lh attribute
  const cardDaaLh = getAttribute(cardElement, ATTRIBUTES.DAA_LH);
  const contentID = splitAndGet(cardDaaLh, '|', DAA_LH_INDICES.CONTENT_ID);
  const position = splitAndGet(cardDaaLh, '|', DAA_LH_INDICES.POSITION);

  // Extract card title from shadow DOM
  const cardTitleElement = queryShadow(cardElement, SELECTORS.CARD_TITLE);
  const cardTitle = getTextContent(cardTitleElement);

  if (!cardTitle) {
    logger.error('Card title not found in shadow DOM');
    return null;
  }

  // Extract CTA text from first link
  const firstLink = queryShadow(cardElement, SELECTORS.FIRST_LINK);
  const ctaText = getAttribute(firstLink, ATTRIBUTES.DAA_LL);

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
 * Extracts partner card metadata from a clicked element
 *
 * @param clickedElement - The clicked DOM element
 * @param logger - Logger instance
 * @returns Partner card context or null if not a card click
 */
function extractCardMetadataFromClick(
  clickedElement: Element,
  logger: ReturnType<typeof createLogger>
): PartnerCardCtx | null {
  logger.log('Extracting card metadata from clicked element', clickedElement);

  // Find the partner card element (traverse up from clicked element)
  const cardElement = findAncestor(clickedElement, isPartnerCard);

  if (!cardElement) {
    logger.log('Clicked element is not within a partner card');
    return null;
  }

  logger.log('Found partner card element', cardElement);

  // Find the wrapper element to get section context
  const wrapper = findAncestor(cardElement, isCardWrapper);

  if (!wrapper) {
    logger.log('No wrapper found for card element');
    return null;
  }

  logger.log('Found wrapper element', wrapper);

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
 * Main script for setting partner data in window._adobePartners on filter click
 *
 * @param content - The content object from Launch's before event send callback
 * @param testMode - Enable verbose logging and test output (default: false)
 * @param cookieKey - The cookie key to read partner data from (default: 'partner_data')
 *
 * @example
 * // In Launch Extension before event send callback:
 * customDataCollectionOnFilterClickCallback(content);
 *
 * @example
 * // Test mode:
 * const mockContent = {
 *   clickedElement: document.querySelector('single-partner-card')
 * };
 * customDataCollectionOnFilterClickCallback(mockContent, true);
 */
export default function customDataCollectionOnFilterClickCallbackScript(
  content: LaunchEventContent,
  testMode: boolean = false,
  cookieKey: string = DEFAULT_COOKIE_KEY
): void {
  const logger = createLogger(testMode, 'Filter Click Callback', testMode);

  try {
    logger.testHeader('FILTER CLICK CALLBACK', `Cookie Key: ${cookieKey}`);
    logger.testInfo('Provided content object', content);

    // Get partner data using extractPartnerDataScript
    const partnerData = extractPartnerDataScript(testMode, cookieKey);
    logger.log('Extracted partner data', partnerData);

    // Extract card metadata from clicked element if available
    let cardCollection = null;
    if (content.clickedElement) {
      logger.log('Clicked element provided, extracting card metadata');
      cardCollection = extractCardMetadataFromClick(content.clickedElement, logger);
    } else {
      logger.log('No clicked element provided');
    }

    // Store in window._adobePartners
    window._adobePartners = window._adobePartners ?? {};
    window._adobePartners.partnerData = partnerData;

    if (cardCollection) {
      window._adobePartners.partnerCard = window._adobePartners.partnerCard ?? {};
      window._adobePartners.partnerCard.context = cardCollection;
      logger.log('Stored partner data and card context in window._adobePartners');
    } else {
      logger.log('Stored partner data in window._adobePartners (no card context)');
    }

    if (testMode) {
      logger.testResult(window._adobePartners);
    }
  } catch (error) {
    logger.error('Unexpected error in filter click callback:', error);
  }
}
