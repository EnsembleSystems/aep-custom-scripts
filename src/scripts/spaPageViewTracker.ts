/**
 * SPA Page View Tracker Script for AEP
 *
 * Handles spaPageTitleChanged events from the SPA title change monitor.
 * Debounces rapid title changes, deduplicates identical page views,
 * sets Launch variables, and triggers the spaPageViewCommit event.
 *
 * @version 1.1.0
 */

import { executeScript } from '../utils/script.js';
import { fireSatelliteEvent } from '../utils/satellite.js';
import { DEBOUNCE_DELAY, SPA_PAGE_VIEW_COMMIT_EVENT } from '../utils/spaPageViewConfig.js';
import { getPartnerState, setPartnerState } from '../utils/globalState.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Result returned by the script
 */
export interface SpaPageViewTrackerResult {
  /** Whether the debounce timer was set successfully */
  success: boolean;
  /** Message describing the result */
  message: string;
  /** Title from the event */
  title?: string;
  /** URL from the event */
  url?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const XDM_VARIABLE_NAME = 'XDMVariable';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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

/**
 * Processes the page view after debounce
 *
 * @param title - Page title from event
 * @param url - Page URL from event
 * @param referrer - Previous URL from event
 * @param logger - Logger instance for debugging
 * @param testMode - Whether in test mode
 */
function processPageView(
  title: string,
  url: string,
  referrer: string,
  logger: typeof console,
  testMode: boolean
): void {
  logger.log('Processing SPA page view after debounce');

  // Generate deduplication key
  const pageViewKey = `${url}|${title}`;
  logger.log('Generated page view key:', pageViewKey);

  // Check for duplicate
  if (pageViewKey === getPartnerState('lastPageViewKey')) {
    logger.log('Duplicate page view detected, skipping');
    return;
  }

  // Update deduplication key
  setPartnerState('lastPageViewKey', pageViewKey);
  logger.log('Updated deduplication key');

  // Write page view data directly to XDM Variable
  if (!window._satellite || typeof window._satellite.getVar !== 'function') {
    const message = testMode
      ? '_satellite.getVar() not available (normal in test mode)'
      : '_satellite.getVar() not available - ensure AEP Launch is loaded';
    logger.warn(message);
    return;
  }

  const xdmVar = window._satellite.getVar(XDM_VARIABLE_NAME);
  if (!xdmVar) {
    logger.error(`XDM Variable "${XDM_VARIABLE_NAME}" not found`);
    return;
  }

  // Set web.webPageDetails fields
  const webPageDetails = ensurePath(xdmVar, ['web', 'webPageDetails']);
  webPageDetails.name = title;
  webPageDetails.viewName = title;
  webPageDetails.URL = url;

  // Set web.webReferrer fields
  const webReferrer = ensurePath(xdmVar, ['web', 'webReferrer']);
  webReferrer.URL = referrer;

  logger.log('Set XDM Variable web.webPageDetails:', { name: title, viewName: title, URL: url });
  logger.log('Set XDM Variable web.webReferrer:', { URL: referrer });

  fireSatelliteEvent(SPA_PAGE_VIEW_COMMIT_EVENT, logger, testMode);
}

// ============================================================================
// MAIN SCRIPT FUNCTION
// ============================================================================

/**
 * Sets up debounced SPA page view tracking from a title change event
 *
 * This function:
 * 1. Reads title, url, and referrer from the custom event detail
 * 2. Clears any existing debounce timer
 * 3. Sets up new debounced execution (300ms)
 * 4. After delay, deduplicates and sets Launch variables
 * 5. Triggers spaPageViewCommit direct call event
 *
 * @param testMode - Enable verbose logging for testing
 * @returns Result object with success status
 *
 * @example
 * ```typescript
 * // In AEP Launch Rule triggered by spaPageTitleChanged custom event:
 * // Sets up debounced tracking for SPA page views
 * ```
 *
 * @example
 * ```typescript
 * // Enable debug mode in browser console:
 * localStorage.setItem('__aep_scripts_debug', 'true');
 * // Navigate in SPA - title changes trigger tracking after 300ms debounce
 * ```
 */
export function spaPageViewTrackerScript(testMode: boolean = false): SpaPageViewTrackerResult {
  return executeScript(
    {
      scriptName: 'SPA Page View Tracker',
      testMode,
      testHeaderTitle: 'SPA PAGE VIEW TRACKER - TEST MODE',
      onError: (error, logger) => {
        logger.error('Error setting up SPA page view tracking:', error);
        return {
          success: false,
          message: 'Failed to set up SPA page view tracking',
        };
      },
    },
    (logger) => {
      const { title } = document;
      const url = window.location.href;
      const referrer = getPartnerState('previousPageUrl') || document.referrer || '';

      logger.log(`Title: "${title}", URL: "${url}"`);

      // Clear any existing timer
      const existingTimer = getPartnerState('pageViewTimer');
      if (existingTimer) {
        clearTimeout(existingTimer);
        logger.log('Cleared existing page view timer');
      }

      logger.log(`Setting up debounced SPA page view tracking (${DEBOUNCE_DELAY}ms delay)`);

      // Set up debounced execution
      setPartnerState(
        'pageViewTimer',
        setTimeout(() => {
          processPageView(title, url, referrer, logger, testMode);
        }, DEBOUNCE_DELAY)
      );

      return {
        success: true,
        message: `SPA page view tracking timer set (${DEBOUNCE_DELAY}ms delay)`,
        title,
        url,
      };
    }
  );
}
