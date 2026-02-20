/**
 * Event Data Fetcher for Adobe Experience Platform (AEP)
 *
 * Fetches event data from Adobe Events pages.
 * Example URL: https://pelabs-10feb2025.solutionpartners.adobeevents.com/
 */

import { executeAsyncScript } from '../../utils/script.js';
import type { Logger } from '../../utils/logger.js';
import {
  fetchWithTimeout,
  validateResponseSize,
  isAbortError,
  isNetworkError,
} from '../../utils/fetch.js';
import { EVENT_DATA_READY_EVENT } from '../../utils/constants.js';
import { extractDates } from '../../utils/dates.js';
import { dispatchCustomEvent } from '../../utils/dom.js';
import { mergeWithTransforms } from '../../utils/transform.js';
import setGlobalValue from '../../utils/globalState.js';

// Types
export interface EventDataConfig {
  timeout: number;
}

// Constants
const API = {
  EVENT_ENDPOINT: '/api/event.json?meta=true',
};

/**
 * Transforms event data by extracting and formatting dates
 * @param data - Raw event data from API
 * @param logger - Logger instance
 * @returns Transformed data with formatted dates
 */
function transformEventData(data: unknown, logger: Logger): Record<string, unknown> {
  const rawData = data as Record<string, unknown>;

  // Extract dates from the data and format to AEP DateTime format
  const dates: string[] = extractDates((rawData.dates ?? []) as Array<{ date?: string }>);
  logger.log('Extracted dates (`yyyy-MM-dd` format):', dates);

  // Use transform utility to merge the transformed dates back into the data
  const transformedData = mergeWithTransforms(rawData, [
    { source: 'dates', target: 'date', transform: () => dates },
  ]);
  // Remove original raw dates field from rawData
  delete transformedData.dates;
  logger.log('Transformed data', transformedData);

  return transformedData;
}

/**
 * Stores transformed event data in window global for access by other scripts
 * @param transformedData - Transformed event data
 * @param logger - Logger instance
 */
function storeEventDataGlobally(transformedData: Record<string, unknown>, logger: Logger): void {
  // Use global state utility to safely set nested window property
  setGlobalValue(
    window as unknown as Record<string, unknown>,
    ['_adobePartners', 'eventData', 'apiResponse'],
    transformedData,
    logger
  );
}

/**
 * Main entry point for the event data fetcher
 * @param testMode - Set to true for console testing, false for AEP deployment
 */
export function fetchEventDataScript(testMode: boolean = false): Promise<unknown> {
  const config: EventDataConfig = {
    timeout: 10000,
  };

  return executeAsyncScript(
    {
      scriptName: 'Event Data',
      testMode,
      testHeaderTitle: 'EVENT DATA EXTRACTOR - TEST MODE',
      onError: async (error, logger) => {
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
      },
    },
    async (logger) => {
      const currentDomain = window.location.origin;
      const apiUrl = `${currentDomain}${API.EVENT_ENDPOINT}`;

      logger.log('Fetching event data from', apiUrl);

      const response = await fetchWithTimeout(
        apiUrl,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        },
        config.timeout
      );

      if (!response.ok) {
        logger.error(`API error: ${response.status} ${response.statusText}`);
        throw new Error(`API returned ${response.status}`);
      }

      // Validate response size to prevent memory exhaustion
      validateResponseSize(response);

      const data = await response.json();
      logger.log('Event data received', data);

      // Transform and store data on window for access by other scripts
      try {
        const transformedData = transformEventData(data, logger);
        storeEventDataGlobally(transformedData, logger);

        // Dispatch event to notify other listeners
        dispatchCustomEvent(EVENT_DATA_READY_EVENT);

        return transformedData;
      } catch (err) {
        logger.warn('Could not transform or store data:', err);
        return data;
      }
    }
  );
}
