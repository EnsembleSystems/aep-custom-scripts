/**
 * SPA Page View Tracker Script for AEP
 *
 * Handles spaPageTitleChanged events from the SPA title change monitor.
 * Debounces rapid title changes, deduplicates identical page views,
 * and triggers the spaPageViewCommit event.
 *
 * Note: Page name/viewName are set by the before-send callback from
 * document.title, not here — XDMVariable mutations don't persist to
 * the beacon payload.
 *
 * @version 1.1.0
 */

import { executeScript } from '../utils/script.js';
import type { Logger } from '../utils/logger.js';
import { fireSatelliteEvent } from '../utils/satellite.js';
import { DEBOUNCE_DELAY, SPA_PAGE_VIEW_COMMIT_EVENT } from '../utils/spaPageViewConfig.js';
import { getPartnerState, isDuplicate, setPartnerState } from '../utils/globalState.js';

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
// HELPER FUNCTIONS
// ============================================================================

/**
 * Processes the page view after debounce
 *
 * @param title - Page title from event
 * @param url - Page URL from event
 * @param logger - Logger instance for debugging
 * @param testMode - Whether in test mode
 */
function processPageView(title: string, url: string, logger: Logger, testMode: boolean): void {
  logger.log('Processing SPA page view after debounce');

  // Deduplicate by url + title
  const pageViewKey = `${url}|${title}`;
  logger.log('Generated page view key:', pageViewKey);

  if (isDuplicate(pageViewKey, 'lastPageViewKey', logger)) {
    return;
  }

  // Page name/viewName are set by the before-send callback from document.title.
  // This script only needs to deduplicate and fire the commit event.
  fireSatelliteEvent(SPA_PAGE_VIEW_COMMIT_EVENT, logger, testMode);
}

// ============================================================================
// MAIN SCRIPT FUNCTION
// ============================================================================

/**
 * Sets up debounced SPA page view tracking from a title change event
 *
 * This function:
 * 1. Reads title and url from document
 * 2. Clears any existing debounce timer
 * 3. Sets up new debounced execution (300ms)
 * 4. After delay, deduplicates and triggers spaPageViewCommit direct call event
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
  return executeScript<SpaPageViewTrackerResult>(
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
          processPageView(title, url, logger, testMode);
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
