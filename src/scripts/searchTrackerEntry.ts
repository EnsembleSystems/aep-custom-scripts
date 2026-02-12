/**
 * Search Tracker Entry Script for AEP (v3 - DRY Refactored)
 *
 * Action script that processes entry search parameters and triggers searchCommit event.
 * Delegates the core parse→dedupe→store→fire flow to the shared trackSearch utility.
 *
 * @version 3.0.0
 */

import { executeScript } from '../utils/script.js';
import { SEARCH_SOURCES } from '../utils/searchConfig.js';
import { trackSearch } from '../utils/searchTracker.js';

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

// ============================================================================
// MAIN SCRIPT FUNCTION
// ============================================================================

/**
 * Tracks entry search from URL parameters
 *
 * This function delegates to the shared trackSearch utility which:
 * 1. Parses URL parameters securely
 * 2. Validates and sanitizes search term and filters
 * 3. Checks for duplicate searches
 * 4. Stores payload in window for variable setter
 * 5. Triggers searchCommit event
 *
 * @param testMode - Enable verbose logging for testing
 * @returns Result object with success status and details
 */
export function searchTrackerEntryScript(testMode: boolean = false): SearchTrackerEntryResult {
  return executeScript(
    {
      scriptName: 'Search Tracker Entry',
      testMode,
      testHeaderTitle: 'SEARCH TRACKER ENTRY - TEST MODE',
      onError: (error, logger): SearchTrackerEntryResult => {
        logger.error('Error tracking entry search:', error);
        return {
          success: false,
          message: 'Failed to track entry search',
        };
      },
    },
    (logger) => {
      logger.log('Processing entry search URL parameters');

      const result = trackSearch(SEARCH_SOURCES.ENTRY, logger, testMode);

      return {
        success: result.success,
        message: result.message,
        term: result.term,
        filterCount: result.filterCount,
      };
    }
  );
}
