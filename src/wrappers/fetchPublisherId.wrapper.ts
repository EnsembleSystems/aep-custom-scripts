/**
 * AEP Wrapper for Publisher ID Fetcher (DOM-based)
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
  // VALIDATION UTILITIES
  // ============================================================================

  /**
   * Validates if a string is a valid publisher ID
   * Supports two formats:
   * 1. UUID format: "510e1fe9-6a03-4cfb-b1a9-42e2ceef6cd9"
   * 2. Salesforce ID format: "0011O000020psd3QAA" (15 or 18 characters, alphanumeric)
   */
  function isValidPublisherId(id: string | undefined): boolean {
    if (!id || typeof id !== 'string') {
      return false;
    }

    // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // Salesforce ID format: 15 or 18 alphanumeric characters
    const salesforcePattern = /^[a-z0-9]{15}([a-z0-9]{3})?$/i;

    return uuidPattern.test(id) || salesforcePattern.test(id);
  }

  /**
   * Extracts publisher ID from href
   * Example: "/publisher/cc/2c4c7552-2bb9-4541-b625-04721319c07b/picture-instruments"
   * Returns: "2c4c7552-2bb9-4541-b625-04721319c07b" (between 3rd and 4th slash)
   */
  function extractPublisherId(href: string, logger: Logger): string | null {
    // Constants for array indices
    const PUBLISHER_INDEX = 1;
    const ID_INDEX = 3;
    const MIN_PARTS = 4;

    // Split by slash and get the part between 3rd and 4th slash
    // /publisher/cc/2c4c7552-2bb9-4541-b625-04721319c07b/picture-instruments
    // Split: ['', 'publisher', 'cc', '2c4c7552-2bb9-4541-b625-04721319c07b', 'picture-instruments']
    // Index:   0      1          2               3                              4
    const parts = href.split('/');

    // We want index 3 (between 3rd and 4th slash)
    if (parts.length >= MIN_PARTS && parts[PUBLISHER_INDEX] === 'publisher') {
      const publisherId = parts[ID_INDEX];

      // Validate the ID format for security
      if (publisherId && isValidPublisherId(publisherId)) {
        return publisherId;
      }

      logger.log('Invalid publisher ID format', publisherId);
    }

    return null;
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  const config = {
    debug: TEST_MODE,
  };

  const logger = createLogger(config.debug, 'Publisher ID DOM', TEST_MODE);

  // ============================================================================
  // MAIN SCRIPT
  // ============================================================================
  try {
    if (TEST_MODE) {
      console.log('='.repeat(80));
      console.log('PUBLISHER ID FETCHER (DOM) - TEST MODE');
      console.log('='.repeat(80));
    }

    logger.log('Searching for publisher links in DOM');

    // Use optimized selector to only query publisher links
    // This is much faster than querying all links and filtering
    const links = document.querySelectorAll('a[href^="/publisher/"]');
    logger.log(`Found ${links.length} publisher links`);

    // Iterate through publisher links to find valid ID
    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      const href = link.getAttribute('href');

      if (href) {
        const publisherId = extractPublisherId(href, logger);

        if (publisherId) {
          logger.log('Found valid publisher ID', publisherId);

          if (TEST_MODE) {
            console.log('='.repeat(80));
            console.log('RESULT:');
            console.log('='.repeat(80));
            console.log(`Publisher ID: ${publisherId}`);
            console.log('='.repeat(80));
          }

          return publisherId;
        }
      }
    }

    logger.log('No valid publisher link found in DOM');

    if (TEST_MODE) {
      console.log('='.repeat(80));
      console.log('RESULT: null (no publisher link found)');
      console.log('='.repeat(80));
    }

    return null;
  } catch (error) {
    logger.error('Error:', error);
    return null;
  }
})();
// END_AEP_CODE
}
