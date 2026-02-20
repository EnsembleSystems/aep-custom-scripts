/**
 * SPA Page View Title Tracker Script for AEP
 *
 * Thin config wrapper around the generic `trackElement` utility.
 * Handles spaPageTitleChanged events from the SPA title change monitor.
 * Debounces rapid title changes, deduplicates identical page views,
 * and triggers the spaPageViewCommit direct call event.
 *
 * Note: Page name/viewName are set by the before-send callback from
 * document.title, not here — XDMVariable mutations don't persist to
 * the beacon payload.
 *
 * To track a different element, create a new script file and supply a
 * different ElementTrackerConfig — no logic changes required.
 *
 * @version 2.0.0
 */

import { executeScript } from '../../utils/script.js';
import { trackElement, type ElementTrackerConfig } from '../../utils/spaEventTracker.js';
import { DEBOUNCE_DELAY, SPA_PAGE_VIEW_COMMIT_EVENT } from '../../utils/spaPageViewConfig.js';

// ============================================================================
// TRACKER CONFIG
// ============================================================================

const PAGE_VIEW_TRACKER_CONFIG: ElementTrackerConfig = {
  stateKey: 'titleValue',
  timerKey: 'pageViewTimer',
  dedupKey: 'lastPageViewKey',
  commitEvent: SPA_PAGE_VIEW_COMMIT_EVENT,
  debounceDelay: DEBOUNCE_DELAY,
  // Dedup by url|title to distinguish navigations to the same title on diff pages
  generateDedupKey: (title) => `${window.location.href}|${title}`,
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface SpaPageViewTitleTrackerResult {
  success: boolean;
  message: string;
  title?: string;
}

// ============================================================================
// MAIN SCRIPT FUNCTION
// ============================================================================

/**
 * Sets up debounced SPA page view tracking from a title change event.
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
 * // Navigate in SPA — title changes trigger tracking after 300ms debounce
 * ```
 */
export function spaPageViewTitleTrackerScript(
  testMode: boolean = false
): SpaPageViewTitleTrackerResult {
  return executeScript<SpaPageViewTitleTrackerResult>(
    {
      scriptName: 'SPA Page View Tracker',
      testMode,
      testHeaderTitle: 'SPA PAGE VIEW TRACKER - TEST MODE',
      onError: (error, logger) => {
        logger.error('Error setting up SPA page view tracking:', error);
        return { success: false, message: 'Failed to set up SPA page view tracking' };
      },
    },
    (logger) => {
      const result = trackElement(PAGE_VIEW_TRACKER_CONFIG, logger, testMode);
      return {
        success: result.success,
        message: result.message,
        title: result.value,
      };
    }
  );
}
