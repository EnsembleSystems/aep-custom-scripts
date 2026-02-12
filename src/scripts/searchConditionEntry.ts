/**
 * Search Condition Entry Script for AEP (v2 - Refactored)
 *
 * Condition script that checks if the current page load is an entry search.
 * Refactored for improved security, performance, and maintainability.
 *
 * Improvements:
 * - Uses shared configuration and utilities
 * - Enhanced security with input sanitization
 * - Better error handling
 * - Follows SOLID principles
 * - Comprehensive documentation
 *
 * @version 2.0.0
 */

import { executeScript } from '../utils/script.js';
import { parseSearchUrl } from '../utils/searchUrlParser.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// ============================================================================
// MAIN SCRIPT FUNCTION
// ============================================================================

/**
 * Checks if the current page load is a valid entry search
 *
 * This function:
 * 1. Ensures it runs only once per page load
 * 2. Parses URL parameters securely
 * 3. Validates search term existence and length
 * 4. Returns boolean for use in AEP Launch Rule conditions
 *
 * @param testMode - Enable verbose logging for testing
 * @returns Boolean indicating if valid entry search detected
 *
 * @example
 * ```typescript
 * // In AEP Launch Rule Condition:
 * // Returns true if entry search detected, false otherwise
 * ```
 *
 * @example
 * ```typescript
 * // Enable debug mode in browser console:
 * localStorage.setItem('__aep_scripts_debug', 'true');
 * // Navigate to: /search?term=adobe+report
 * // Result: true (first time), false (subsequent calls)
 * ```
 */
export function searchConditionEntryScript(testMode: boolean = false): boolean {
  return executeScript(
    {
      scriptName: 'Search Condition Entry',
      testMode,
      testHeaderTitle: 'SEARCH CONDITION ENTRY - TEST MODE',
      onError: (error, logger) => {
        logger.error('Error checking entry search:', error);
        return false;
      },
    },
    (logger) => {
      // Guard: Ensure single execution per page load
      if (window.__entrySearchChecked) {
        logger.log('Entry search already checked this page load');
        return false;
      }

      // Mark as checked
      window.__entrySearchChecked = true;
      logger.log('Entry search check initialized');

      // Parse and validate URL
      const parsed = parseSearchUrl(undefined, logger);

      if (!parsed.hasValidTerm) {
        logger.log('No valid entry search detected');
        return false;
      }

      logger.log(
        `Valid entry search detected - term: "${parsed.term}" from param: "${parsed.termParam}"`
      );
      return true;
    }
  );
}
