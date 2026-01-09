/**
 * Template Script for AEP (Async Version)
 *
 * Use this template when your script needs to perform asynchronous operations
 * such as API calls, async data fetching, or Promise-based operations.
 *
 * Features demonstrated:
 * - Async/await patterns with executeAsyncScript wrapper
 * - Logger integration
 * - Fetch with timeout
 * - Error handling patterns
 * - Test mode support
 * - Type safety
 *
 * Usage:
 * 1. Copy this file: cp src/scripts/templateAsync.ts src/scripts/yourScript.ts
 * 2. Replace "Template" with your script name in types and functions
 * 3. Modify the logic to suit your needs
 * 4. Run `npm run build`
 * 5. Deploy build/yourScript.js to AEP
 */

import { executeAsyncScript } from '../utils/script.js';
import type { Logger } from '../utils/logger.js';
import { fetchWithTimeout, isAbortError, isNetworkError } from '../utils/fetch.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Configuration for the script
 */
export interface TemplateConfig {
  /** Request timeout in milliseconds */
  timeout: number;
  /** Custom message to display */
  message?: string;
}

/**
 * Result returned by the script
 */
export interface TemplateResult {
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
const DEFAULT_CONFIG: TemplateConfig = {
  timeout: 10000,
  message: 'Template script executed',
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
async function fetchExampleData(config: TemplateConfig, logger: Logger): Promise<unknown> {
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
function processData(data: unknown, logger: Logger): unknown {
  logger.log('Processing data...');

  // Add your data processing logic here
  // For example: validation, transformation, filtering, etc.

  return data;
}

// ============================================================================
// MAIN SCRIPT FUNCTION
// ============================================================================

/**
 * Main entry point for the Template script
 *
 * @param testMode - Set to true for browser console testing, false for AEP deployment
 * @returns Promise that resolves to result object or null on error
 *
 * @example
 * // In browser console (with TEST_MODE = true in wrapper):
 * // Result will be logged to console automatically
 *
 * @example
 * // In AEP Data Element:
 * // Promise is returned and AEP Launch will await it
 */
export async function templateAsyncScript(
  testMode: boolean = false
): Promise<TemplateResult | null> {
  // Merge default config
  const config: TemplateConfig = {
    ...DEFAULT_CONFIG,
  };

  return executeAsyncScript(
    {
      scriptName: 'Template',
      testMode,
      testHeaderTitle: 'TEMPLATE SCRIPT (ASYNC) - TEST MODE',
      testHeaderExtraInfo: config,
      onError: (error) => {
        // Handle timeout errors
        if (isAbortError(error)) {
          return null;
        }

        // Handle network errors
        if (isNetworkError(error)) {
          return null;
        }

        // Handle all other errors
        return null;
      },
    },
    async (logger) => {
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

      const result: TemplateResult = {
        success: true,
        message: 'Template script executed successfully',
        data: simpleResult,
        timestamp: new Date().toISOString(),
      };

      return result;
    }
  );
}
