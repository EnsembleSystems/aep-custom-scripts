/**
 * Search URL Monitor Script for AEP (v2 - Refactored)
 *
 * Hooks into the window.history API to track URL changes.
 * Refactored for improved security, performance, and maintainability.
 *
 * Improvements:
 * - Better error handling in hooks
 * - Safer event dispatching
 * - Memory leak prevention
 * - Comprehensive documentation
 * - Follows SRP - single responsibility of monitoring URL changes
 *
 * @version 2.0.0
 */

import { executeScript } from '../utils/script.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Result returned by the script
 */
export interface SearchUrlMonitorResult {
  /** Whether the hook was successfully installed */
  success: boolean;
  /** Message describing the result */
  message: string;
  /** Whether hooks were already installed */
  alreadyHooked: boolean;
}

/**
 * Extend Window interface for URL monitor state
 */
declare global {
  interface Window {
    /** Flag to prevent duplicate hook installation */
    __urlHooked?: boolean;
    _satellite?: {
      setVar: (name: string, value: unknown) => void;
      getVar: (name: string) => Record<string, unknown> | undefined;
      track: (eventName: string) => void;
    };
  }
}

/**
 * Custom event detail for URL changes
 */
interface UrlChangeDetail {
  /** The new URL */
  url: string;
  /** Timestamp of the change */
  timestamp: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Name of the custom event dispatched on URL changes */
const URL_CHANGE_EVENT = 'partnersSearchUrlChanged';

/** URL pattern required for initialization */
const URL_PATTERN = /.*\/digitalexperience\/home\/search\/.*/;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Dispatches URL change event safely
 *
 * @param url - The new URL
 */
function dispatchUrlChangeEvent(url: string): void {
  try {
    const detail: UrlChangeDetail = {
      url,
      timestamp: Date.now(),
    };

    const event = new CustomEvent(URL_CHANGE_EVENT, {
      detail,
      bubbles: true,
      cancelable: false,
    });

    window.dispatchEvent(event);
  } catch (error) {
    // Silently fail - don't break page functionality
    console.error('Failed to dispatch URL change event:', error);
  }
}

/**
 * Installs window.history API hooks
 *
 * @param logger - Logger instance for debugging
 */
function installHistoryHooks(logger: typeof console): void {
  // Store original methods
  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;

  // Hook pushState
  window.history.pushState = function pushStateHook(
    ...args: Parameters<typeof window.history.pushState>
  ): void {
    try {
      // Call original method
      originalPushState.apply(window.history, args);

      // Dispatch change event
      logger.log('pushState detected, dispatching URL change event');
      dispatchUrlChangeEvent(window.location.href);
    } catch (error) {
      // Restore original behavior on error
      logger.error('Error in pushState hook:', error);
      originalPushState.apply(window.history, args);
    }
  };

  // Hook replaceState
  window.history.replaceState = function replaceStateHook(
    ...args: Parameters<typeof window.history.replaceState>
  ): void {
    try {
      // Call original method
      originalReplaceState.apply(window.history, args);

      // Dispatch change event
      logger.log('replaceState detected, dispatching URL change event');
      dispatchUrlChangeEvent(window.location.href);
    } catch (error) {
      // Restore original behavior on error
      logger.error('Error in replaceState hook:', error);
      originalReplaceState.apply(window.history, args);
    }
  };

  // Listen for popstate (back/forward buttons)
  window.addEventListener(
    'popstate',
    () => {
      logger.log('popstate detected, dispatching URL change event');
      dispatchUrlChangeEvent(window.location.href);
    },
    { passive: true } // Performance optimization
  );

  logger.log('window.history API hooks installed successfully');
}

// ============================================================================
// MAIN SCRIPT FUNCTION
// ============================================================================

/**
 * Installs window.history API hooks to monitor URL changes
 *
 * This function:
 * 1. Checks if hooks are already installed
 * 2. Wraps window.history.pushState and window.history.replaceState
 * 3. Listens for popstate events
 * 4. Dispatches custom partnersSearchUrlChanged event
 *
 * @param testMode - Enable verbose logging for testing
 * @returns Result object with success status
 *
 * @example
 * ```typescript
 * // In AEP Launch Rule on Page Bottom:
 * // Installs hooks once per page load
 * ```
 *
 * @example
 * ```typescript
 * // Enable debug mode and listen for changes:
 * localStorage.setItem('__aep_scripts_debug', 'true');
 * window.addEventListener('partnersSearchUrlChanged', (e) => {
 *   console.log('URL changed:', e.detail.url);
 * });
 * ```
 */
export function searchUrlMonitorScript(testMode: boolean = false): SearchUrlMonitorResult {
  return executeScript(
    {
      scriptName: 'Search URL Monitor',
      testMode,
      testHeaderTitle: 'SEARCH URL MONITOR - TEST MODE',
      onError: (error, logger) => {
        logger.error('Error installing URL change monitor:', error);
        return {
          success: false,
          message: 'Failed to install URL change monitor',
          alreadyHooked: false,
        };
      },
    },
    (logger) => {
      // Only initialize on matching URLs
      if (!URL_PATTERN.test(window.location.pathname)) {
        logger.log('URL does not match search pattern, skipping initialization');
        return {
          success: false,
          message: 'URL does not match search pattern',
          alreadyHooked: false,
        };
      }

      // Check if already hooked
      if (window.__urlHooked) {
        logger.log('URL change hooks already installed');
        return {
          success: true,
          message: 'URL change hooks already installed',
          alreadyHooked: true,
        };
      }

      try {
        // Install hooks
        installHistoryHooks(logger);

        // Mark as hooked
        window.__urlHooked = true;
        logger.log('URL change hooks successfully installed');

        return {
          success: true,
          message: 'URL change hooks installed successfully',
          alreadyHooked: false,
        };
      } catch (error) {
        logger.error('Failed to install hooks:', error);
        return {
          success: false,
          message: 'Failed to install URL change hooks',
          alreadyHooked: false,
        };
      }
    }
  );
}
