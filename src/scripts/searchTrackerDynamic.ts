/**
 * Search Tracker Dynamic Script for AEP (v2 - Refactored)
 *
 * Parses URL search parameters with debouncing and triggers searchCommit event.
 * Refactored for improved security, performance, and maintainability.
 *
 * Improvements:
 * - Uses shared configuration and secure URL parser
 * - Enhanced security with input sanitization
 * - Better debouncing with cleanup
 * - Comprehensive error handling
 * - Follows SRP - single responsibility of tracking dynamic searches
 *
 * @version 2.0.0
 */

import { executeScript } from '../utils/script.js';
import type { Logger } from '../utils/logger.js';
import {
  parseSearchUrl,
  createSearchPayload,
  generateSearchKey,
  type SearchPayload,
} from '../utils/searchUrlParser.js';
import { SEARCH_SOURCES, DEBOUNCE_DELAY } from '../utils/searchConfig.js';

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

/**
 * Extend Window interface for search tracking state
 */
declare global {
  interface Window {
    /** Debounce timer for search tracking */
    __searchUrlTimer?: ReturnType<typeof setTimeout>;
    /** Last tracked search key for deduplication */
    __lastSearchKey?: string;
    /** Current search payload */
    __searchPayload?: SearchPayload;
    /** AEP Launch satellite object */
    _satellite?: {
      setVar: (name: string, value: unknown) => void;
      getVar: (name: string) => Record<string, unknown> | undefined;
      track: (eventName: string) => void;
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Processes the current URL to extract search parameters and trigger tracking
 * Called after debounce delay
 *
 * @param logger - Logger instance for debugging
 * @param testMode - Whether in test mode
 */
function processSearchUrl(logger: typeof console, testMode: boolean): void {
  logger.log('Processing search URL parameters after debounce');

  // Parse URL securely
  const parsed = parseSearchUrl(undefined, logger as unknown as Logger);

  // Validate parsed data
  if (!parsed.hasValidTerm || !parsed.term) {
    logger.log('No valid search term found');
    return;
  }

  // Generate deduplication key
  const searchKey = generateSearchKey();
  logger.log('Generated search key:', searchKey);

  // Check for duplicate
  if (searchKey === window.__lastSearchKey) {
    logger.log('Duplicate search detected, skipping');
    return;
  }

  // Update deduplication key
  window.__lastSearchKey = searchKey;
  logger.log('Updated deduplication key');

  // Create search payload
  const payload = createSearchPayload(parsed, SEARCH_SOURCES.DYNAMIC);

  if (!payload) {
    logger.error('Failed to create search payload');
    return;
  }

  // Store payload for variable setter
  window.__searchPayload = payload;
  logger.log('Stored search payload:', payload);

  // Trigger AEP tracking event
  if (window._satellite && typeof window._satellite.track === 'function') {
    logger.log('Triggering _satellite.track("searchCommit")');
    window._satellite.track('searchCommit');
  } else {
    const message = testMode
      ? '_satellite.track() not available (normal in test mode)'
      : '_satellite.track() not available - ensure AEP Launch is loaded';
    logger.warn(message);
  }
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
 * 3. After delay, parses URL securely
 * 4. Validates and stores search payload
 * 5. Triggers searchCommit event
 *
 * @param testMode - Enable verbose logging for testing
 * @returns Result object with success status and URL
 *
 * @example
 * ```typescript
 * // In AEP Launch Rule triggered by partnersSearchUrlChanged event:
 * // Sets up debounced tracking for search URLs
 * ```
 *
 * @example
 * ```typescript
 * // Enable debug mode in browser console:
 * localStorage.setItem('__aep_scripts_debug', 'true');
 * // Navigate to: /search?term=photoshop&category=tutorials
 * // Wait 300ms for debounced execution
 * ```
 */
export function searchTrackerDynamicScript(testMode: boolean = false): SearchTrackerDynamicResult {
  return executeScript(
    {
      scriptName: 'Search Tracker Dynamic',
      testMode,
      testHeaderTitle: 'SEARCH TRACKER DYNAMIC - TEST MODE',
      onError: (error, logger) => {
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

      // Set up debounced execution
      window.__searchUrlTimer = setTimeout(() => {
        processSearchUrl(logger, testMode);
      }, DEBOUNCE_DELAY);

      return {
        success: true,
        message: `Search tracking timer set (${DEBOUNCE_DELAY}ms delay)`,
        url: currentUrl,
      };
    }
  );
}
