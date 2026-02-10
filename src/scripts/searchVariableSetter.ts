/**
 * Search Variable Setter Script for AEP (v2 - Refactored)
 *
 * Reads search payload from window and sets AEP Launch variables.
 * Refactored for improved security, performance, and maintainability.
 *
 * Improvements:
 * - Better validation of payload structure
 * - Safe handling of missing data
 * - Type-safe variable setting
 * - Comprehensive error handling
 * - Follows SRP - single responsibility of setting Launch variables
 *
 * @version 2.0.0
 */

import { executeScript } from '../utils/script.js';
import type { SearchPayload } from '../utils/searchUrlParser.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Result returned by the script
 */
export interface SearchVariableSetterResult {
  /** Whether variables were set successfully */
  success: boolean;
  /** Message describing the result */
  message: string;
  /** Variables that were set */
  variables?: {
    searchTerm: string;
    searchFilters: Record<string, string[]>;
    searchSource: string;
  };
}

/**
 * Extend Window interface for search state
 */
declare global {
  interface Window {
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
// CONSTANTS
// ============================================================================

/** Default values for missing data */
const DEFAULTS = {
  TERM: '',
  FILTERS: {} as Record<string, string[]>,
  SOURCE: 'unknown',
} as const;

/** Variable names in Launch */
const VARIABLE_NAMES = {
  TERM: 'searchTerm',
  FILTERS: 'searchFilters',
  SOURCE: 'searchSource',
} as const;

// ============================================================================
// MAIN SCRIPT FUNCTION
// ============================================================================

/**
 * Sets AEP Launch variables from search payload
 *
 * This function:
 * 1. Reads window.__searchPayload safely
 * 2. Validates payload structure
 * 3. Sets Launch variables with defaults
 * 4. Returns status and values set
 *
 * @param testMode - Enable verbose logging for testing
 * @returns Result object with success status and variables
 *
 * @example
 * ```typescript
 * // In AEP Launch Direct Call Rule for searchCommit:
 * // Sets searchTerm, searchFilters, searchSource variables
 * ```
 *
 * @example
 * ```typescript
 * // Enable debug mode and test:
 * localStorage.setItem('__aep_scripts_debug', 'true');
 * window.__searchPayload = {
 *   term: 'photoshop',
 *   filters: { category: ['tutorials'] },
 *   source: 'entry'
 * };
 * // Then trigger the script
 * ```
 */
export function searchVariableSetterScript(testMode: boolean = false): SearchVariableSetterResult {
  return executeScript(
    {
      scriptName: 'Search Variable Setter',
      testMode,
      testHeaderTitle: 'SEARCH VARIABLE SETTER V2 - TEST MODE',
      onError: (error, logger) => {
        logger.error('Error setting search variables:', error);
        return {
          success: false,
          message: 'Failed to set search variables',
        };
      },
    },
    (logger) => {
      // Read and validate payload
      const payload = readSearchPayload(logger);

      if (!payload) {
        logger.log('No search payload found, using defaults');
      }

      // Extract values with defaults
      const term = payload?.term ?? DEFAULTS.TERM;
      const filters = payload?.filters ?? DEFAULTS.FILTERS;
      const source = payload?.source ?? DEFAULTS.SOURCE;

      logger.log('Extracted values:', { term, filters, source });

      // Set Launch variables
      if (window._satellite && typeof window._satellite.setVar === 'function') {
        try {
          window._satellite.setVar(VARIABLE_NAMES.TERM, term);
          window._satellite.setVar(VARIABLE_NAMES.FILTERS, filters);
          window._satellite.setVar(VARIABLE_NAMES.SOURCE, source);

          logger.log('Successfully set Launch variables');

          return {
            success: true,
            message: 'Search variables set successfully',
            variables: {
              searchTerm: term,
              searchFilters: filters,
              searchSource: source,
            },
          };
        } catch (error) {
          logger.error('Error setting Launch variables:', error);
          return {
            success: false,
            message: 'Failed to set Launch variables',
          };
        }
      } else {
        const message = testMode
          ? '_satellite.setVar() not available (normal in test mode)'
          : '_satellite.setVar() not available - ensure AEP Launch is loaded';
        logger.warn(message);

        return {
          success: false,
          message: '_satellite not available',
          variables: {
            searchTerm: term,
            searchFilters: filters,
            searchSource: source,
          },
        };
      }
    }
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Safely reads and validates search payload from window
 *
 * @param logger - Logger instance for debugging
 * @returns Validated payload or null
 */
function readSearchPayload(logger: typeof console): SearchPayload | null {
  try {
    const payload = window.__searchPayload;

    // Check if payload exists
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    // Validate structure
    if (typeof payload.term !== 'string') {
      logger.warn('Invalid payload: term is not a string');
      return null;
    }

    if (typeof payload.source !== 'string') {
      logger.warn('Invalid payload: source is not a string');
      return null;
    }

    // Validate filters (must be an object with string array values)
    if (payload.filters && typeof payload.filters === 'object') {
      const filters = payload.filters;
      const isValid = Object.values(filters).every(
        (value) => Array.isArray(value) && value.every((v) => typeof v === 'string')
      );

      if (!isValid) {
        logger.warn('Invalid payload: filters format incorrect');
        return null;
      }
    }

    logger.log('Payload validated successfully');
    return payload;
  } catch (error) {
    logger.error('Error reading search payload:', error);
    return null;
  }
}
