/**
 * Generic SPA Event Tracker utility
 *
 * Provides a single, reusable `trackElement` function used by all SPA tracker
 * scripts. The caller supplies an ElementTrackerConfig that describes which
 * partner state key to read, how to debounce/deduplicate, and which
 * _satellite.track() event to fire.
 */

import type { Logger } from './logger.js';
import { fireSatelliteEvent } from './satellite.js';
import { getPartnerStateByKey, setPartnerStateByKey, isDuplicateByKey } from './globalState.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Configuration for a generic SPA element tracker.
 *
 * Each SPA tracker script defines one instance of this config.
 * Adding a new tracker = new script file with a new config block.
 */
export interface ElementTrackerConfig {
  /**
   * Key in window._adobePartners where the monitor stored the detected value.
   * The tracker reads this key to get the current value to process.
   */
  stateKey: string;

  /**
   * Key in window._adobePartners where the active debounce timer ID is stored.
   * Used to cancel/restart the timer on rapid events.
   */
  timerKey: string;

  /**
   * Key in window._adobePartners where the last successfully processed value
   * is stored. Used to skip duplicate firings.
   */
  dedupKey: string;

  /**
   * The _satellite.track() direct call event name fired after debounce + dedup.
   */
  commitEvent: string;

  /**
   * Debounce delay in milliseconds. Default: 300.
   */
  debounceDelay?: number;

  /**
   * Optional function to derive the deduplication key from the raw value.
   * Defaults to identity: (value) => value
   *
   * Use when deduplication should consider more than just the value itself.
   * Example for page views: () => `${window.location.href}|${document.title}`
   */
  generateDedupKey?: (value: string) => string;
}

/**
 * Result returned by trackElement (reflects timer scheduling, not the eventual fire)
 */
export interface TrackElementResult {
  success: boolean;
  message: string;
  value?: string;
}

// ============================================================================
// IMPLEMENTATION
// ============================================================================

/**
 * Executes the debounce → dedup → fire tracking flow.
 *
 * Steps:
 * 1. Read value from window._adobePartners[config.stateKey].
 * 2. If no value found, return failure.
 * 3. Clear any existing debounce timer at config.timerKey.
 * 4. Set a new timer (config.debounceDelay ms, default 300).
 * 5. After timer fires: generate dedup key, check isDuplicateByKey, fire commitEvent.
 *
 * @param config - ElementTrackerConfig for this tracker
 * @param logger - Logger instance
 * @param testMode - Whether in test mode (controls _satellite mock behavior)
 * @returns TrackElementResult — synchronous, reflects scheduling success
 */
export function trackElement(
  config: ElementTrackerConfig,
  logger: Logger,
  testMode: boolean
): TrackElementResult {
  const delay = config.debounceDelay ?? 300;

  // ── Step 1: Read the value from partner state ───────────────────────────────
  const value = getPartnerStateByKey(config.stateKey) as string | undefined;
  if (!value) {
    logger.warn(`No value found in partner state at key "${config.stateKey}"`);
    return { success: false, message: `No value at state key "${config.stateKey}"` };
  }

  logger.log(`Value: "${value}"`);

  // ── Step 2: Clear any existing debounce timer ───────────────────────────────
  const existingTimer = getPartnerStateByKey(config.timerKey);
  if (existingTimer !== undefined) {
    clearTimeout(existingTimer as ReturnType<typeof setTimeout>);
    logger.log('Cleared existing debounce timer');
  }

  // ── Step 3: Set new debounce timer ──────────────────────────────────────────
  logger.log(`Setting up debounced tracking (${delay}ms delay)`);

  setPartnerStateByKey(
    config.timerKey,
    setTimeout(() => {
      logger.log('Processing after debounce');

      const dedupKey = config.generateDedupKey ? config.generateDedupKey(value) : value;

      if (isDuplicateByKey(dedupKey, config.dedupKey, logger)) {
        return;
      }

      fireSatelliteEvent(config.commitEvent, logger, testMode);
    }, delay)
  );

  return {
    success: true,
    message: `Tracking timer set (${delay}ms delay)`,
    value,
  };
}
