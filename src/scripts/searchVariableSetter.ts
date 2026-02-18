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
import type { XdmSearchFilters, XdmSearchResults } from '../utils/searchConfig.js';
import { ensurePath, getPartnerState } from '../utils/globalState.js';
import { getSatelliteVar } from '../utils/satellite.js';
import { XDM_VARIABLE_NAME } from '../utils/constants.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Result returned by the script */
export interface SearchVariableSetterResult {
  success: boolean;
  message: string;
  searchResults?: XdmSearchResults;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Safely reads and validates search payload from window
 */
function readSearchPayload(logger: Logger): SearchPayload | null {
  try {
    const payload = getPartnerState('searchPayload');

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
      const xdmVar = getSatelliteVar(XDM_VARIABLE_NAME, logger, testMode);

      if (!xdmVar) {
        return {
          success: false,
          message: '_satellite or XDM Variable not available',
          searchResults,
        };
      }

      try {
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
    }
  );
}
