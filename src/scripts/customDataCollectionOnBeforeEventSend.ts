/**
 * Launch Extension - Before Event Send Callback
 *
 * This script is meant to be copy/pasted into:
 * Launch Extension -> Data Collection -> Edit on before event send callback
 *
 * Purpose:
 * - Extracts partner data from cookies (using extractPartnerData logic)
 * - Sets it in content.xdm._adobepartners.partnerData
 * - Retrieves pre-populated card context from window._adobePartners.partnerCard.context
 * - Only runs for non-page-view events
 *
 * TIMING FIX:
 * -----------
 * Card context is now pre-populated by the extractPartnerCardCtx script when users
 * HOVER over cards (mouseenter event). This ensures the context is already available
 * in window._adobePartners.partnerCard.context BEFORE any click happens, solving the
 * timing issue where onBeforeEventSend fired before the card context was populated.
 */

import { createLogger } from '../utils/logger';
import { extractPartnerDataScript } from './extractPartnerData';

const DEFAULT_COOKIE_KEY = 'partner_data';

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
  const logger = createLogger(testMode, 'Before Send Callback', testMode);

  try {
    logger.testHeader('BEFORE SEND EVENT CALLBACK - TEST MODE', `Cookie Key: ${cookieKey}`);

    // Log event availability
    if (event) {
      logger.log('Event object available', { isTrusted: event.isTrusted, type: event.type });
      if (event.composedPath) {
        logger.log('Event composed path', event.composedPath());
      }
    } else {
      logger.log('No event object provided');
    }

    // Skip page view events
    if (content.xdm?.eventType === 'web.webpagedetails.pageViews') {
      logger.log('Skipping page view event');
      return content;
    }

    // Get partner data - check if it exists in window first, otherwise extract from cookie
    let partnerData = window?._adobePartners?.partnerData;
    if (!partnerData) {
      partnerData = extractPartnerDataScript(testMode, cookieKey);
      logger.log('Extracted partner data from cookie', partnerData);
    } else {
      logger.log('Using existing partner data from window', partnerData);
    }

    // Get card collection context from window (pre-populated by hover handler)
    const cardCollection = window?._adobePartners?.partnerCard?.context;
    logger.log('Retrieved card collection from window', cardCollection);

    // Set partner data in _adobepartners
    if (!content.xdm) content.xdm = {};
    if (!content.xdm._adobepartners) content.xdm._adobepartners = {};
    content.xdm._adobepartners.partnerData = partnerData;
    content.xdm._adobepartners.cardCollection = cardCollection;

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
