/**
 * AEP Wrapper for Partner Data Fetcher
 *
 * This wrapper is designed to be minified and deployed to AEP Data Elements.
 */

// @ts-ignore - This is a wrapper file that will be extracted and minified
export default function aepWrapper() {
// START_AEP_CODE
return (async () => {
  const TEST_MODE = false; // Set to true for console testing

  // ============================================================================
  // LOGGER
  // ============================================================================
  class Logger {
    constructor(private debug: boolean, private prefix: string) {}

    log(message: string, data?: unknown): void {
      if (this.debug) {
        console.log(`${this.prefix} ${message}`, data ?? '');
      }
    }

    error(message: string, data?: unknown): void {
      console.error(`${this.prefix} ${message}`, data ?? '');
    }
  }

  function createLogger(debug: boolean, scriptName: string, isTestMode: boolean): Logger {
    const prefix = isTestMode ? `[${scriptName} Test]` : `[AEP ${scriptName}]`;
    return new Logger(debug, prefix);
  }

  // ============================================================================
  // COOKIE UTILITIES
  // ============================================================================
  function getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      const cookieValue = parts.pop()?.split(';').shift();
      return cookieValue ?? null;
    }
    return null;
  }

  function parseJsonCookie<T = unknown>(cookieValue: string | null): T | null {
    if (!cookieValue) return null;
    try {
      return JSON.parse(decodeURIComponent(cookieValue)) as T;
    } catch {
      return null;
    }
  }

  // ============================================================================
  // MAIN SCRIPT
  // ============================================================================
  const config = {
    debug: TEST_MODE,
    cookieKey: 'partner_data',
  };

  const logger = createLogger(config.debug, 'Partner Data', TEST_MODE);

  try {
    if (TEST_MODE) {
      console.log('='.repeat(80));
      console.log('PARTNER DATA EXTRACTOR - TEST MODE');
      console.log('='.repeat(80));
      console.log(`Cookie Key: ${config.cookieKey}`);
      console.log('='.repeat(80));
    }

    // Get partner data from cookies
    const partnerCookie = getCookie(config.cookieKey);
    if (!partnerCookie) {
      logger.log('No partner data in cookies');
    }

    const partnerData = parseJsonCookie(partnerCookie);
    if (!partnerData) {
      if (partnerCookie) {
        logger.error('Error parsing partner data from cookie');
      }
    } else {
      logger.log('Found partner data', partnerData);
    }

    const result = {
      partnerData,
    };

    if (TEST_MODE) {
      console.log('='.repeat(80));
      console.log('RESULT:');
      console.log('='.repeat(80));
      console.log(JSON.stringify(result, null, 2));
      console.log('='.repeat(80));
    } else {
      logger.log('Returning partner data', result);
    }

    return result;
  } catch (error) {
    logger.error('Error:', error);
    return null;
  }
})();
// END_AEP_CODE
}
