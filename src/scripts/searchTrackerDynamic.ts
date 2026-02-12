/**
 * Search Tracker Dynamic Script for AEP (v3 - DRY Refactored)
 *
 * Sets up debounced search tracking for URL changes in single-page applications.
 * Delegates the core parse→dedupe→store→fire flow to the shared trackSearch utility.
 *
 * @version 3.0.0
 */

import { executeScript } from '../utils/script.js';
import type { Logger } from '../utils/logger.js';
import { SEARCH_SOURCES, DEBOUNCE_DELAY } from '../utils/searchConfig.js';
import { trackSearch } from '../utils/searchTracker.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Result returned by the script
 */
export interface SearchTrackerDynamicResult {
  /** Whether the debounce timer was set successfully */
  success: boolean;
  /** Message describing the result */
  message: string;
  /** Current URL being processed */
  url?: string;
}

// ============================================================================
// MAIN SCRIPT FUNCTION
// ============================================================================

/**
 * Sets up debounced search tracking for URL changes
 *
 * This function:
 * 1. Clears any existing debounce timer
 * 2. Sets up new debounced execution
 * 3. After delay, delegates to shared trackSearch utility
 *
 * @param testMode - Enable verbose logging for testing
 * @returns Result object with success status and URL
 */
export function searchTrackerDynamicScript(testMode: boolean = false): SearchTrackerDynamicResult {
  return executeScript(
    {
      scriptName: 'Search Tracker Dynamic',
      testMode,
      testHeaderTitle: 'SEARCH TRACKER DYNAMIC - TEST MODE',
      onError: (error, logger): SearchTrackerDynamicResult => {
        logger.error('Error setting up search tracking:', error);
        return {
          success: false,
          message: 'Failed to set up search tracking',
        };
      },
    },
    (logger) => {
      // Clear any existing timer
      if (window.__searchUrlTimer) {
        clearTimeout(window.__searchUrlTimer);
        logger.log('Cleared existing search timer');
      }

      const currentUrl = window.location.href;
      logger.log(`Setting up debounced search tracking (${DEBOUNCE_DELAY}ms delay)`);

      // Set up debounced execution using shared tracking flow
      window.__searchUrlTimer = setTimeout(() => {
        trackSearch(SEARCH_SOURCES.DYNAMIC, logger as unknown as Logger, testMode);
      }, DEBOUNCE_DELAY);

      return {
        success: true,
        message: `Search tracking timer set (${DEBOUNCE_DELAY}ms delay)`,
        url: currentUrl,
      };
    }
  );
}
