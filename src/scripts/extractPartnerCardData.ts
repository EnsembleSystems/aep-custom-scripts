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

export interface PartnerCardData {
  cardTitle: string;
  contentID: string;
  contentType: string;
  ctaText: string;
  filterContext: string;
  name: string;
  position: string;
  sectionID: string;
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    partnerCardData?: PartnerCardData | null;
  }
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
 * Extracts partner card data from a card element
 * Single Responsibility: Data extraction only
 */
function extractCardDataFromElement(
  cardElement: Element,
  sectionID: string,
  filterContext: string,
  logger: ReturnType<typeof createLogger>
): PartnerCardData | null {
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
  const result: PartnerCardData = {
    cardTitle,
    contentID,
    contentType: CONTENT_TYPE,
    ctaText,
    filterContext,
    name: cardTitle,
    position,
    sectionID,
  };

  logger.log('Extracted card data', result);
  return result;
}

/**
 * Finds the partner card element in the event's composed path
 * Single Responsibility: Card element lookup
 */
function findCardInPath(
  event: Event,
  logger: ReturnType<typeof createLogger>
): Element | null {
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

  // Extract the card data
  const cardData = extractCardDataFromElement(
    cardElement,
    sectionID,
    filterContext,
    logger
  );

  if (!cardData) {
    logger.warn('Failed to extract card data');
    return;
  }

  // Store in window for AEP to access
  window.partnerCardData = cardData;

  // Trigger custom event for AEP
  dispatchCustomEvent(EVENT_NAMES.PARTNER_CARD_CLICK, cardData);

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
  const partnerCardsElement = shadowRoot?.querySelector(
    SELECTORS.PARTNER_CARDS
  );
  const filterContext = getAttribute(partnerCardsElement, ATTRIBUTES.DAA_LH);

  if (!sectionID) {
    logger.warn('Wrapper missing sectionID (parent daa-lh attribute)');
  }

  return { sectionID, filterContext };
}

/**
 * Sets up click listeners on shadow host wrappers
 * Single Responsibility: Listener setup
 */
function setupClickListeners(logger: ReturnType<typeof createLogger>): number {
  // Find all card collection wrappers (shadow hosts)
  const wrappers = document.querySelectorAll(SELECTORS.CARD_COLLECTION_WRAPPER);

  if (wrappers.length === 0) {
    logger.warn('No card collection wrappers found on page');
    return 0;
  }

  // Attach click listener to each wrapper
  wrappers.forEach((wrapper) => {
    const { sectionID, filterContext } = extractWrapperContext(wrapper, logger);

    // Use arrow function to preserve context
    wrapper.addEventListener('click', (event) => {
      handleWrapperClick(event, sectionID, filterContext, logger);
    });
  });

  logger.log(`Attached ${wrappers.length} click listeners`);
  return wrappers.length;
}

/**
 * Main entry point for the partner card data extractor
 *
 * @param testMode - Set to true for console testing, false for AEP deployment (default: false)
 *
 * USAGE IN LAUNCH RULE ACTION (Page Load):
 * -----------------------------------------
 * Call this script on page load (Page Bottom or DOM Ready event):
 * return extractPartnerCardDataScript();
 *
 * Then create another rule to track clicks:
 * Event: Custom Event, type='partnerCardClick'
 * Condition: window.partnerCardData exists
 * Action: Send analytics with %window.partnerCardData%
 *
 * TESTING IN BROWSER CONSOLE:
 * ----------------------------
 * // Initialize listeners
 * extractPartnerCardDataScript(true);
 *
 * // Now click on any partner card
 * // Check the data:
 * console.log(window.partnerCardData);
 */
export function extractPartnerCardDataScript(
  testMode: boolean = false
): { listenersAttached: number } | null {
  const config: PartnerCardConfig = {
    debug: testMode,
  };

  const logger = createLogger(config.debug, 'Partner Card Data', testMode);

  try {
    logger.testHeader('PARTNER CARD DATA EXTRACTOR - SETUP MODE');

    // Set up click listeners on all cards
    const listenerCount = setupClickListeners(logger);

    const result = { listenersAttached: listenerCount };

    logger.testResult(result);
    logger.log(`Setup complete: ${listenerCount} listeners attached`);

    return result;
  } catch (error) {
    logger.error('Unexpected error during setup:', error);
    return null;
  }
}
