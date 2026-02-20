/**
 * SPA Page View Title Monitor Script for AEP
 *
 * Thin config wrapper around the generic `installElementObserver` utility.
 * Observes the <title> element to detect when a React SPA updates the page
 * title after initial load. Dispatches a custom event when a valid
 * (non-default) title is detected.
 *
 * To track a different element, create a new script file and supply a
 * different ElementMonitorConfig — no logic changes required.
 *
 * @version 2.0.0
 */

import { executeScript } from '../utils/script.js';
import {
  installElementObserver,
  type ElementMonitorConfig,
  type SpaMonitorResult,
} from '../utils/spaElementObserver.js';
import {
  SPA_TITLE_CHANGE_EVENT,
  isDefaultTitle,
  TITLE_MONITOR_TIMEOUT_MS,
} from '../utils/spaPageViewConfig.js';
import {
  getPartnerStateByKey,
  setPartnerStateByKey,
  setPartnerState,
} from '../utils/globalState.js';

// ============================================================================
// ELEMENT CONFIG
// ============================================================================

const TITLE_MONITOR_CONFIG: ElementMonitorConfig = {
  selector: 'title',
  stateKey: 'titleValue',
  hookKey: 'titleMonitorHooked',
  observerKey: 'titleMonitorObserver',
  timeoutKey: 'titleMonitorTimeout',
  eventName: SPA_TITLE_CHANGE_EVENT,
  timeout: TITLE_MONITOR_TIMEOUT_MS,
  watchBody: false,
  // <title> content is read via document.title rather than textContent
  extractValue: () => document.title,
  isValidValue: (title) => !isDefaultTitle(title),
  disconnectAfterFirst: true,
  // Track the current URL as the previous page URL for SPA referrer tracking
  onEmit: () => setPartnerState('previousPageUrl', window.location.href),
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface SpaPageViewTitleMonitorResult extends SpaMonitorResult {
  currentTitle?: string;
}

// ============================================================================
// MAIN SCRIPT FUNCTION
// ============================================================================

/**
 * Installs a MutationObserver on the <title> element to monitor SPA title changes.
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
 * window.addEventListener('spaPageTitleChanged', (e) => {
 *   console.log('Title changed:', e.detail.value);
 * });
 * ```
 */
export function spaPageViewTitleMonitorScript(
  testMode: boolean = false
): SpaPageViewTitleMonitorResult {
  return executeScript<SpaPageViewTitleMonitorResult>(
    {
      scriptName: 'SPA Page View Title Monitor',
      testMode,
      testHeaderTitle: 'SPA PAGE VIEW TITLE MONITOR - TEST MODE',
      onError: (error, logger) => {
        logger.error('Error installing title change monitor:', error);
        return {
          success: false,
          message: 'Failed to install title change monitor',
          alreadyHooked: false,
        };
      },
    },
    (logger) => {
      if (getPartnerStateByKey(TITLE_MONITOR_CONFIG.hookKey)) {
        logger.log('Title change observer already installed');
        return {
          success: true,
          message: 'Title change observer already installed',
          alreadyHooked: true,
          currentTitle: document.title,
        };
      }

      const result = installElementObserver(TITLE_MONITOR_CONFIG, logger);

      if (result.success) {
        setPartnerStateByKey(TITLE_MONITOR_CONFIG.hookKey, true);
      }

      return {
        success: result.success,
        message: result.message,
        alreadyHooked: false,
        currentTitle: result.immediateValue ?? document.title,
      };
    }
  );
}
