/**
 * Event Data Extractor for Adobe Experience Platform (AEP)
 *
 * Extracts event data from window._eventData.apiResponse on Adobe Events pages.
 * This data is populated by the fetchEventData Rule action.
 * Example URL: https://pelabs-10feb2025.solutionpartners.adobeevents.com/
 */

import { createLogger } from '../utils/logger.js';

// Types
export interface EventDataConfig {
  debug: boolean;
}

// Extend Window interface for type safety
declare global {
  interface Window {
    _eventData?: {
      apiResponse?: unknown;
    };
  }
}

/**
 * Gets event data from window._eventData.apiResponse
 */
function getEventData(logger: ReturnType<typeof createLogger>): unknown {
  // Check if window._eventData exists
  if (!window._eventData) {
    logger.log('No _eventData object on window');
    return null;
  }

  // Check if apiResponse exists
  if (!window._eventData.apiResponse) {
    logger.log('No apiResponse in window._eventData');
    return null;
  }

  const eventData = window._eventData.apiResponse;
  logger.log('Found event data', eventData);
  return eventData;
}

/**
 * Main entry point for the event data extractor
 * @param testMode - Set to true for console testing, false for AEP deployment
 */
export function extractEventDataScript(testMode: boolean = false): unknown {
  const config: EventDataConfig = {
    debug: testMode,
  };

  const logger = createLogger(config.debug, 'Event Data', testMode);

  try {
    logger.testHeader('EVENT DATA EXTRACTOR - TEST MODE');

    // Get event data from window._eventData.apiResponse
    const eventData = getEventData(logger);

    logger.testResult(eventData);
    if (!testMode) {
      logger.log('Returning event data', eventData);
    }

    return eventData;
  } catch (error) {
    // Handle errors
    logger.error('Unexpected error extracting event data:', error);
    return null;
  }
}
