/**
 * Shared configuration for search tracking scripts
 *
 * Centralizes all search-related constants to ensure consistency
 * across all search tracking implementations.
 */

/**
 * URL parameter names that contain the search term (checked in priority order)
 * @constant
 */
export const TERM_PARAMS = ['term', 'q', 'keyword'] as const;

/**
 * URL parameters to ignore during filter extraction
 * These are typically tracking/analytics parameters that shouldn't be treated as search filters
 * @constant
 */
export const IGNORED_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'filters'] as const;

/**
 * Minimum required length for a valid search term
 * @constant
 */
export const MIN_TERM_LENGTH = 2;

/**
 * Debounce delay in milliseconds for dynamic search tracking
 * Prevents excessive tracking during rapid URL changes
 * @constant
 */
export const DEBOUNCE_DELAY = 300;

/**
 * Maximum length for search term to prevent abuse
 * @constant
 */
export const MAX_TERM_LENGTH = 500;

/**
 * Maximum number of filter parameters to process
 * @constant
 */
export const MAX_FILTER_PARAMS = 50;

/**
 * Maximum length for individual filter values
 * @constant
 */
export const MAX_FILTER_VALUE_LENGTH = 1000;

/**
 * Search source identifiers
 * @constant
 */
/**
 * Direct call event name for search tracking
 * @constant
 */
export const SEARCH_TRACKING_EVENT = 'searchCommit';

/**
 * Search source identifiers
 * @constant
 */
export const SEARCH_SOURCES = {
  ENTRY: 'entry',
  DYNAMIC: 'url',
} as const;

export type SearchSource = (typeof SEARCH_SOURCES)[keyof typeof SEARCH_SOURCES];

/**
 * Mapping from URL parameter names to XDM searchFilters field names
 * Only filters matching these keys will be mapped to XDM (unknown params are dropped)
 * @constant
 */
export const FILTER_TO_XDM_MAP: Record<string, string> = {
  'content-type': 'searchContentType',
  functionality: 'searchFunctionality',
  industries: 'searchIndustries',
  products: 'searchProducts',
  solutions: 'searchSolutions',
  topic: 'searchTopic',
} as const;
