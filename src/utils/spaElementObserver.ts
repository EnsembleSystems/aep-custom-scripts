/**
 * Generic SPA Element Observer utility
 *
 * Provides a single, reusable `installElementObserver` function used by all
 * SPA monitor scripts. The caller supplies an ElementMonitorConfig that
 * describes which element to watch, where to store the value, and which
 * custom event to dispatch.
 *
 * Supports two observation modes:
 *   watchBody: false — observe an always-present element (e.g. <title>) for text changes
 *   watchBody: true  — observe document.body for a dynamically-rendered element to appear
 */

import type { Logger } from './logger.js';
import dispatchCustomEvent from './customEvent.js';
import { getPartnerStateByKey, setPartnerStateByKey } from './globalState.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Configuration for a generic SPA element observer.
 *
 * Each SPA monitor script defines one instance of this config.
 * Adding a new element to track = new script file with a new config block.
 */
export interface ElementMonitorConfig {
  /**
   * CSS selector for the element to observe.
   * Examples: 'title', '[data-testid="publisherName-display"]'
   */
  selector: string;

  /**
   * Key in window._adobePartners where the extracted string value is stored
   * after the element is found. The paired tracker script reads this key.
   */
  stateKey: string;

  /**
   * Key in window._adobePartners used as a boolean flag to prevent
   * duplicate observer installation when the rule fires more than once.
   */
  hookKey: string;

  /**
   * Key in window._adobePartners where the MutationObserver instance is
   * stored for possible cleanup / external access.
   */
  observerKey: string;

  /**
   * Custom event name dispatched on window when a valid value is detected.
   */
  eventName: string;

  /**
   * Observation strategy:
   *   false (default) — the element always exists in the DOM at install time
   *     (e.g. <title>). Observe the element itself with { childList: true }
   *     and watch for its text content to change to a valid value.
   *   true — the element may not yet exist at install time (React renders it
   *     later). Observe document.body with { childList: true, subtree: true }
   *     and wait for the element to appear.
   */
  watchBody?: boolean;

  /**
   * Extracts the string value from the matched element.
   * Defaults to (el) => el.textContent?.trim() ?? ''
   */
  extractValue?: (element: Element) => string;

  /**
   * Returns true if the extracted value is usable.
   * Defaults to (v) => v.length > 0
   * Override to filter placeholder values (e.g. default page titles).
   */
  isValidValue?: (value: string) => boolean;

  /**
   * Auto-disconnect the observer after this many milliseconds if no valid
   * value has been found. Useful for elements that may never appear.
   * Requires timeoutKey to be set.
   */
  timeout?: number;

  /**
   * Key in window._adobePartners where the auto-disconnect timeout ID is
   * stored. Required when timeout is set.
   */
  timeoutKey?: string;

  /**
   * Whether to disconnect the observer after the first valid value is emitted.
   * Default: true. Set to false to continue watching for subsequent changes.
   */
  disconnectAfterFirst?: boolean;

  /**
   * Optional callback invoked immediately after a valid value is emitted.
   * Use for element-specific side effects (e.g. updating `previousPageUrl`
   * for referrer tracking) without coupling that logic into the generic utility.
   */
  onEmit?: (value: string) => void;
}

/**
 * Unified custom event detail dispatched by all SPA element observers.
 */
export interface ElementChangeDetail {
  /** The extracted string value */
  value: string;
  /** Unix timestamp (ms) when the value was detected */
  timestamp: number;
}

/**
 * Base result interface shared by all SPA monitor scripts.
 * Extend this with a script-specific optional value field.
 */
export interface SpaMonitorResult {
  success: boolean;
  message: string;
  alreadyHooked: boolean;
}

/**
 * Result returned by installElementObserver
 */
export interface ObserverInstallResult {
  success: boolean;
  message: string;
  /** Set when the element was already present and dispatched immediately */
  immediateValue?: string;
}

// ============================================================================
// IMPLEMENTATION
// ============================================================================

const DEFAULT_EXTRACT = (el: Element): string => el.textContent?.trim() ?? '';
const DEFAULT_IS_VALID = (value: string): boolean => value.length > 0;

/**
 * Emits the custom event, stores the value in partner state, and runs onEmit.
 */
function emit(config: ElementMonitorConfig, value: string, logger: Logger): void {
  setPartnerStateByKey(config.stateKey, value);
  dispatchCustomEvent<ElementChangeDetail>(config.eventName, {
    value,
    timestamp: Date.now(),
  });
  logger.log(`Dispatched "${config.eventName}" with value: "${value}"`);
  if (config.onEmit) {
    config.onEmit(value);
  }
}

/**
 * Cancels the auto-disconnect timeout if one is active.
 */
function cancelTimeout(config: ElementMonitorConfig): void {
  if (config.timeoutKey) {
    const id = getPartnerStateByKey(config.timeoutKey);
    if (id !== undefined) {
      clearTimeout(id as ReturnType<typeof setTimeout>);
    }
  }
}

/**
 * Installs a MutationObserver based on the given config.
 *
 * Behavior:
 * 1. Check immediately — if a valid value is already present, emit and return.
 * 2. watchBody: false — observe the element itself for childList changes.
 * 3. watchBody: true  — observe document.body (childList + subtree) until the
 *    element appears.
 * 4. If disconnectAfterFirst (default true), disconnect after first valid emit.
 * 5. If timeout is set, auto-disconnect after N ms.
 *
 * @param config - ElementMonitorConfig for this observer
 * @param logger - Logger instance
 */
export function installElementObserver(
  config: ElementMonitorConfig,
  logger: Logger
): ObserverInstallResult {
  const extract = config.extractValue ?? DEFAULT_EXTRACT;
  const isValid = config.isValidValue ?? DEFAULT_IS_VALID;
  const watchBody = config.watchBody ?? false;
  const disconnectAfterFirst = config.disconnectAfterFirst ?? true;

  // ── Step 1: Check if element already has a valid value at install time ──────
  const existingEl = document.querySelector(config.selector);
  if (existingEl) {
    const existingValue = extract(existingEl);
    if (isValid(existingValue)) {
      logger.log(`Element "${config.selector}" already has valid value at install time`);
      emit(config, existingValue, logger);
      return { success: true, message: 'Dispatched immediately', immediateValue: existingValue };
    }
  } else if (!watchBody) {
    // Element must exist when watchBody is false (e.g. <title>)
    logger.warn(`Element "${config.selector}" not found in document`);
    return { success: false, message: `Element "${config.selector}" not found` };
  }

  // ── Step 2: Install MutationObserver ────────────────────────────────────────
  const observer = new MutationObserver(() => {
    const el = document.querySelector(config.selector);
    if (!el) return;

    const value = extract(el);
    if (!isValid(value)) {
      logger.log(`Value not yet valid: "${value}"`);
      return;
    }

    logger.log(`Valid value detected: "${value}"`);

    if (disconnectAfterFirst) {
      cancelTimeout(config);
      setPartnerStateByKey(config.observerKey, undefined);
      observer.disconnect();
      logger.log('Observer disconnected after first valid value');
    }

    emit(config, value, logger);
  });

  if (watchBody) {
    observer.observe(document.body, { childList: true, subtree: true });
    logger.log(`MutationObserver installed on document.body watching for "${config.selector}"`);
  } else {
    // Element exists but has no valid value yet — watch it for childList changes
    observer.observe(existingEl!, { childList: true });
    logger.log(`MutationObserver installed on "${config.selector}"`);
  }

  setPartnerStateByKey(config.observerKey, observer);

  // ── Step 3: Optional auto-disconnect timeout ─────────────────────────────────
  if (config.timeout && config.timeoutKey) {
    const timeoutId = setTimeout(() => {
      observer.disconnect();
      setPartnerStateByKey(config.observerKey, undefined);
      logger.warn(`Observer timed out after ${config.timeout}ms — "${config.selector}" not found`);
    }, config.timeout);
    setPartnerStateByKey(config.timeoutKey, timeoutId);
  } else if (config.timeout && !config.timeoutKey) {
    logger.warn('`timeout` is set but `timeoutKey` is missing — timeout will not be stored');
  }

  return { success: true, message: 'Observer installed' };
}
