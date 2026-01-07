/**
 * Event Data Getter for Adobe Experience Platform (AEP)
 *
 * Gets event data from window._adobePartners.eventData.apiResponse on Adobe Events pages.
 * This data is populated by the fetchEventData Rule action.
 * Example URL: https://pelabs-10feb2025.solutionpartners.adobeevents.com/
 */

import { createLogger } from '../utils/logger.js';

// Types
export interface EventDataConfig {
  debug: boolean;
}

/**
 * Gets event data from window._adobePartners.eventData.apiResponse
 */
function getEventData(logger: ReturnType<typeof createLogger>): unknown {
  // Check if window._adobePartners exists
  if (!window._adobePartners) {
    logger.log('No _adobePartners object on window');
    return null;
  }

  // Check if eventData exists
  if (!window._adobePartners.eventData) {
    logger.log('No eventData in window._adobePartners');
    return null;
  }

  // Check if apiResponse exists
  if (!window._adobePartners.eventData.apiResponse) {
    logger.log('No apiResponse in window._adobePartners.eventData');
    return null;
  }

  const eventData = window._adobePartners.eventData.apiResponse;
  logger.log('Found event data', eventData);
  return eventData;
}

/**
 * Main entry point for the event data getter
 * @param testMode - Set to true for console testing, false for AEP deployment
 */
export function getEventDataScript(testMode: boolean = false): unknown {
  const config: EventDataConfig = {
    debug: testMode,
  };

  const logger = createLogger(config.debug, 'Get Event Data', testMode);

  try {
    logger.testHeader('GET EVENT DATA - TEST MODE');

    // Get event data from window._adobePartners.eventData.apiResponse
    const eventData = getEventData(logger);

    logger.testResult(eventData);
    if (!testMode) {
      logger.log('Returning event data', eventData);
    }

    return eventData;
  } catch (error) {
    // Handle errors
    logger.error('Unexpected error getting event data:', error);
    return null;
  }
}
