/**
 * Shared configuration for SPA publisher name tracking scripts
 *
 * Centralizes all SPA publisher constants, types, and helpers
 * to ensure consistency across spaPublisherNameMonitor and spaPublisherNameTracker.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Custom event detail for SPA publisher name detection
 * This is the shared contract between the publisher monitor (producer)
 * and the publisher name tracker (consumer).
 */
export interface PublisherNameDetail {
  /** The detected publisher name */
  publisherName: string;
  /** Timestamp of the detection */
  timestamp: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Custom event name dispatched when a publisher name is detected
 * @constant
 */
export const SPA_PUBLISHER_NAME_EVENT = 'spaPublisherNameChanged';

/**
 * Direct call event name for triggering the publisher name beacon
 * @constant
 */
export const SPA_PUBLISHER_NAME_COMMIT_EVENT = 'spaPublisherNameCommit';

/**
 * CSS selector for the publisher name display element
 * @constant
 */
export const PUBLISHER_ELEMENT_SELECTOR = '[data-testid="publisherName-display"]';

/**
 * Timeout in milliseconds before the observer disconnects if no publisher name is found
 * @constant
 */
export const PUBLISHER_MONITOR_TIMEOUT_MS = 10_000;

/**
 * Debounce delay in milliseconds for publisher name tracking
 * @constant
 */
export const DEBOUNCE_DELAY = 300;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Checks if a publisher name is non-empty and usable
 *
 * @param name - The publisher name to validate
 * @returns true if the name is valid
 */
export function isValidPublisherName(name: string): boolean {
  return name.trim().length > 0;
}
