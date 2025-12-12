/**
 * Hello World Template Script for AEP
 *
 * This is a basic template demonstrating how to create a new AEP data fetcher.
 * Copy this file and modify it to create your own custom script.
 *
 * Features demonstrated:
 * - Logger integration
 * - Fetch with timeout
 * - Error handling patterns
 * - Test mode support
 * - Type safety
 *
 * Usage:
 * 1. Copy this file to create your own script: src/scripts/yourScript.ts
 * 2. Modify the logic to suit your needs
 * 3. Run `npm run build` - wrapper will be auto-generated
 * 4. Deploy build/yourScript.min.js to AEP
 */

import { createLogger } from '../utils/logger.js';
import {
  fetchWithTimeout,
  isAbortError,
  isNetworkError,
} from '../utils/fetch.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Configuration for the script
 */
export interface HelloWorldConfig {
  /** Request timeout in milliseconds */
  timeout: number;
  /** Enable debug logging */
  debug: boolean;
  /** Custom message to display */
  message?: string;
}

/**
 * Result returned by the script
 */
export interface HelloWorldResult {
  /** Success status */
  success: boolean;
  /** Message from the script */
  message: string;
  /** Optional data payload */
  data?: unknown;
  /** Timestamp of execution */
  timestamp: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: HelloWorldConfig = {
  timeout: 10000,
  debug: false,
  message: 'Hello from AEP!',
};

/**
 * Example API endpoints (if needed)
 */
// @ts-expect-error - Placeholder for template
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const API = {
  // Example: '/api/data.json'
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Example helper function to fetch data from an API
 * Delete this if you don't need it
 */
// @ts-expect-error - Example function for template
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function fetchExampleData(
  config: HelloWorldConfig,
  logger: ReturnType<typeof createLogger>
): Promise<unknown> {
  logger.log('Fetching example data...');

  // Example API call (replace with your actual endpoint)
  const apiUrl = `${window.location.origin}/api/example`;

  const response = await fetchWithTimeout(
    apiUrl,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    },
    config.timeout
  );

  if (!response.ok) {
    throw new Error(`API returned ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  logger.log('Data received:', data);

  return data;
}

/**
 * Example helper function to process data
 * Delete this if you don't need it
 */
// @ts-expect-error - Example function for template
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function processData(
  data: unknown,
  logger: ReturnType<typeof createLogger>
): unknown {
  logger.log('Processing data...');

  // Add your data processing logic here
  // For example: validation, transformation, filtering, etc.

  return data;
}

// ============================================================================
// MAIN SCRIPT FUNCTION
// ============================================================================

/**
 * Main entry point for the Hello World script
 *
 * @param testMode - Set to true for browser console testing, false for AEP deployment
 * @returns Result object or null on error
 *
 * @example
 * // In browser console (with TEST_MODE = true in wrapper):
 * await (async () => { ... })();
 *
 * @example
 * // In AEP Data Element:
 * return (async () => { ... })();
 */
export async function helloWorldScript(
  testMode: boolean = false
): Promise<HelloWorldResult | null> {
  // Merge default config
  const config: HelloWorldConfig = {
    ...DEFAULT_CONFIG,
    debug: testMode, // Enable debug logging in test mode
  };

  // Create logger instance
  const logger = createLogger(config.debug, 'Hello World', testMode);

  try {
    // Test mode header
    logger.testHeader('HELLO WORLD SCRIPT - TEST MODE', config);

    // ========================================================================
    // YOUR SCRIPT LOGIC GOES HERE
    // ========================================================================

    logger.log('Script started');

    // Example 1: Simple data construction
    const simpleResult = {
      message: config.message || DEFAULT_CONFIG.message,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      currentUrl: window.location.href,
    };

    logger.log('Simple result created:', simpleResult);

    // Example 2: Fetch data from API (uncomment if needed)
    // try {
    //   const apiData = await fetchExampleData(config, logger);
    //   const processedData = processData(apiData, logger);
    //   // Use processedData in your result
    // } catch (error) {
    //   logger.error('Failed to fetch data:', error);
    //   // Decide whether to continue or return null
    // }

    // Example 3: Extract data from DOM (uncomment if needed)
    // const titleElement = document.querySelector('h1');
    // const pageTitle = titleElement?.textContent || 'No title found';
    // logger.log('Page title:', pageTitle);

    // Example 4: Read from localStorage (uncomment if needed)
    // import { getStorageItem } from '../utils/storage.js';
    // const userData = getStorageItem('user_data');
    // logger.log('User data:', userData);

    // Example 5: Read from cookies (uncomment if needed)
    // import { getCookie, parseJsonCookie } from '../utils/cookie.js';
    // const cookieValue = getCookie('my_cookie');
    // const parsedCookie = parseJsonCookie(cookieValue);
    // logger.log('Cookie data:', parsedCookie);

    // ========================================================================
    // BUILD RESULT OBJECT
    // ========================================================================

    const result: HelloWorldResult = {
      success: true,
      message: 'Hello World script executed successfully',
      data: simpleResult,
      timestamp: new Date().toISOString(),
    };

    // Test mode footer
    logger.testResult(result);
    if (!testMode) {
      logger.log('Returning result:', result);
    }

    return result;
  } catch (error) {
    // ========================================================================
    // ERROR HANDLING
    // ========================================================================

    // Handle timeout errors
    if (isAbortError(error)) {
      logger.error(`Request timeout after ${config.timeout}ms`);
      return null;
    }

    // Handle network errors
    if (isNetworkError(error)) {
      logger.error('Network error:', error);
      return null;
    }

    // Handle all other errors
    logger.error('Unexpected error in Hello World script:', error);
    return null;
  }
}
