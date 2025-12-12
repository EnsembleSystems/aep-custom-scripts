/**
 * AEP Wrapper for Hello World
 *
 * This wrapper demonstrates the complete structure of an AEP-compatible script.
 * Use this as a reference when creating your own wrappers.
 *
 * Key points:
 * - Everything between START_AEP_CODE and END_AEP_CODE will be minified
 * - All utilities must be inlined (no imports)
 * - Must return a Promise (IIFE pattern)
 * - TEST_MODE should be false for production, true for console testing
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

    warn(message: string, data?: unknown): void {
      console.warn(`${this.prefix} ${message}`, data ?? '');
    }
  }

  function createLogger(debug: boolean, scriptName: string, isTestMode: boolean): Logger {
    const prefix = isTestMode ? `[${scriptName} Test]` : `[AEP ${scriptName}]`;
    return new Logger(debug, prefix);
  }

  // ============================================================================
  // FETCH UTILITIES (only if needed - remove if not using fetch)
  // ============================================================================
  function isAbortError(error: unknown): boolean {
    return error instanceof Error && error.name === 'AbortError';
  }

  function isNetworkError(error: unknown): boolean {
    return error instanceof TypeError && error.message.includes('fetch');
  }

  // ============================================================================
  // MAIN SCRIPT
  // ============================================================================
  const config = {
    timeout: 10000,
    debug: TEST_MODE,
    message: 'Hello from AEP!',
  };

  const logger = createLogger(config.debug, 'Hello World', TEST_MODE);

  try {
    if (TEST_MODE) {
      console.log('='.repeat(80));
      console.log('HELLO WORLD SCRIPT - TEST MODE');
      console.log('='.repeat(80));
      console.log('Config:', config);
    }

    logger.log('Script started');

    // Build result
    const simpleResult = {
      message: config.message,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      currentUrl: window.location.href,
    };

    logger.log('Simple result created:', simpleResult);

    const result = {
      success: true,
      message: 'Hello World script executed successfully',
      data: simpleResult,
      timestamp: new Date().toISOString(),
    };

    if (TEST_MODE) {
      console.log('='.repeat(80));
      console.log('RESULT:');
      console.log('='.repeat(80));
      console.log(JSON.stringify(result, null, 2));
      console.log('='.repeat(80));
    } else {
      logger.log('Returning result:', result);
    }

    return result;
  } catch (error) {
    if (isAbortError(error)) {
      logger.error(`Request timeout after ${config.timeout}ms`);
      return null;
    }
    if (isNetworkError(error)) {
      logger.error('Network error:', error);
      return null;
    }
    logger.error('Unexpected error in Hello World script:', error);
    return null;
  }
})();
// END_AEP_CODE
}
