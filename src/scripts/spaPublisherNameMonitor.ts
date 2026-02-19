/**
 * SPA Publisher Name Monitor Script for AEP
 *
 * Installs a MutationObserver on document.body to detect when a React SPA
 * renders the publisher name element ([data-testid="publisherName-display"]).
 * Dispatches a custom event when a valid publisher name is detected.
 * Disconnects automatically after finding the name or after a 10-second timeout.
 *
 * @version 1.0.0
 */

import { executeScript } from '../utils/script.js';
import type { Logger } from '../utils/logger.js';
import dispatchCustomEvent from '../utils/customEvent.js';
import {
  SPA_PUBLISHER_NAME_EVENT,
  PUBLISHER_ELEMENT_SELECTOR,
  PUBLISHER_MONITOR_TIMEOUT_MS,
  isValidPublisherName,
} from '../utils/spaPublisherConfig.js';
import type { PublisherNameDetail } from '../utils/spaPublisherConfig.js';
import { setPartnerState, getPartnerState } from '../utils/globalState.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Result returned by the script
 */
export interface SpaPublisherNameMonitorResult {
  /** Whether the observer was successfully installed */
  success: boolean;
  /** Message describing the result */
  message: string;
  /** Whether observer was already installed */
  alreadyHooked: boolean;
  /** Publisher name if already available at install time */
  publisherName?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Dispatches the publisher name event and stores the name in partner state.
 */
function emitPublisherName(name: string, logger: Logger): void {
  setPartnerState('publisherName', name);
  dispatchCustomEvent<PublisherNameDetail>(SPA_PUBLISHER_NAME_EVENT, {
    publisherName: name,
    timestamp: Date.now(),
  });
  logger.log(`Dispatched "${SPA_PUBLISHER_NAME_EVENT}" with name: "${name}"`);
}

/**
 * Installs a MutationObserver on document.body to watch for the publisher
 * name element. Disconnects once the name is found or after the timeout.
 *
 * @param logger - Logger instance for debugging
 */
function installPublisherNameObserver(logger: Logger): void {
  // If the element is already rendered at install time, emit immediately
  const existingElement = document.querySelector<HTMLElement>(PUBLISHER_ELEMENT_SELECTOR);
  const existingName = (existingElement?.textContent ?? '').trim();

  if (isValidPublisherName(existingName)) {
    logger.log(`Publisher name already available at install time: "${existingName}"`);
    emitPublisherName(existingName, logger);
    return;
  }

  const observer = new MutationObserver(() => {
    const element = document.querySelector<HTMLElement>(PUBLISHER_ELEMENT_SELECTOR);
    if (!element) return;

    const name = (element.textContent ?? '').trim();
    if (!isValidPublisherName(name)) return;

    logger.log(`Publisher name element found: "${name}" — dispatching event and disconnecting`);

    // Cancel the timeout and clean up
    clearTimeout(getPartnerState('publisherMonitorTimeout'));
    setPartnerState('publisherMonitorObserver', undefined);
    observer.disconnect();

    emitPublisherName(name, logger);
  });

  observer.observe(document.body, { childList: true, subtree: true });
  setPartnerState('publisherMonitorObserver', observer);

  logger.log(
    `MutationObserver installed on document.body watching for "${PUBLISHER_ELEMENT_SELECTOR}"`
  );

  // Disconnect automatically after PUBLISHER_MONITOR_TIMEOUT_MS
  const timeoutId = setTimeout(() => {
    observer.disconnect();
    setPartnerState('publisherMonitorObserver', undefined);
    logger.warn(
      `Publisher name observer timed out after ${PUBLISHER_MONITOR_TIMEOUT_MS}ms — element not found`
    );
  }, PUBLISHER_MONITOR_TIMEOUT_MS);

  setPartnerState('publisherMonitorTimeout', timeoutId);
}

// ============================================================================
// MAIN SCRIPT FUNCTION
// ============================================================================

/**
 * Installs a MutationObserver on document.body to monitor for the publisher
 * name element rendered by a React SPA.
 *
 * This function:
 * 1. Checks if observer is already installed
 * 2. If publisher element is already in the DOM, dispatches immediately
 * 3. Otherwise, installs MutationObserver to wait for the element
 * 4. Disconnects observer after first valid publisher name OR after 10 seconds
 * 5. Dispatches spaPublisherNameChanged custom event with the publisher name
 *
 * @param testMode - Enable verbose logging for testing
 * @returns Result object with success status
 *
 * @example
 * ```typescript
 * // In AEP Launch Rule on Page Bottom:
 * // Installs observer once per page load
 * ```
 *
 * @example
 * ```typescript
 * // Enable debug mode and listen for changes:
 * localStorage.setItem('__aep_scripts_debug', 'true');
 * window.addEventListener('spaPublisherNameChanged', (e) => {
 *   console.log('Publisher name:', e.detail.publisherName);
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
      // Check if already hooked
      if (getPartnerState('publisherMonitorHooked')) {
        logger.log('Publisher name observer already installed');
        return {
          success: true,
          message: 'Publisher name observer already installed',
          alreadyHooked: true,
        };
      }

      try {
        installPublisherNameObserver(logger);

        // Mark as hooked so subsequent calls are no-ops
        setPartnerState('publisherMonitorHooked', true);
        logger.log('Publisher name observer successfully installed');

        return {
          success: true,
          message: 'Publisher name observer installed successfully',
          alreadyHooked: false,
        };
      } catch (error) {
        logger.error('Failed to install observer:', error);
        return {
          success: false,
          message: 'Failed to install publisher name observer',
          alreadyHooked: false,
        };
      }
    }
  );
}
