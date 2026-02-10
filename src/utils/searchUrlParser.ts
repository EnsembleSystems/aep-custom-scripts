/**
 * Secure URL parser for search tracking
 *
 * Provides utilities for safely parsing and validating URL search parameters
 * with built-in security measures against XSS and injection attacks.
 */

import type { Logger } from './logger.js';
import {
  TERM_PARAMS,
  IGNORED_PARAMS,
  MIN_TERM_LENGTH,
  MAX_TERM_LENGTH,
  MAX_FILTER_PARAMS,
  MAX_FILTER_VALUE_LENGTH,
  type SearchSource,
} from './searchConfig.js';

/**
 * Search payload structure
 */
export interface SearchPayload {
  /** Sanitized search term */
  term: string;
  /** Filter parameters (key -> sanitized values array) */
  filters: Record<string, string[]>;
  /** Source identifier */
  source: SearchSource;
}

/**
 * Result of URL parsing operation
 */
export interface ParsedSearchUrl {
  /** Whether a valid search term was found */
  hasValidTerm: boolean;
  /** The sanitized search term (if found) */
  term: string | null;
  /** Extracted and sanitized filters */
  filters: Record<string, string[]>;
  /** The parameter name where term was found */
  termParam: string | null;
}

/**
 * Sanitizes a string to prevent XSS attacks
 * Removes potentially dangerous characters while preserving useful content
 *
 * @param value - The string to sanitize
 * @param maxLength - Maximum allowed length
 * @returns Sanitized string
 */
function sanitizeValue(value: string, maxLength: number): string {
  // Trim whitespace
  let sanitized = value.trim();

  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Remove control characters and zero-width characters
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\x00-\x1F\x7F-\x9F\u200B-\u200D\uFEFF]/g, '');

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ');

  return sanitized;
}

/**
 * Validates that a key is safe to use
 * Prevents prototype pollution and other injection attacks
 *
 * @param key - The key to validate
 * @returns Whether the key is safe
 */
function isSafeKey(key: string): boolean {
  // Prevent prototype pollution
  if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
    return false;
  }

  // Only allow alphanumeric, dash, underscore, and colon (for namespaced keys like "caas:topic")
  return /^[a-zA-Z0-9_:-]+$/.test(key);
}

/**
 * Parses URL search parameters and extracts search term
 *
 * @param url - The URL to parse (defaults to current window location)
 * @param logger - Optional logger for debugging
 * @returns Parsed search data
 */
export function parseSearchUrl(url?: string, logger?: Logger): ParsedSearchUrl {
  const searchUrl = url || window.location.href;

  try {
    const urlObj = new URL(searchUrl, window.location.origin);
    const params = urlObj.searchParams;

    // Extract and sanitize search term
    let term: string | null = null;
    let termParam: string | null = null;

    const termParams = ['term', 'q', 'keyword'];
    termParams.some((param) => {
      const value = params.get(param);
      if (value) {
        const sanitized = sanitizeValue(value, MAX_TERM_LENGTH);
        if (sanitized.length >= MIN_TERM_LENGTH) {
          term = sanitized;
          termParam = param;
          logger?.log(`Found term from '${param}' param:`, term);
          return true; // break equivalent
        }
      }
      return false;
    });

    // Extract and sanitize filters
    const filters: Record<string, string[]> = {};
    let filterCount = 0;

    params.forEach((value, key) => {
      // Skip if we've hit the max filter limit
      if (filterCount >= MAX_FILTER_PARAMS) {
        logger?.warn(`Max filter limit (${MAX_FILTER_PARAMS}) reached, skipping remaining params`);
        return;
      }

      // Skip term params and ignored params
      const termParamsList: readonly string[] = TERM_PARAMS;
      const ignoredParamsList: readonly string[] = IGNORED_PARAMS;
      if (termParamsList.includes(key) || ignoredParamsList.includes(key)) {
        return;
      }

      // Validate key safety
      if (!isSafeKey(key)) {
        logger?.warn(`Skipping unsafe key: ${key}`);
        return;
      }

      // Split comma-delimited values and sanitize each
      const values = value
        .split(',')
        .map((v) => sanitizeValue(v, MAX_FILTER_VALUE_LENGTH))
        .filter((v) => v.length > 0);

      if (values.length > 0) {
        filters[key] = values;
        filterCount += 1;
      }
    });

    const hasValidTerm = term !== null && (term as string).length >= MIN_TERM_LENGTH;

    return {
      hasValidTerm,
      term,
      filters,
      termParam,
    };
  } catch (error) {
    logger?.error('Error parsing URL:', error);
    return {
      hasValidTerm: false,
      term: null,
      filters: {},
      termParam: null,
    };
  }
}

/**
 * Creates a search payload from parsed URL data
 *
 * @param parsed - Parsed search URL data
 * @param source - The source identifier
 * @returns Search payload or null if no valid term
 */
export function createSearchPayload(
  parsed: ParsedSearchUrl,
  source: SearchSource
): SearchPayload | null {
  if (!parsed.hasValidTerm || !parsed.term) {
    return null;
  }

  return {
    term: parsed.term,
    filters: parsed.filters,
    source,
  };
}

/**
 * Generates a deduplication key from URL parameters
 * Used to prevent tracking duplicate searches
 *
 * @param url - The URL to generate key from (defaults to current window location)
 * @returns Deduplication key
 */
export function generateSearchKey(url?: string): string {
  try {
    const searchUrl = url || window.location.href;
    const urlObj = new URL(searchUrl, window.location.origin);
    const params = urlObj.searchParams;

    // Remove ignored params for deduplication
    IGNORED_PARAMS.forEach((param) => {
      params.delete(param);
    });

    // Sort params for consistent key generation
    const entries: Array<[string, string]> = [];
    params.forEach((value, key) => {
      entries.push([key, value]);
    });
    const sorted = entries.sort(([a], [b]) => a.localeCompare(b));

    return sorted.map(([key, value]) => `${key}=${value}`).join('&');
  } catch {
    return '';
  }
}
