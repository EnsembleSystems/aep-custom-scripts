/**
 * Attendee Data Extractor for Adobe Experience Platform (AEP)
 *
 * Extracts attendee data from localStorage on Adobe Events pages.
 * Example URL: https://pelabs-10feb2025.solutionpartners.adobeevents.com/
 */

import { executeScript } from '../utils/script.js';
import { getStorageItem } from '../utils/storage.js';
import { ATTENDEE_STORAGE_KEY } from '../utils/constants.js';

/**
 * Main entry point for the attendee data extractor
 * @param testMode - Set to true for console testing, false for AEP deployment
 */
export function extractAttendeeDataScript(testMode: boolean = false): unknown {
  return executeScript(
    {
      scriptName: 'Attendee Data',
      testMode,
      testHeaderTitle: 'ATTENDEE DATA EXTRACTOR - TEST MODE',
      onError: (error, logger) => {
        logger.error('Unexpected error extracting attendee data:', error);
        return null;
      },
    },
    (logger) => {
      const attendeeData = getStorageItem(ATTENDEE_STORAGE_KEY);

      if (!attendeeData) {
        logger.log('No attendee data in localStorage');
        return null;
      }

      logger.log('Found attendee data', attendeeData);
      return attendeeData;
    }
  );
}
