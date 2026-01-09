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

import { createLogger } from '../utils/logger';
import { extractPartnerDataScript } from './extractPartnerData';
import {
  getAttribute,
  getTextContent,
  queryShadow,
  findInComposedPath,
  createElementMatcher,
  extractStructuredAttribute,
} from '../utils/dom';
import logEventInfo, { shouldProcessEventType } from '../utils/events';
import { setNestedValue, conditionalProperties, mergeNonNull } from '../utils/object';
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
 * Main script for setting partner data on event
 *
 * @param content - The content object from Launch's before event send callback
 * @param event - The original event object (PointerEvent or MouseEvent)
 * @param testMode - Enable verbose logging and test output (default: false)
 * @param cookieKey - The cookie key to read partner data from (default: 'partner_data')
 */
export default function customDataCollectionOnBeforeEventSendScript(
  content: LaunchEventContent,
  event?: PointerEvent | MouseEvent,
  testMode: boolean = false,
  cookieKey: string = DEFAULT_COOKIE_KEY
): LaunchEventContent {
  const logger = createLogger('Before Send Callback', testMode);

  try {
    logger.testHeader('BEFORE SEND EVENT CALLBACK - TEST MODE', `Cookie Key: ${cookieKey}`);

    // Log event information
    logEventInfo(event, logger);

    // Skip page view events
    if (!shouldProcessEventType(content.xdm?.eventType, ['web.webpagedetails.pageViews'], logger)) {
      return content;
    }

    // Extract partner data from cookie
    const partnerData = extractPartnerDataScript(testMode, cookieKey);
    logger.log('Extracted partner data from cookie', partnerData);

    // Extract card collection context from event if available
    const cardCollection = extractCardCollectionFromEvent(event, logger);

    // Set partner data in _adobepartners using nested object utilities
    setNestedValue(
      content,
      'xdm._adobepartners',
      mergeNonNull(
        { partnerData },
        conditionalProperties(cardCollection !== null, { cardCollection })
      ),
      true
    );

    logger.testResult(content);
    if (!testMode) {
      logger.log('Returning content with partner data and card collection', content);
    }

    return content;
  } catch (error) {
    logger.error('Unexpected error in before send callback:', error);
    return content;
  }
}
