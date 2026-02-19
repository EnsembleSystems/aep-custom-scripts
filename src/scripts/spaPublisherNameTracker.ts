/**
 * SPA Publisher Name Tracker Script for AEP
 *
 * Handles spaPublisherNameChanged events from the SPA publisher name monitor.
 * Debounces rapid changes, deduplicates identical publisher names,
 * and triggers the spaPublisherNameCommit direct call event.
 *
 * Note: Publisher name data is read from window._adobePartners.publisherName
 * which is set by the monitor before dispatching the custom event.
 *
 * @version 1.0.0
 */

import { executeScript } from '../utils/script.js';
import type { Logger } from '../utils/logger.js';
import { fireSatelliteEvent } from '../utils/satellite.js';
import { DEBOUNCE_DELAY, SPA_PUBLISHER_NAME_COMMIT_EVENT } from '../utils/spaPublisherConfig.js';
import { getPartnerState, isDuplicate, setPartnerState } from '../utils/globalState.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Result returned by the script
 */
export interface SpaPublisherNameTrackerResult {
  /** Whether the debounce timer was set successfully */
  success: boolean;
  /** Message describing the result */
  message: string;
  /** Publisher name from state */
  publisherName?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Processes the publisher name after debounce
 *
 * @param publisherName - Publisher name from state
 * @param logger - Logger instance for debugging
 * @param testMode - Whether in test mode
 */
function processPublisherName(publisherName: string, logger: Logger, testMode: boolean): void {
  logger.log('Processing SPA publisher name after debounce');

  if (isDuplicate(publisherName, 'lastPublisherNameKey', logger)) {
    return;
  }

  fireSatelliteEvent(SPA_PUBLISHER_NAME_COMMIT_EVENT, logger, testMode);
}

// ============================================================================
// MAIN SCRIPT FUNCTION
// ============================================================================

/**
 * Sets up debounced SPA publisher name tracking from a publisher name change event
 *
 * This function:
 * 1. Reads publisher name from window._adobePartners.publisherName (set by the monitor)
 * 2. Clears any existing debounce timer
 * 3. Sets up new debounced execution (300ms)
 * 4. After delay, deduplicates and triggers spaPublisherNameCommit direct call event
 *
 * @param testMode - Enable verbose logging for testing
 * @returns Result object with success status
 *
 * @example
 * ```typescript
 * // In AEP Launch Rule triggered by spaPublisherNameChanged custom event:
 * // Sets up debounced tracking for SPA publisher name
 * ```
 *
 * @example
 * ```typescript
 * // Enable debug mode in browser console:
 * localStorage.setItem('__aep_scripts_debug', 'true');
 * // Navigate in SPA — publisher name changes trigger tracking after 300ms debounce
 * ```
 */
export function spaPublisherNameTrackerScript(
  testMode: boolean = false
): SpaPublisherNameTrackerResult {
  return executeScript<SpaPublisherNameTrackerResult>(
    {
      scriptName: 'SPA Publisher Name Tracker',
      testMode,
      testHeaderTitle: 'SPA PUBLISHER NAME TRACKER - TEST MODE',
      onError: (error, logger) => {
        logger.error('Error setting up SPA publisher name tracking:', error);
        return {
          success: false,
          message: 'Failed to set up SPA publisher name tracking',
        };
      },
    },
    (logger) => {
      const publisherName = getPartnerState('publisherName');

      if (!publisherName) {
        logger.warn('No publisher name found in partner state');
        return {
          success: false,
          message: 'No publisher name available in state',
        };
      }

      logger.log(`Publisher name: "${publisherName}"`);

      // Clear any existing timer
      const existingTimer = getPartnerState('publisherNameTimer');
      if (existingTimer) {
        clearTimeout(existingTimer);
        logger.log('Cleared existing publisher name timer');
      }

      logger.log(`Setting up debounced SPA publisher name tracking (${DEBOUNCE_DELAY}ms delay)`);

      setPartnerState(
        'publisherNameTimer',
        setTimeout(() => {
          processPublisherName(publisherName, logger, testMode);
        }, DEBOUNCE_DELAY)
      );

      return {
        success: true,
        message: `SPA publisher name tracking timer set (${DEBOUNCE_DELAY}ms delay)`,
        publisherName,
      };
    }
  );
}
