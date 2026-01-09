/**
 * Partner Data Extractor for Adobe Experience Platform (AEP)
 *
 * Extracts partner data from browser cookies and returns the DXP value.
 */

import { createLogger } from '../utils/logger.js';
import { getCookie, parseJsonCookie } from '../utils/cookie.js';
import removeProperties from '../utils/object.js';
import { hasProperty } from '../utils/validation.js';

// Types
export interface PartnerDataConfig {
  cookieKey: string;
}

// Constants
const DEFAULT_COOKIE_KEY = 'partner_data';
const PROPERTIES_TO_REMOVE = ['latestAgreementAcceptedVersion'];

/**
 * Gets partner data from cookies and extracts the DXP value
 */
function getPartnerData(cookieKey: string, logger: ReturnType<typeof createLogger>): unknown {
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

  // Extract DXP value if it exists
  if (hasProperty(partnerData, 'DXP')) {
    const dxpValue = partnerData.DXP;
    const cleanedDxpValue = removeProperties(dxpValue, PROPERTIES_TO_REMOVE);
    logger.log('Found partner data (DXP extracted)', cleanedDxpValue);
    return cleanedDxpValue;
  }

  // If no DXP key, return the whole object
  const cleanedPartnerData = removeProperties(partnerData, PROPERTIES_TO_REMOVE);
  logger.log('Found partner data (no DXP key)', cleanedPartnerData);
  return cleanedPartnerData;
}

/**
 * Main entry point for the partner data extractor
 * @param testMode - Set to true for console testing, false for AEP deployment
 * @param cookieKey - Optional custom cookie key (defaults to 'partner_data')
 */
export function extractPartnerDataScript(
  testMode: boolean = false,
  cookieKey: string = DEFAULT_COOKIE_KEY
): unknown {
  const config: PartnerDataConfig = {
    cookieKey,
  };

  const logger = createLogger('Partner Data', testMode);

  try {
    logger.testHeader('PARTNER DATA EXTRACTOR - TEST MODE', `Cookie Key: ${config.cookieKey}`);

    // Get partner data from cookies (DXP value extracted)
    const partnerData = getPartnerData(config.cookieKey, logger);

    logger.testResult(partnerData);
    if (!testMode) {
      logger.log('Returning partner data (DXP value)', partnerData);
    }

    return partnerData;
  } catch (error) {
    logger.error('Unexpected error extracting partner data:', error);
    return null;
  }
}
