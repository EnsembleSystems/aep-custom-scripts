/**
 * AEP Wrapper for Event Data Fetcher
 *
 * This wrapper is designed to be minified and deployed to AEP Data Elements.
 * The entire code will be wrapped in an async IIFE that returns a promise.
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
  // FETCH UTILITIES
  // ============================================================================
  const MAX_RESPONSE_SIZE = 5 * 1024 * 1024; // 5MB limit

  function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => {
      clearTimeout(timeoutId);
    });
  }

  function validateResponseSize(response: Response): void {
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
      throw new Error(`Response too large: ${contentLength} bytes (max: ${MAX_RESPONSE_SIZE})`);
    }
  }

  function isAbortError(error: unknown): boolean {
    return error instanceof Error && error.name === 'AbortError';
  }

  function isNetworkError(error: unknown): boolean {
    return error instanceof TypeError && error.message.includes('fetch');
  }

  // ============================================================================
  // STORAGE UTILITIES
  // ============================================================================
  function getStorageItem<T = unknown>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      return JSON.parse(item) as T;
    } catch {
      return null;
    }
  }

  // ============================================================================
  // MAIN SCRIPT
  // ============================================================================
  const config = {
    timeout: 10000,
    debug: TEST_MODE,
  };

  const logger = createLogger(config.debug, 'Event Data', TEST_MODE);

  const API = {
    EVENT_ENDPOINT: '/api/event.json?meta=true',
  };

  const STORAGE_KEYS = {
    ATTENDEE: 'attendeaseMember',
  };

  try {
    if (TEST_MODE) {
      console.log('='.repeat(80));
      console.log('EVENT DATA EXTRACTOR - TEST MODE');
      console.log('='.repeat(80));
    }

    // Fetch event data
    const currentDomain = window.location.origin;
    const apiUrl = `${currentDomain}${API.EVENT_ENDPOINT}`;
    logger.log('Fetching event data from', apiUrl);

    const response = await fetchWithTimeout(
      apiUrl,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      },
      config.timeout
    );

    if (!response.ok) {
      logger.error(`API error: ${response.status} ${response.statusText}`);
      return null;
    }

    validateResponseSize(response);

    const eventData = await response.json();
    logger.log('Event data received', eventData);

    // Get attendee data from localStorage
    const attendeeData = getStorageItem(STORAGE_KEYS.ATTENDEE);
    if (!attendeeData) {
      logger.log('No attendee data in localStorage');
    } else {
      logger.log('Found attendee data', attendeeData);
    }

    const result = {
      eventData,
      attendeeData,
    };

    if (TEST_MODE) {
      console.log('='.repeat(80));
      console.log('RESULT:');
      console.log('='.repeat(80));
      console.log(JSON.stringify(result, null, 2));
      console.log('='.repeat(80));
    } else {
      logger.log('Returning combined data', result);
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
    logger.error('Unexpected error fetching event data:', error);
    return null;
  }
})();
// END_AEP_CODE
}
