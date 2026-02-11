/**
 * Search Variable Setter Script for AEP (v3 - XDM Variable)
 *
 * Reads search payload from window and writes directly to the XDM Variable
 * so search data is included in WebSDK events.
 *
 * XDM path: xdm._adobepartners.searchResults
 *
 * @version 3.0.0
 */

import { executeScript } from '../utils/script.js';
import type { Logger } from '../utils/logger.js';
import type { SearchPayload } from '../utils/searchUrlParser.js';
import { FILTER_TO_XDM_MAP } from '../utils/searchConfig.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** XDM searchFilters structure */
interface XdmSearchFilters {
  searchContentType?: string[];
  searchFunctionality?: string[];
  searchIndustries?: string[];
  searchProducts?: string[];
  searchSolutions?: string[];
  searchTopic?: string[];
}

/** XDM searchResults structure */
interface XdmSearchResults {
  searchTerm: string;
  searchSource: string;
  searchFilters: XdmSearchFilters;
}

/** Result returned by the script */
export interface SearchVariableSetterResult {
  success: boolean;
  message: string;
  searchResults?: XdmSearchResults;
}

/**
 * Extend Window interface for search state
 */
declare global {
  interface Window {
    __searchPayload?: SearchPayload;
    _satellite?: {
      setVar: (name: string, value: unknown) => void;
      getVar: (name: string) => Record<string, unknown> | undefined;
      track: (eventName: string) => void;
    };
  }
}

// ============================================================================
// CONSTANTS
// ============================================================================

const XDM_VARIABLE_NAME = 'XDMVariable';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Safely reads and validates search payload from window
 */
function readSearchPayload(logger: Logger): SearchPayload | null {
  try {
    const payload = window.__searchPayload;

    if (!payload || typeof payload !== 'object') {
      return null;
    }

    if (typeof payload.term !== 'string') {
      logger.warn('Invalid payload: term is not a string');
      return null;
    }

    if (typeof payload.source !== 'string') {
      logger.warn('Invalid payload: source is not a string');
      return null;
    }

    if (payload.filters && typeof payload.filters === 'object') {
      const { filters } = payload;
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

/**
 * Maps generic filters to XDM searchFilters structure
 * Only known filter keys (from FILTER_TO_XDM_MAP) are included
 */
function mapFiltersToXdm(filters: Record<string, string[]>, logger: Logger): XdmSearchFilters {
  const xdmFilters: XdmSearchFilters = {};

  Object.entries(filters).forEach(([key, values]) => {
    const xdmKey = FILTER_TO_XDM_MAP[key];
    if (xdmKey) {
      (xdmFilters as Record<string, string[]>)[xdmKey] = values;
      logger.log(`Mapped filter "${key}" → "${xdmKey}":`, values);
    } else {
      logger.log(`Skipping unmapped filter "${key}" (not in XDM schema)`);
    }
  });

  return xdmFilters;
}

/**
 * Ensures nested object path exists on a target object
 */
function ensurePath(obj: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  let current = obj;
  keys.forEach((key) => {
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  });
  return current;
}

// ============================================================================
// MAIN SCRIPT FUNCTION
// ============================================================================

/**
 * Sets search data in the XDM Variable for WebSDK events
 *
 * This function:
 * 1. Reads window.__searchPayload safely
 * 2. Validates payload structure
 * 3. Maps filters to XDM schema field names
 * 4. Writes searchResults into XDMVariable via _satellite.getVar()
 *
 * @param testMode - Enable verbose logging for testing
 * @returns Result object with success status and XDM data
 */
export function searchVariableSetterScript(testMode: boolean = false): SearchVariableSetterResult {
  return executeScript(
    {
      scriptName: 'Search Variable Setter',
      testMode,
      testHeaderTitle: 'SEARCH VARIABLE SETTER - TEST MODE',
      onError: (error, logger): SearchVariableSetterResult => {
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
        logger.log('No valid search payload found');
        return {
          success: false,
          message: 'No valid search payload found',
        };
      }

      // Build XDM search results
      const xdmFilters = mapFiltersToXdm(payload.filters, logger);

      const searchResults: XdmSearchResults = {
        searchTerm: payload.term,
        searchSource: payload.source,
        searchFilters: xdmFilters,
      };

      logger.log('Built XDM searchResults:', searchResults);

      // Get XDM Variable and set search results
      if (window._satellite && typeof window._satellite.getVar === 'function') {
        try {
          const xdmVar = window._satellite.getVar(XDM_VARIABLE_NAME);

          if (!xdmVar) {
            logger.error(`XDM Variable "${XDM_VARIABLE_NAME}" not found`);
            return {
              success: false,
              message: `XDM Variable "${XDM_VARIABLE_NAME}" not found`,
              searchResults,
            };
          }

          // Ensure the path xdm._adobepartners.searchResults exists
          const searchResultsNode = ensurePath(xdmVar, ['_adobepartners', 'searchResults']);

          // Set search results fields
          searchResultsNode.searchTerm = searchResults.searchTerm;
          searchResultsNode.searchSource = searchResults.searchSource;
          searchResultsNode.searchFilters = searchResults.searchFilters;

          logger.log('Successfully set XDM Variable searchResults');

          return {
            success: true,
            message: 'Search results set in XDM Variable',
            searchResults,
          };
        } catch (error) {
          logger.error('Error setting XDM Variable:', error);
          return {
            success: false,
            message: 'Failed to set XDM Variable',
            searchResults,
          };
        }
      } else {
        const message = testMode
          ? '_satellite.getVar() not available (normal in test mode)'
          : '_satellite.getVar() not available - ensure AEP Launch is loaded';
        logger.warn(message);

        return {
          success: false,
          message: '_satellite not available',
          searchResults,
        };
      }
    }
  );
}
