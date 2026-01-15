/**
 * Partner Data Extractor for Adobe Experience Platform (AEP)
 *
 * Extracts partner data from browser cookies and returns the DXP value.
 */

import { executeScript } from '../utils/script.js';
import { extractData } from '../utils/extraction.js';
import { getCookie, parseJsonCookie } from '../utils/cookie.js';
import removeProperties, { mergeNonNull } from '../utils/object.js';
import { hasProperty } from '../utils/validation.js';
import { DEFAULT_COOKIE_KEYS } from '../utils/constants.js';

// Constants
const PROPERTIES_TO_REMOVE = ['latestAgreementAcceptedVersion'];

/**
 * Main entry point for the partner data extractor
 * @param testMode - Set to true for console testing, false for AEP deployment
 * @param cookieKeys - Array of cookie keys to extract from (later keys take precedence when merging)
 */
export function extractPartnerDataScript(
  testMode: boolean = false,
  cookieKeys: string[] = DEFAULT_COOKIE_KEYS
): unknown {
  return executeScript(
    {
      scriptName: 'Partner Data',
      testMode,
      testHeaderTitle: 'PARTNER DATA EXTRACTOR - TEST MODE',
      testHeaderExtraInfo: `Cookie Keys: ${cookieKeys.join(', ')}`,
      onError: (error, logger) => {
        logger.error('Unexpected error extracting partner data:', error);
        return null;
      },
    },
    (logger) => {
      // Helper to extract and clean data from a cookie
      const extractFromCookie = (
        key: string,
        notFoundMessage: string
      ): Record<string, unknown> | null =>
        extractData({
          source: () => getCookie(key),
          parser: parseJsonCookie,
          transformer: (data) => {
            const source = hasProperty(data, 'DXP') ? data.DXP : data;
            return removeProperties(source, PROPERTIES_TO_REMOVE) as Record<string, unknown>;
          },
          logger,
          errorMessage: `Error parsing ${key} from cookie`,
          notFoundMessage,
        });

      // Extract from all cookies and merge (later cookies take precedence)
      const mergedData = cookieKeys.reduce(
        (acc, key) => mergeNonNull(acc, extractFromCookie(key, `No data in ${key} cookie`)),
        {} as Record<string, unknown>
      );

      if (Object.keys(mergedData).length === 0) {
        logger.log('No partner data found in any cookie');
        return null;
      }

      logger.log('Found partner data (merged from cookies)', mergedData);
      return mergedData;
    }
  );
}
