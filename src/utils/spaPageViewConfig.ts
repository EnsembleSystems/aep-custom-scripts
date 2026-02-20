/**
 * Shared configuration for SPA page view tracking scripts
 *
 * Centralizes all SPA page view constants, types, and helpers
 * to ensure consistency across spaPageViewTitleMonitor and spaPageViewTitleTracker.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Custom event detail for SPA title changes
 * This is the shared contract between the title monitor (producer)
 * and the page view tracker (consumer).
 */
export interface TitleChangeDetail {
  /** The new page title */
  title: string;
  /** Current page URL */
  url: string;
  /** Previous page URL (referrer) */
  referrer: string;
  /** Timestamp of the change */
  timestamp: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Custom event name dispatched when the SPA title changes
 * @constant
 */
export const SPA_TITLE_CHANGE_EVENT = 'spaPageTitleChanged';

/**
 * Direct call event name for triggering the page view beacon
 * @constant
 */
export const SPA_PAGE_VIEW_COMMIT_EVENT = 'spaPageViewCommit';

/**
 * Debounce delay in milliseconds for page view tracking
 * Prevents excessive tracking during rapid title changes
 * @constant
 */
export const DEBOUNCE_DELAY = 300;

/**
 * Timeout in milliseconds before the title observer auto-disconnects
 * if no valid title has been detected.
 * @constant
 */
export const TITLE_MONITOR_TIMEOUT_MS = 10_000;

/**
 * Default/placeholder titles that indicate the SPA hasn't finished rendering.
 * Add or remove patterns as needed for your application.
 * @constant
 */
export const DEFAULT_TITLE_PATTERNS: readonly string[] = [
  'React Include',
  'React App',
  'Loading...',
  'Adobe Solution Partner Directory',
  '',
];

/**
 * Checks if a title matches any of the default/placeholder patterns
 *
 * @param title - The title to check
 * @returns true if the title is a default/placeholder
 */
export function isDefaultTitle(title: string): boolean {
  const trimmed = title.trim();
  return DEFAULT_TITLE_PATTERNS.some((pattern) => trimmed.toLowerCase() === pattern.toLowerCase());
}
