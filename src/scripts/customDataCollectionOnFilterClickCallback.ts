/**
 * Launch Extension - Click Filter Callback
 *
 * This script is designed to work with Launch's before event send callback
 * to filter out programmatic clicks and only allow genuine user interactions.
 *
 * Purpose:
 * - Filters out programmatic (non-trusted) click events
 * - Returns true for genuine user clicks
 * - Returns false for automated/programmatic clicks
 *
 * Architecture:
 * - This callback does FILTERING ONLY (no data extraction)
 * - Data extraction happens in customDataCollectionOnBeforeEventSend
 * - No window._adobePartners storage needed
 */

import { createLogger } from '../utils/logger';

/**
 * Type for the content object passed to Launch's before event send callback
 */
interface LaunchEventContent {
  clickedElement?: Element; // The clicked DOM element
  xdm?: {
    eventType?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Filters click events to allow only genuine user interactions
 *
 * @param content - The content object from Launch's before event send callback
 * @param event - The original event object (PointerEvent or MouseEvent)
 * @param testMode - Enable verbose logging and test output (default: false)
 * @returns true if the click should be processed, false if it should be ignored
 *
 * @example
 * // In Launch Extension before event send callback:
 * const shouldProcess = customDataCollectionOnFilterClickCallback(content, event);
 * if (!shouldProcess) {
 *   console.log('Click was ignored (programmatic)');
 *   return; // or handle accordingly
 * }
 *
 * @example
 * // Test mode:
 * const mockContent = { clickedElement: document.querySelector('button') };
 * const mockEvent = new PointerEvent('click', { isTrusted: true });
 * customDataCollectionOnFilterClickCallback(mockContent, mockEvent, true);
 */
export default function customDataCollectionOnFilterClickCallbackScript(
  content: LaunchEventContent,
  event?: PointerEvent | MouseEvent,
  testMode: boolean = false
): boolean {
  const logger = createLogger('Filter Click Callback', testMode);

  try {
    logger.testHeader('FILTER CLICK CALLBACK - TEST MODE');
    logger.testInfo('Provided content object', content);
    logger.testInfo('Event object', event);

    // Check if event is provided
    if (!event) {
      logger.log('❌ Ignoring click - no event object provided (treating as programmatic)');
      return false;
    }

    // Check if event is trusted (genuine user interaction)
    if (!event.isTrusted) {
      logger.log('❌ Ignoring programmatic click (event.isTrusted is false)');
      return false;
    }

    logger.log('✅ Event is trusted (genuine user click)', {
      isTrusted: event.isTrusted,
      type: event.type,
    });

    if (testMode) {
      logger.testResult({
        shouldProcess: true,
        reason: 'Event is trusted',
        eventType: event.type,
        isTrusted: event.isTrusted,
      });
    }

    return true;
  } catch (error) {
    logger.error('Unexpected error in filter click callback:', error);
    return false;
  }
}
