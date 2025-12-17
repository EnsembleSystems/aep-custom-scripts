/**
 * Event Data Fetcher for Adobe Experience Platform (AEP)
 *
 * Fetches event data from Adobe Events pages.
 * Example URL: https://pelabs-10feb2025.solutionpartners.adobeevents.com/
 */

import { createLogger } from '../utils/logger.js';
import {
  fetchWithTimeout,
  validateResponseSize,
  isAbortError,
  isNetworkError,
} from '../utils/fetch.js';

// Types
export interface EventDataConfig {
  timeout: number;
  debug: boolean;
}

// Constants
const API = {
  EVENT_ENDPOINT: '/api/event.json?meta=true',
};

/**
 * Main entry point for the event data fetcher
 * @param testMode - Set to true for console testing, false for AEP deployment
 */
export function fetchEventDataScript(testMode: boolean = false): unknown {
  const config: EventDataConfig = {
    timeout: 10000,
    debug: testMode,
  };

  const logger = createLogger(config.debug, 'Event Data', testMode);

  logger.testHeader('EVENT DATA EXTRACTOR - TEST MODE');

  const currentDomain = window.location.origin;
  const apiUrl = `${currentDomain}${API.EVENT_ENDPOINT}`;

  logger.log('Fetching event data from', apiUrl);

  // Return the Promise chain directly (no async/await)
  return fetchWithTimeout(
    apiUrl,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    },
    config.timeout
  )
    .then((response) => {
      if (!response.ok) {
        logger.error(`API error: ${response.status} ${response.statusText}`);
        throw new Error(`API returned ${response.status}`);
      }

      // Validate response size to prevent memory exhaustion
      validateResponseSize(response);

      return response.json();
    })
    .then((data) => {
      logger.log('Event data received', data);
      logger.testResult(data);

      return data;
    })
    .catch((error) => {
      // Handle timeout
      if (isAbortError(error)) {
        logger.error(`Request timeout after ${config.timeout}ms`);
        return null;
      }

      // Handle network errors
      if (isNetworkError(error)) {
        logger.error('Network error:', error);
        return null;
      }

      // Handle other errors
      logger.error('Unexpected error fetching event data:', error);
      return null;
    });
}
