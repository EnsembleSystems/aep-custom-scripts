/**
 * SPA Page View Title Monitor Script for AEP
 *
 * Installs a MutationObserver on the <title> element to detect
 * when a React SPA updates the page title after initial load.
 * Dispatches a custom event when a valid (non-default) title is detected.
 *
 * @version 1.1.0
 */

import { executeScript } from '../utils/script.js';
import dispatchCustomEvent from '../utils/customEvent.js';
import { SPA_TITLE_CHANGE_EVENT, isDefaultTitle } from '../utils/spaPageViewConfig.js';
import { setPartnerState, getPartnerState } from '../utils/globalState.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Result returned by the script
 */
export interface SpaPageViewTitleMonitorResult {
  /** Whether the observer was successfully installed */
  success: boolean;
  /** Message describing the result */
  message: string;
  /** Whether observer was already installed */
  alreadyHooked: boolean;
  /** Current title at install time */
  currentTitle?: string;
}

/**
 * Custom event detail for title changes
 */
export interface TitleChangeDetail {
  /** The new page title */
  title: string;
  /** Current page URL */
  url: string;
  /** Previous page URL (referrer) */
  referrer: string;
  /** Timestamp of the change */
  timestamp: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Installs MutationObserver on the <title> element
 *
 * @param logger - Logger instance for debugging
 */
function installTitleObserver(logger: typeof console): void {
  let previousUrl = document.referrer || '';

  const titleElement = document.querySelector('title');

  if (!titleElement) {
    logger.warn('No <title> element found in document');
    return;
  }

  const observer = new MutationObserver(() => {
    const currentTitle = document.title;

    if (isDefaultTitle(currentTitle)) {
      logger.log(`Title is still a default/placeholder: "${currentTitle}"`);
      return;
    }

    const currentUrl = window.location.href;

    logger.log(`Title changed to: "${currentTitle}"`);

    dispatchCustomEvent<TitleChangeDetail>(SPA_TITLE_CHANGE_EVENT, {
      title: currentTitle,
      url: currentUrl,
      referrer: previousUrl,
      timestamp: Date.now(),
    });

    previousUrl = currentUrl;
  });

  observer.observe(titleElement, { childList: true });

  // Store observer for cleanup access
  setPartnerState('titleMonitorObserver', observer);

  logger.log('MutationObserver installed on <title> element');

  // If the title is already set to a valid value, dispatch immediately
  const currentTitle = document.title;
  if (!isDefaultTitle(currentTitle)) {
    logger.log(`Title already set at install time: "${currentTitle}", dispatching immediately`);
    dispatchCustomEvent<TitleChangeDetail>(SPA_TITLE_CHANGE_EVENT, {
      title: currentTitle,
      url: window.location.href,
      referrer: previousUrl,
      timestamp: Date.now(),
    });
  }
}

// ============================================================================
// MAIN SCRIPT FUNCTION
// ============================================================================

/**
 * Installs a MutationObserver on the <title> element to monitor SPA title changes
 *
 * This function:
 * 1. Checks if observer is already installed
 * 2. Installs MutationObserver on <title> element
 * 3. Dispatches spaPageTitleChanged custom event when title changes
 * 4. Filters out default/placeholder titles
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
 *   console.log('Title changed:', e.detail.title);
 * });
 * ```
 */
export function spaPageViewTitleMonitorScript(
  testMode: boolean = false
): SpaPageViewTitleMonitorResult {
  return executeScript(
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
      // Check if already hooked
      if (getPartnerState('titleMonitorHooked')) {
        logger.log('Title change observer already installed');
        return {
          success: true,
          message: 'Title change observer already installed',
          alreadyHooked: true,
          currentTitle: document.title,
        };
      }

      try {
        // Install observer
        installTitleObserver(logger);

        // Mark as hooked
        setPartnerState('titleMonitorHooked', true);
        logger.log('Title change observer successfully installed');

        return {
          success: true,
          message: 'Title change observer installed successfully',
          alreadyHooked: false,
          currentTitle: document.title,
        };
      } catch (error) {
        logger.error('Failed to install observer:', error);
        return {
          success: false,
          message: 'Failed to install title change observer',
          alreadyHooked: false,
        };
      }
    }
  );
}
