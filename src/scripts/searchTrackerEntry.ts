/**
 * Search Tracker Entry Script for AEP (v2 - Refactored)
 *
 * Action script that processes entry search parameters and triggers searchCommit event.
 * Refactored for improved security, performance, and maintainability.
 *
 * Improvements:
 * - Uses shared configuration and secure URL parser
 * - Enhanced security with input sanitization and validation
 * - Better deduplication logic
 * - Comprehensive error handling
 * - Follows SRP - single responsibility of tracking entry searches
 *
 * @version 2.0.0
 */

import { executeScript } from '../utils/script.js';
import {
  parseSearchUrl,
  createSearchPayload,
  generateSearchKey,
  type SearchPayload,
} from '../utils/searchUrlParser.js';
import { SEARCH_SOURCES } from '../utils/searchConfig.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Result returned by the script
 */
export interface SearchTrackerEntryResult {
  /** Whether the search was tracked successfully */
  success: boolean;
  /** Message describing the result */
  message: string;
  /** Search term if found */
  term?: string;
  /** Number of filters extracted */
  filterCount?: number;
}

/**
 * Extend Window interface for search tracking state
 */
declare global {
  interface Window {
    /** Last tracked search key for deduplication */
    __lastSearchKey?: string;
    /** Current search payload */
    __searchPayload?: SearchPayload;
    /** AEP Launch satellite object */
    _satellite?: {
      setVar: (name: string, value: unknown) => void;
      track: (eventName: string) => void;
    };
  }
}

// ============================================================================
// MAIN SCRIPT FUNCTION
// ============================================================================

/**
 * Tracks entry search from URL parameters
 *
 * This function:
 * 1. Parses URL parameters securely
 * 2. Validates and sanitizes search term and filters
 * 3. Checks for duplicate searches
 * 4. Stores payload in window for variable setter
 * 5. Triggers searchCommit event
 *
 * @param testMode - Enable verbose logging for testing
 * @returns Result object with success status and details
 *
 * @example
 * ```typescript
 * // In AEP Launch Rule Action:
 * // Processes entry search and triggers searchCommit event
 * ```
 *
 * @example
 * ```typescript
 * // Enable debug mode in browser console:
 * localStorage.setItem('__aep_scripts_debug', 'true');
 * // Navigate to: /search?term=adobe&industries=caas:industry/tech
 * // Check console for detailed output
 * ```
 */
export function searchTrackerEntryScript(testMode: boolean = false): SearchTrackerEntryResult {
  return executeScript(
    {
      scriptName: 'Search Tracker Entry',
      testMode,
      testHeaderTitle: 'SEARCH TRACKER ENTRY - TEST MODE',
      onError: (error, logger) => {
        logger.error('Error tracking entry search:', error);
        return {
          success: false,
          message: 'Failed to track entry search',
        };
      },
    },
    (logger) => {
      logger.log('Processing entry search URL parameters');

      // Parse URL securely
      const parsed = parseSearchUrl(undefined, logger);

      // Validate parsed data
      if (!parsed.hasValidTerm || !parsed.term) {
        logger.log('No valid search term found');
        return {
          success: false,
          message: 'No valid search term found',
        };
      }

      // Generate deduplication key
      const searchKey = generateSearchKey();
      logger.log('Generated search key:', searchKey);

      // Check for duplicate
      if (searchKey === window.__lastSearchKey) {
        logger.log('Duplicate search detected, skipping');
        return {
          success: false,
          message: 'Duplicate search (already tracked)',
          term: parsed.term,
        };
      }

      // Update deduplication key
      window.__lastSearchKey = searchKey;
      logger.log('Updated deduplication key');

      // Create search payload
      const payload = createSearchPayload(parsed, SEARCH_SOURCES.ENTRY);

      if (!payload) {
        logger.error('Failed to create search payload');
        return {
          success: false,
          message: 'Failed to create search payload',
        };
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

      const filterCount = Object.keys(payload.filters).length;

      return {
        success: true,
        message: 'Entry search tracked successfully',
        term: payload.term,
        filterCount,
      };
    }
  );
}
