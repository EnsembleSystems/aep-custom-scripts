/**
 * Event Data Fetcher for Adobe Experience Platform (AEP)
 *
 * Fetches event and attendee data from Adobe Events pages.
 * Example URL: https://pelabs-10feb2025.solutionpartners.adobeevents.com/
 */

import { createLogger } from '../utils/logger.js';
import { fetchWithTimeout, validateResponseSize, isAbortError, isNetworkError } from '../utils/fetch.js';
import { getStorageItem } from '../utils/storage.js';

// Types
export interface EventDataConfig {
  timeout: number;
  debug: boolean;
}

export interface EventDataResult {
  eventData: unknown;
  attendeeData: unknown;
}

// Constants
const API = {
  EVENT_ENDPOINT: '/api/event.json?meta=true',
};

const STORAGE_KEYS = {
  ATTENDEE: 'attendeaseMember',
};

/**
 * Fetches event data from the API
 */
async function fetchEventData(config: EventDataConfig, logger: ReturnType<typeof createLogger>): Promise<unknown> {
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

  return data;
}

/**
 * Gets attendee data from localStorage
 */
function getAttendeeData(logger: ReturnType<typeof createLogger>): unknown {
  const attendeeData = getStorageItem(STORAGE_KEYS.ATTENDEE);

  if (!attendeeData) {
    logger.log('No attendee data in localStorage');
    return null;
  }

  logger.log('Found attendee data', attendeeData);
  return attendeeData;
}

/**
 * Main entry point for the event data fetcher
 * @param testMode - Set to true for console testing, false for AEP deployment
 */
export async function fetchEventDataScript(testMode: boolean = false): Promise<EventDataResult | null> {
  const config: EventDataConfig = {
    timeout: 10000,
    debug: testMode,
  };

  const logger = createLogger(config.debug, 'Event Data', testMode);

  try {
    if (testMode) {
      console.log('='.repeat(80));
      console.log('EVENT DATA EXTRACTOR - TEST MODE');
      console.log('='.repeat(80));
    }

    // Fetch event data
    const eventData = await fetchEventData(config, logger);

    // Get attendee data from localStorage
    const attendeeData = getAttendeeData(logger);

    // Return combined data
    const result: EventDataResult = {
      eventData,
      attendeeData,
    };

    if (testMode) {
      console.log('='.repeat(80));
      console.log('RESULT:');
      console.log('='.repeat(80));
      console.log(JSON.stringify(result, null, 2));
      console.log('='.repeat(80));
    } else {
      logger.log('Returning combined data', result);
    }

    return result;
  } catch (error) {
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
    logger.error('Error:', error);
    return null;
  }
}
