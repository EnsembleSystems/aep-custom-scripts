/**
 * Global state management utilities for window object
 * Provides safe access and manipulation of global variables
 */

import type { Logger } from './logger.js';

/**
 * Ensures a nested path exists in an object, creating intermediate objects as needed
 * @param obj - Root object
 * @param path - Array of property names representing the path
 * @returns The object at the end of the path
 */
export function ensurePath(obj: Record<string, unknown>, path: string[]): Record<string, unknown> {
  let current = obj;

  path.forEach((key) => {
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  });

  return current;
}

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
