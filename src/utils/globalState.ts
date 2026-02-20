/**
 * Global state management utilities for window object
 * Provides safe access and manipulation of global variables
 */

import type { Logger } from './logger.js';
import { ensureNestedPath } from './object.js';

/**
 * Ensures a nested path exists in an object, creating intermediate objects as needed.
 * Delegates to ensureNestedPath from object.ts.
 * @param obj - Root object
 * @param path - Array of property names or dot-notation string
 * @returns The object at the end of the path
 */
export const ensurePath = ensureNestedPath;

/**
 * Sets a value at a nested path in an object, creating intermediate objects as needed
 * @param obj - Root object
 * @param path - Array of property names or dot-notation string
 * @param value - Value to set
 * @param logger - Optional logger for debugging
 *
 * @example
 * setGlobalValue(window, ['_adobePartners', 'eventData', 'response'], data)
 * setGlobalValue(window, '_adobePartners.eventData.response', data)
 */
/**
 * Partner namespace type for convenience
 */
type PartnerState = NonNullable<Window['_adobePartners']>;

/**
 * Ensures window._adobePartners exists and returns it.
 */
function ensurePartnerNamespace(): PartnerState {
  if (!window._adobePartners) {
    window._adobePartners = {};
  }
  return window._adobePartners;
}

/**
 * Reads a value from the _adobePartners namespace on window.
 * Returns undefined if the namespace or key doesn't exist.
 */
export function getPartnerState<K extends keyof PartnerState>(key: K): PartnerState[K] {
  return window._adobePartners?.[key];
}

/**
 * Writes a value to the _adobePartners namespace on window.
 * Initializes the namespace if it doesn't exist.
 */
export function setPartnerState<K extends keyof PartnerState>(
  key: K,
  value: PartnerState[K]
): void {
  const ns = ensurePartnerNamespace();
  ns[key] = value;
}

/**
 * String-valued keys in PartnerState (for deduplication checks)
 */
type StringPartnerKeys = NonNullable<
  {
    [K in keyof PartnerState]: PartnerState[K] extends string | undefined ? K : never;
  }[keyof PartnerState]
>;

/**
 * Checks if a key matches the last-seen value stored in partner state.
 * If not a duplicate, stores the new key for future checks.
 *
 * @param key - Current deduplication key
 * @param stateKey - Partner state key to check/update (e.g. 'lastSearchKey')
 * @param logger - Logger instance
 * @returns true if duplicate (caller should skip), false if new
 */
export function isDuplicate(
  key: string,
  stateKey: StringPartnerKeys,
  logger: { log(message: string, data?: unknown): void }
): boolean {
  if (key === getPartnerState(stateKey)) {
    logger.log('Duplicate detected, skipping');
    return true;
  }
  setPartnerState(stateKey, key);
  logger.log('Updated deduplication key');
  return false;
}

// ============================================================================
// DYNAMIC KEY HELPERS (for config-driven generic utilities)
// ============================================================================

/**
 * Reads an arbitrary (dynamically-named) key from window._adobePartners.
 * Use this when the key name is supplied at runtime (e.g. from ElementMonitorConfig).
 * Returns undefined if the namespace or key does not exist.
 */
export function getPartnerStateByKey(key: string): unknown {
  return (window._adobePartners as Record<string, unknown> | undefined)?.[key];
}

/**
 * Writes an arbitrary (dynamically-named) key to window._adobePartners.
 * Initializes the namespace if it doesn't exist.
 */
export function setPartnerStateByKey(key: string, value: unknown): void {
  const ns = ensurePartnerNamespace();
  (ns as Record<string, unknown>)[key] = value;
}

/**
 * Checks if `value` matches the string stored at `window._adobePartners[stateKey]`.
 * Works with dynamically-named state keys. If not a duplicate, stores the new value.
 *
 * @param value - The deduplication key to check
 * @param stateKey - Partner state key to check/update (any string)
 * @param logger - Logger instance
 * @returns true if duplicate (caller should skip), false if new
 */
export function isDuplicateByKey(
  value: string,
  stateKey: string,
  logger: { log(message: string, data?: unknown): void }
): boolean {
  if (value === getPartnerStateByKey(stateKey)) {
    logger.log('Duplicate detected, skipping');
    return true;
  }
  setPartnerStateByKey(stateKey, value);
  logger.log('Updated deduplication key');
  return false;
}

// ============================================================================

export default function setGlobalValue(
  obj: Record<string, unknown>,
  path: string[] | string,
  value: unknown,
  logger?: Logger
): void {
  const pathArray = Array.isArray(path) ? path : path.split('.');
  const lastKey = pathArray.pop();

  if (!lastKey) {
    if (logger) {
      logger.error('Invalid path: empty path provided');
    }
    return;
  }

  // Ensure all intermediate paths exist
  const target = ensurePath(obj, pathArray);

  // Set the value
  target[lastKey] = value;

  if (logger) {
    logger.log(`Set global value at ${pathArray.concat(lastKey).join('.')}`, value);
  }
}
