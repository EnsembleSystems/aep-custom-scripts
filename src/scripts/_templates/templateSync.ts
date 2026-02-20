/**
 * Template Script for AEP (Sync Version)
 *
 * Use this template when your script performs only synchronous operations
 * such as reading cookies, localStorage, DOM parsing, or data transformation.
 *
 * Features demonstrated:
 * - Synchronous execution with executeScript wrapper
 * - Logger integration
 * - Data extraction pipeline pattern
 * - Error handling patterns
 * - Test mode support
 * - Type safety
 *
 * Usage:
 * 1. Copy this file: cp src/scripts/templateSync.ts src/scripts/yourScript.ts
 * 2. Replace "Template" with your script name in types and functions
 * 3. Modify the logic to suit your needs
 * 4. Run `npm run build`
 * 5. Deploy build/yourScript.js to AEP
 */

import { executeScript } from '../../utils/script.js';
import type { Logger } from '../../utils/logger.js';
// Uncomment these imports as needed in your script
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {
  getCookie as _getCookie,
  parseJsonCookie as _parseJsonCookie,
} from '../../utils/cookie.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { extractData as _extractData } from '../../utils/extraction.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Configuration for the script
 */
export interface TemplateConfig {
  /** Custom cookie key to read */
  cookieKey?: string;
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
  cookieKey: 'my_cookie',
  message: 'Template script executed',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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
 * @param config - Optional configuration object
 * @returns Result object or null on error
 *
 * @example
 * // In browser console (with TEST_MODE = true in wrapper):
 * // Result will be logged to console automatically
 *
 * @example
 * // In AEP Data Element:
 * // Result is returned synchronously
 */
export function templateSyncScript(
  testMode: boolean = false,
  config: TemplateConfig = {}
): TemplateResult | null {
  // Merge with default config
  const mergedConfig: TemplateConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  return executeScript(
    {
      scriptName: 'Template',
      testMode,
      testHeaderTitle: 'TEMPLATE SCRIPT (SYNC) - TEST MODE',
      testHeaderExtraInfo: mergedConfig,
      onError: (error, logger) => {
        logger.error('Unexpected error in template script:', error);
        return null;
      },
    },
    (logger) => {
      // ========================================================================
      // YOUR SCRIPT LOGIC GOES HERE
      // ========================================================================

      logger.log('Script started');

      // Example 1: Simple data construction
      const simpleResult = {
        message: mergedConfig.message || DEFAULT_CONFIG.message,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        currentUrl: window.location.href,
      };

      logger.log('Simple result created:', simpleResult);

      // Example 2: Extract data from cookies using extraction pipeline
      // const cookieData = extractData({
      //   source: () => getCookie(mergedConfig.cookieKey || ''),
      //   parser: parseJsonCookie,
      //   transformer: (data) => {
      //     // Transform or filter data as needed
      //     return data;
      //   },
      //   logger,
      //   errorMessage: 'Error parsing cookie data',
      //   notFoundMessage: 'No cookie data found',
      // });
      //
      // if (cookieData) {
      //   logger.log('Cookie data extracted:', cookieData);
      // }

      // Example 3: Extract data from DOM
      // const titleElement = document.querySelector('h1');
      // const pageTitle = titleElement?.textContent || 'No title found';
      // logger.log('Page title:', pageTitle);

      // Example 4: Read from localStorage
      // import { getStorageItem } from '../../utils/storage.js';
      // const userData = getStorageItem('user_data');
      // logger.log('User data:', userData);

      // Example 5: Use DOM utilities for shadow DOM
      // import { queryShadow, getTextContent } from '../../utils/dom.js';
      // const shadowHost = document.querySelector('.shadow-host');
      // if (shadowHost) {
      //   const element = queryShadow(shadowHost, '.selector');
      //   const text = getTextContent(element);
      //   logger.log('Shadow DOM text:', text);
      // }

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
