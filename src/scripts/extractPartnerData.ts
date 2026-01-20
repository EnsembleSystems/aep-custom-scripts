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
import { getStorageItem } from '../utils/storage.js';
import type { Logger } from '../utils/logger.js';

// Constants
const PROPERTIES_TO_REMOVE = ['latestAgreementAcceptedVersion'];
const MAGE_CACHE_STORAGE_KEY = 'mage-cache-storage';

/**
 * Extracts and cleans partner data from a cookie
 */
function extractFromCookie(key: string, logger: Logger): Record<string, unknown> | null {
  return extractData({
    source: () => getCookie(key),
    parser: parseJsonCookie,
    transformer: (data) => {
      const source = hasProperty(data, 'DXP') ? data.DXP : data;
      return removeProperties(source, PROPERTIES_TO_REMOVE) as Record<string, unknown>;
    },
    logger,
    errorMessage: `Error parsing ${key} from cookie`,
    notFoundMessage: `No data in ${key} cookie`,
  });
}

/**
 * Extracts email from mage-cache-storage in localStorage
 */
function extractEmailFromStorage(): string | null {
  const mageCache = getStorageItem<Record<string, unknown>>(MAGE_CACHE_STORAGE_KEY);
  const customer = mageCache?.customer as Record<string, unknown> | undefined;
  const email = customer?.email;
  return typeof email === 'string' && email ? email : null;
}

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
      const mergedData = cookieKeys.reduce(
        (acc, key) => mergeNonNull(acc, extractFromCookie(key, logger)),
        {} as Record<string, unknown>
      );

      if (!mergedData.email) {
        const email = extractEmailFromStorage();
        if (email) {
          mergedData.email = email;
          logger.log('Email extracted from mage-cache-storage');
        }
      }

      if (Object.keys(mergedData).length === 0) {
        logger.log('No partner data found in cookies or storage');
        return null;
      }

      logger.log('Found partner data', mergedData);
      return mergedData;
    }
  );
}
