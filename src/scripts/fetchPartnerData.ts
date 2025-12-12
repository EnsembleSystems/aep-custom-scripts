/**
 * Partner Data Fetcher for Adobe Experience Platform (AEP)
 *
 * Extracts partner data from browser cookies.
 */

import { createLogger } from '../utils/logger.js';
import { getCookie, parseJsonCookie } from '../utils/cookie.js';

// Types
export interface PartnerDataConfig {
  debug: boolean;
  cookieKey: string;
}

export interface PartnerDataResult {
  partnerData: unknown;
}

// Constants
const DEFAULT_COOKIE_KEY = 'partner_data';

/**
 * Gets partner data from cookies
 */
function getPartnerData(
  cookieKey: string,
  logger: ReturnType<typeof createLogger>
): unknown {
  const partnerCookie = getCookie(cookieKey);

  if (!partnerCookie) {
    logger.log('No partner data in cookies');
    return null;
  }

  const partnerData = parseJsonCookie(partnerCookie);

  if (!partnerData) {
    logger.error('Error parsing partner data from cookie');
    return null;
  }

  logger.log('Found partner data', partnerData);
  return partnerData;
}

/**
 * Main entry point for the partner data fetcher
 * @param testMode - Set to true for console testing, false for AEP deployment
 * @param cookieKey - Optional custom cookie key (defaults to 'partner_data')
 */
export async function fetchPartnerDataScript(
  testMode: boolean = false,
  cookieKey: string = DEFAULT_COOKIE_KEY
): Promise<PartnerDataResult | null> {
  const config: PartnerDataConfig = {
    debug: testMode,
    cookieKey,
  };

  const logger = createLogger(config.debug, 'Partner Data', testMode);

  try {
    logger.testHeader(
      'PARTNER DATA EXTRACTOR - TEST MODE',
      `Cookie Key: ${config.cookieKey}`
    );

    // Get partner data from cookies
    const partnerData = getPartnerData(config.cookieKey, logger);

    // Return partner data
    const result: PartnerDataResult = {
      partnerData,
    };

    logger.testResult(result);
    if (!testMode) {
      logger.log('Returning partner data', result);
    }

    return result;
  } catch (error) {
    logger.error('Unexpected error fetching partner data:', error);
    return null;
  }
}
