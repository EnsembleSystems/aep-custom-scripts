/**
 * SPA Publisher Name Monitor Script for AEP
 *
 * Thin config wrapper around the generic `installElementObserver` utility.
 * Observes document.body for the publisher name element rendered by a React SPA.
 * Dispatches a custom event when a valid publisher name is detected.
 * Auto-disconnects after finding the name or after a 10-second timeout.
 *
 * To track a different element, create a new script file and supply a
 * different ElementMonitorConfig — no logic changes required.
 *
 * @version 2.0.0
 */

import { executeScript } from '../../utils/script.js';
import {
  installElementObserver,
  type ElementMonitorConfig,
  type SpaMonitorResult,
} from '../../utils/spaElementObserver.js';
import {
  SPA_PUBLISHER_NAME_EVENT,
  PUBLISHER_ELEMENT_SELECTOR,
  PUBLISHER_MONITOR_TIMEOUT_MS,
  isValidPublisherName,
} from '../../utils/spaPublisherConfig.js';
import { getPartnerStateByKey, setPartnerStateByKey } from '../../utils/globalState.js';

// ============================================================================
// ELEMENT CONFIG
// ============================================================================

const PUBLISHER_MONITOR_CONFIG: ElementMonitorConfig = {
  selector: PUBLISHER_ELEMENT_SELECTOR,
  stateKey: 'publisherName',
  hookKey: 'publisherMonitorHooked',
  observerKey: 'publisherMonitorObserver',
  timeoutKey: 'publisherMonitorTimeout',
  eventName: SPA_PUBLISHER_NAME_EVENT,
  watchBody: true,
  isValidValue: isValidPublisherName,
  timeout: PUBLISHER_MONITOR_TIMEOUT_MS,
  disconnectAfterFirst: true,
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface SpaPublisherNameMonitorResult extends SpaMonitorResult {
  publisherName?: string;
}

// ============================================================================
// MAIN SCRIPT FUNCTION
// ============================================================================

/**
 * Installs a MutationObserver on document.body to monitor for the publisher
 * name element rendered by a React SPA.
 *
 * @param testMode - Enable verbose logging for testing
 * @returns Result object with success status
 *
 * @example
 * ```typescript
 * // Enable debug mode and listen for changes:
 * localStorage.setItem('__aep_scripts_debug', 'true');
 * window.addEventListener('spaPublisherNameChanged', (e) => {
 *   console.log('Publisher name:', e.detail.value);
 * });
 * ```
 */
export function spaPublisherNameMonitorScript(
  testMode: boolean = false
): SpaPublisherNameMonitorResult {
  return executeScript<SpaPublisherNameMonitorResult>(
    {
      scriptName: 'SPA Publisher Name Monitor',
      testMode,
      testHeaderTitle: 'SPA PUBLISHER NAME MONITOR - TEST MODE',
      onError: (error, logger) => {
        logger.error('Error installing publisher name monitor:', error);
        return {
          success: false,
          message: 'Failed to install publisher name monitor',
          alreadyHooked: false,
        };
      },
    },
    (logger) => {
      if (getPartnerStateByKey(PUBLISHER_MONITOR_CONFIG.hookKey)) {
        logger.log('Publisher name observer already installed');
        return {
          success: true,
          message: 'Publisher name observer already installed',
          alreadyHooked: true,
        };
      }

      const result = installElementObserver(PUBLISHER_MONITOR_CONFIG, logger);

      if (result.success) {
        setPartnerStateByKey(PUBLISHER_MONITOR_CONFIG.hookKey, true);
      }

      return {
        success: result.success,
        message: result.message,
        alreadyHooked: false,
        publisherName: result.immediateValue,
      };
    }
  );
}
