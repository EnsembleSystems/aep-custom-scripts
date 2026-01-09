/**
 * Event Data Getter for Adobe Experience Platform (AEP)
 *
 * Gets event data from window._adobePartners.eventData.apiResponse on Adobe Events pages.
 * This data is populated by the fetchEventData Rule action.
 * Example URL: https://pelabs-10feb2025.solutionpartners.adobeevents.com/
 */

import { executeScript } from '../utils/script.js';

/**
 * Main entry point for the event data getter
 * @param testMode - Set to true for console testing, false for AEP deployment
 */
export function getEventDataScript(testMode: boolean = false): unknown {
  return executeScript(
    {
      scriptName: 'Get Event Data',
      testMode,
      testHeaderTitle: 'GET EVENT DATA - TEST MODE',
      onError: (error, logger) => {
        logger.error('Unexpected error getting event data:', error);
        return null;
      },
    },
    (logger) => {
      // Check if apiResponse exists using optional chaining
      if (!window._adobePartners?.eventData?.apiResponse) {
        logger.log('No apiResponse found in window._adobePartners.eventData');
        return null;
      }

      const eventData = window._adobePartners.eventData.apiResponse;
      logger.log('Found event data', eventData);
      return eventData;
    }
  );
}
