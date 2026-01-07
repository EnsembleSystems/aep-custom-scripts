/**
 * Partner Card Data Extractor for Adobe Experience Platform (AEP)
 *
 * Parses click events on partner cards and extracts data from the shadow DOM.
 * Uses direct click listeners on card collection wrappers to handle shadow DOM properly.
 *
 * USAGE IN ADOBE LAUNCH:
 * ----------------------
 * This script should be used in a RULE ACTION on page load (not click events).
 *
 * Setup:
 * 1. Create a Rule with Event Type: "Page Bottom" or "DOM Ready"
 * 2. In the Action, select "Custom Code"
 * 3. Paste this script - it will automatically attach click listeners to all cards
 * 4. Click data is stored in window.partnerCardData and triggers 'partnerCardClick' event
 *
 * The script handles shadow DOM by:
 * - Finding all .dx-card-collection-wrapper elements
 * - Accessing their shadow roots
 * - Attaching click listeners to cards inside shadow DOM
 * - Extracting metadata when clicked
 *
 * To track clicks in AEP, create another Rule:
 * - Event: Custom Event, type='partnerCardClick'
 * - Use %window.partnerCardData% in analytics
 */

import { createLogger } from '../utils/logger.js';
import {
  splitAndGet,
  getAttribute,
  getTextContent,
  queryShadow,
  findInComposedPath,
  matchesElement,
  dispatchCustomEvent,
} from '../utils/dom.js';

// Types
export interface PartnerCardConfig {
  debug: boolean;
}

export interface PartnerCardCtx {
  cardTitle: string;
  contentID: string;
  contentType: string;
  ctaText: string;
  filterContext: string;
  name: string;
  position: string;
  sectionID: string;
}

// Constants for security and maintainability
const SELECTORS = {
  CARD_COLLECTION_WRAPPER: '.dx-card-collection-wrapper',
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

const EVENT_NAMES = {
  PARTNER_CARD_CLICK: 'partnerCardClick',
} as const;

const CONTENT_TYPE = 'partner_card' as const;

const DAA_LH_INDICES = {
  POSITION: 0,
  CONTENT_ID: 2,
} as const;

/**
 * Extracts partner card context from a card element
 * Single Responsibility: Context extraction only
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
 * Finds the partner card element in the event's composed path
 * Single Responsibility: Card element lookup
 */
function findCardInPath(event: Event, logger: ReturnType<typeof createLogger>): Element | null {
  const cardElement = findInComposedPath(event, (el) =>
    matchesElement(el, CARD_TYPES.TAG_NAME, CARD_TYPES.CLASS_NAME)
  );

  if (!cardElement) {
    logger.log('Click was not on a card element');
  }

  return cardElement;
}

/**
 * Handles click events on the shadow host (wrapper)
 * Single Responsibility: Event handling and coordination
 */
function handleWrapperClick(
  event: Event,
  sectionID: string,
  filterContext: string,
  logger: ReturnType<typeof createLogger>
): void {
  // Find the card element in the composed path
  const cardElement = findCardInPath(event, logger);

  if (!cardElement) {
    return;
  }

  // Extract the card context
  const cardContext = extractCardCtxFromElement(cardElement, sectionID, filterContext, logger);

  if (!cardContext) {
    logger.warn('Failed to extract card context');
    return;
  }

  // Ensure window._adobePartners.partnerCard exists
  window._adobePartners = window._adobePartners ?? {};
  window._adobePartners.partnerCard = window._adobePartners.partnerCard ?? {};

  // Store in window for AEP to access
  window._adobePartners.partnerCard.context = cardContext;

  // Trigger custom event for AEP
  dispatchCustomEvent(EVENT_NAMES.PARTNER_CARD_CLICK, cardContext);

  logger.log('Card click processed successfully');
}

/**
 * Extracts context metadata for a wrapper element
 * Single Responsibility: Context extraction
 */
function extractWrapperContext(
  wrapper: Element,
  logger: ReturnType<typeof createLogger>
): { sectionID: string; filterContext: string } {
  // Get section ID from parent element
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
 * Attaches click listener to a single wrapper element
 * Single Responsibility: Single wrapper listener attachment
 */
function attachListenerToWrapper(
  wrapper: Element,
  logger: ReturnType<typeof createLogger>,
  processedWrappers: WeakSet<Element>
): boolean {
  // Skip if already processed
  if (processedWrappers.has(wrapper)) {
    return false;
  }

  const { sectionID, filterContext } = extractWrapperContext(wrapper, logger);

  // Use arrow function to preserve context
  wrapper.addEventListener('click', (event) => {
    handleWrapperClick(event, sectionID, filterContext, logger);
  });

  // Mark as processed
  processedWrappers.add(wrapper);
  return true;
}

/**
 * Sets up click listeners on shadow host wrappers
 * Single Responsibility: Listener setup
 */
function setupClickListeners(
  logger: ReturnType<typeof createLogger>,
  processedWrappers: WeakSet<Element>
): number {
  // Find all card collection wrappers (shadow hosts)
  const wrappers = document.querySelectorAll(SELECTORS.CARD_COLLECTION_WRAPPER);

  if (wrappers.length === 0) {
    logger.warn('No card collection wrappers found on page');
    return 0;
  }

  let newListeners = 0;

  // Attach click listener to each wrapper
  wrappers.forEach((wrapper) => {
    if (attachListenerToWrapper(wrapper, logger, processedWrappers)) {
      newListeners += 1;
    }
  });

  logger.log(
    `Attached ${newListeners} new click listeners (${wrappers.length} total wrappers on page)`
  );
  return newListeners;
}

/**
 * Sets up MutationObserver to watch for dynamically added wrappers
 * Single Responsibility: Dynamic content monitoring
 */
function setupDynamicObserver(
  logger: ReturnType<typeof createLogger>,
  processedWrappers: WeakSet<Element>
): MutationObserver {
  const observer = new MutationObserver((mutations) => {
    const newWrappersFound: Element[] = [];

    mutations.forEach((mutation) => {
      // Check added nodes for card collection wrappers
      Array.from(mutation.addedNodes).forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) {
          return;
        }

        const element = node as Element;

        // Check if the added node itself is a wrapper
        if (element.matches(SELECTORS.CARD_COLLECTION_WRAPPER)) {
          if (attachListenerToWrapper(element, logger, processedWrappers)) {
            newWrappersFound.push(element);
          }
        }

        // Check if the added node contains wrappers
        const childWrappers = element.querySelectorAll(SELECTORS.CARD_COLLECTION_WRAPPER);
        Array.from(childWrappers).forEach((wrapper) => {
          if (attachListenerToWrapper(wrapper, logger, processedWrappers)) {
            newWrappersFound.push(wrapper);
          }
        });
      });
    });

    if (newWrappersFound.length > 0) {
      logger.log(`Attached listeners to ${newWrappersFound.length} dynamically loaded wrappers`);
    }
  });

  // Start observing the document for DOM changes
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  logger.log('MutationObserver started - watching for dynamic content');

  return observer;
}

/**
 * Main entry point for the partner card context extractor
 *
 * @param testMode - Set to true for console testing, false for AEP deployment (default: false)
 *
 * USAGE IN LAUNCH RULE ACTION (Page Load):
 * -----------------------------------------
 * Call this script on page load (Page Bottom or DOM Ready event):
 * return extractPartnerCardCtxScript();
 *
 * Then create another rule to track clicks:
 * Event: Custom Event, type='partnerCardClick'
 * Condition: window._adobePartners.partnerCard.context exists
 * Action: Send analytics with %window._adobePartners.partnerCard.context%
 *
 * TESTING IN BROWSER CONSOLE:
 * ----------------------------
 * // Initialize listeners
 * extractPartnerCardCtxScript(true);
 *
 * // Now click on any partner card
 * // Check the data:
 * console.log(window._adobePartners.partnerCard.context);
 */
export function extractPartnerCardCtxScript(
  testMode: boolean = false
): { listenersAttached: number } | null {
  const config: PartnerCardConfig = {
    debug: testMode,
  };

  const logger = createLogger(config.debug, 'Partner Card Context', testMode);

  try {
    // Ensure window._adobePartners.partnerCard exists
    window._adobePartners = window._adobePartners ?? {};
    window._adobePartners.partnerCard = window._adobePartners.partnerCard ?? {};

    // Check if already initialized - prevent duplicate setup
    if (window._adobePartners.partnerCard.observer) {
      logger.log('Script already initialized, skipping duplicate setup');
      return { listenersAttached: 0 };
    }

    logger.testHeader('PARTNER CARD CONTEXT EXTRACTOR - SETUP MODE');

    // Track processed wrappers to prevent duplicate listeners
    const processedWrappers = new WeakSet<Element>();

    // Set up click listeners on currently available cards
    const listenerCount = setupClickListeners(logger, processedWrappers);

    // Set up observer to watch for dynamically added cards
    const observer = setupDynamicObserver(logger, processedWrappers);

    // Store observer on window so it can be accessed if needed
    window._adobePartners.partnerCard.observer = observer;

    const result = { listenersAttached: listenerCount };

    logger.testResult(result);
    logger.log(
      `Setup complete: ${listenerCount} listeners attached, observer watching for dynamic content`
    );

    return result;
  } catch (error) {
    logger.error('Unexpected error during setup:', error);
    return null;
  }
}
