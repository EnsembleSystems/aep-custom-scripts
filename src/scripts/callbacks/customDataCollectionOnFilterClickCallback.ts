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

// Use this custom code block to adjust or filter click data. You can use the following variables:
// content.clickedElement: The DOM element that was clicked
// content.pageName: The page name when the click happened
// content.linkName: The name of the clicked link
// content.linkRegion: The region of the clicked link
// content.linkType: The type of link (typically exit, download, or other)
// content.linkUrl: The destination URL of the clicked link
// Return false to omit link data.

import { executeScript } from '../../utils/script';
import logEventInfo, { isMeaningfulClickEvent, isValidUserEvent } from '../../utils/events';
import type { LaunchEventContent } from '../../types';

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
  return executeScript(
    {
      scriptName: 'Filter Click Callback',
      testMode,
      testHeaderTitle: 'FILTER CLICK CALLBACK - TEST MODE',
      onError: (error, logger) => {
        logger.error('Unexpected error in filter click callback:', error);
        return false;
      },
    },
    (logger) => {
      logger.testInfo('Provided content object', content);

      // Log event information
      logEventInfo(event, logger);

      // Validate event is a trusted user interaction
      if (!isValidUserEvent(event, logger)) {
        return false;
      }

      // Validate valid SPA click event
      if (!isMeaningfulClickEvent(content, logger)) {
        return false;
      }

      if (event) {
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
      }

      return true;
    }
  );
}
