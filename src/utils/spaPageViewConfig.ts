/**
 * Shared configuration for SPA page view tracking scripts
 *
 * Centralizes all SPA page view constants to ensure consistency
 * across spaPageViewTitleMonitor and spaPageViewTracker.
 */

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
 * Default/placeholder titles that indicate the SPA hasn't finished rendering.
 * Add or remove patterns as needed for your application.
 * @constant
 */
export const DEFAULT_TITLE_PATTERNS: readonly string[] = [
  'React Include',
  'React App',
  'Loading...',
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
