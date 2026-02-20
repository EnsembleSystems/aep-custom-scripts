/**
 * SPA Publisher Name Tracker Script for AEP
 *
 * Thin config wrapper around the generic `trackElement` utility.
 * Handles spaPublisherNameChanged events from the SPA publisher name monitor.
 * Debounces rapid changes, deduplicates identical publisher names,
 * and triggers the spaPublisherNameCommit direct call event.
 *
 * To track a different element, create a new script file and supply a
 * different ElementTrackerConfig — no logic changes required.
 *
 * @version 2.0.0
 */

import { executeScript } from '../utils/script.js';
import { trackElement, type ElementTrackerConfig } from '../utils/spaEventTracker.js';
import { SPA_PUBLISHER_NAME_COMMIT_EVENT, DEBOUNCE_DELAY } from '../utils/spaPublisherConfig.js';

// ============================================================================
// TRACKER CONFIG
// ============================================================================

const PUBLISHER_TRACKER_CONFIG: ElementTrackerConfig = {
  stateKey: 'publisherName',
  timerKey: 'publisherNameTimer',
  dedupKey: 'lastPublisherNameKey',
  commitEvent: SPA_PUBLISHER_NAME_COMMIT_EVENT,
  debounceDelay: DEBOUNCE_DELAY,
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface SpaPublisherNameTrackerResult {
  success: boolean;
  message: string;
  publisherName?: string;
}

// ============================================================================
// MAIN SCRIPT FUNCTION
// ============================================================================

/**
 * Sets up debounced SPA publisher name tracking from a publisher name change event.
 *
 * @param testMode - Enable verbose logging for testing
 * @returns Result object with success status
 *
 * @example
 * ```typescript
 * // In AEP Launch Rule triggered by spaPublisherNameChanged custom event:
 * // Sets up debounced tracking for SPA publisher name
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
        return { success: false, message: 'Failed to set up SPA publisher name tracking' };
      },
    },
    (logger) => {
      const result = trackElement(PUBLISHER_TRACKER_CONFIG, logger, testMode);
      return {
        success: result.success,
        message: result.message,
        publisherName: result.value,
      };
    }
  );
}
