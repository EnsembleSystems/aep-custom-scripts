/**
 * Utility exports
 */

export * from './logger.js';
export * from './fetch.js';
export * from './cookie.js';
export * from './storage.js';
export * from './validation.js';
export * from './dom.js';
export * from './url.js';
export * from './transform.js';
// Remove the export * from './script.js' to prevent duplicate 'executeAsyncScript' export
// Only export executeAsyncScript explicitly from './script.js'
export { executeAsyncScript } from './script.js';
export * from './extraction.js';
export {
  default as logEventInfo,
  isValidUserEvent,
  isEventType,
  shouldProcessEventType,
} from './events.js';
export { default as setGlobalValue } from './globalState.js';
export {
  default as removeProperties,
  ensureNestedPath,
  setNestedValue,
  conditionalProperties,
  mergeNonNull,
} from './object.js';
