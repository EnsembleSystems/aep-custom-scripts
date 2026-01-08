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
 * Extracts context metadata for a wrapper element
 * Single Responsibility: Context extraction
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
 * Handles click events at the document level
 * Single Responsibility: Event handling and coordination
 */
function handleDocumentClick(event: Event, logger: ReturnType<typeof createLogger>): void {
  // Find the card element in the composed path
  const cardElement = findCardInPath(event, logger);

  if (!cardElement) {
    return;
  }

  // Find the wrapper element to get section context
  const wrapper = findInComposedPath(event, (el) =>
    el.classList?.contains('dx-card-collection-wrapper')
  );

  if (!wrapper) {
    logger.log('No wrapper found in click path');
    return;
  }

  // Extract context at click time (not setup time) to ensure DOM is ready
  const { sectionID, filterContext } = extractWrapperContext(wrapper, logger);

  // Extract the card context
  const cardContext = extractCardCtxFromElement(cardElement, sectionID, filterContext, logger);

  if (!cardContext) {
    logger.warn('Failed to extract card context');
    return;
  }

  // Store context on window
  window._adobePartners = window._adobePartners ?? {};
  window._adobePartners.partnerCard = window._adobePartners.partnerCard ?? {};
  window._adobePartners.partnerCard.context = cardContext;

  // Trigger custom event for AEP
  dispatchCustomEvent(EVENT_NAMES.PARTNER_CARD_CLICK, cardContext);

  logger.log('Card click processed successfully');
}

/**
 * Sets up a single document-level click listener to capture all card clicks
 * Single Responsibility: Listener setup
 */
function setupClickListener(logger: ReturnType<typeof createLogger>): void {
  // Attach a single click listener at the document level
  // Use capture phase to catch the event as early as possible
  document.addEventListener(
    'click',
    (event) => {
      handleDocumentClick(event, logger);
    },
    true // Capture phase - fires before bubble phase
  );

  logger.log('Document-level click listener attached (capture phase)');
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
    if (window._adobePartners.partnerCard.initialized) {
      logger.log('Script already initialized, skipping duplicate setup');
      return { listenersAttached: 0 };
    }

    logger.testHeader('PARTNER CARD CONTEXT EXTRACTOR - SETUP MODE');

    // Set up single document-level click listener (capture phase)
    // This captures clicks as early as possible before onBeforeEventSend
    setupClickListener(logger);

    // Mark as initialized
    window._adobePartners.partnerCard.initialized = true;

    const result = { listenersAttached: 1 };

    logger.testResult(result);
    logger.log('Setup complete: Document-level click listener attached (capture phase)');

    return result;
  } catch (error) {
    logger.error('Unexpected error during setup:', error);
    return null;
  }
}
