/**
 * Partner Data Extractor for Adobe Experience Platform (AEP)
 *
 * Extracts partner data from browser cookies and returns the DXP value.
 */

import { executeScript } from '../utils/script.js';
import { extractData } from '../utils/extraction.js';
import { getCookie, parseJsonCookie } from '../utils/cookie.js';
import removeProperties from '../utils/object.js';
import { hasProperty } from '../utils/validation.js';

// Constants
const DEFAULT_COOKIE_KEY = 'partner_data';
const PROPERTIES_TO_REMOVE = ['latestAgreementAcceptedVersion'];

/**
 * Main entry point for the partner data extractor
 * @param testMode - Set to true for console testing, false for AEP deployment
 * @param cookieKey - Optional custom cookie key (defaults to 'partner_data')
 */
export function extractPartnerDataScript(
  testMode: boolean = false,
  cookieKey: string = DEFAULT_COOKIE_KEY
): unknown {
  return executeScript(
    {
      scriptName: 'Partner Data',
      testMode,
      testHeaderTitle: 'PARTNER DATA EXTRACTOR - TEST MODE',
      testHeaderExtraInfo: `Cookie Key: ${cookieKey}`,
      onError: (error, logger) => {
        logger.error('Unexpected error extracting partner data:', error);
        return null;
      },
    },
    (logger) => {
      // Use extraction pipeline to get and parse cookie data
      const partnerData = extractData({
        source: () => getCookie(cookieKey),
        parser: parseJsonCookie,
        transformer: (data) => {
          // Extract DXP value if it exists
          if (hasProperty(data, 'DXP')) {
            const dxpValue = data.DXP;
            const cleanedDxpValue = removeProperties(dxpValue, PROPERTIES_TO_REMOVE);
            logger.log('Found partner data (DXP extracted)', cleanedDxpValue);
            return cleanedDxpValue;
          }

          // If no DXP key, return the whole object
          const cleanedPartnerData = removeProperties(data, PROPERTIES_TO_REMOVE);
          logger.log('Found partner data (no DXP key)', cleanedPartnerData);
          return cleanedPartnerData;
        },
        logger,
        errorMessage: 'Error parsing partner data from cookie',
        notFoundMessage: 'No partner data in cookies',
      });

      return partnerData;
    }
  );
}
