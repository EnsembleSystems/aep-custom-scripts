/**
 * Attendee Data Extractor for Adobe Experience Platform (AEP)
 *
 * Extracts attendee data from localStorage on Adobe Events pages.
 * Example URL: https://pelabs-10feb2025.solutionpartners.adobeevents.com/
 */

import { createLogger } from '../utils/logger.js';
import { getStorageItem } from '../utils/storage.js';

// Types
export interface AttendeeDataConfig {
  debug: boolean;
}

// Constants
const STORAGE_KEYS = {
  ATTENDEE: 'attendeaseMember',
};

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
 * Main entry point for the attendee data extractor
 * @param testMode - Set to true for console testing, false for AEP deployment
 */
export function extractAttendeeDataScript(testMode: boolean = false): unknown {
  const config: AttendeeDataConfig = {
    debug: testMode,
  };

  const logger = createLogger(config.debug, 'Attendee Data', testMode);

  try {
    logger.testHeader('ATTENDEE DATA EXTRACTOR - TEST MODE');

    // Get attendee data from localStorage
    const attendeeData = getAttendeeData(logger);

    logger.testResult(attendeeData);
    if (!testMode) {
      logger.log('Returning attendee data', attendeeData);
    }

    return attendeeData;
  } catch (error) {
    // Handle errors
    logger.error('Unexpected error extracting attendee data:', error);
    return null;
  }
}
