/**
 * Data extraction pipeline utilities for consistent extraction patterns
 */

import type { Logger } from './logger.js';

/**
 * Configuration for data extraction pipeline
 */
export interface ExtractionConfig<TResult> {
  /** Function that retrieves the raw source value */
  source: () => string | null;
  /** Function that parses the raw value into the desired type */
  parser: (value: string) => TResult | null;
  /** Optional validation function for the parsed value */
  validator?: (value: TResult) => boolean;
  /** Optional transformation function to modify the parsed value */
  transformer?: (value: TResult) => TResult;
  /** Optional logger instance */
  logger?: Logger;
  /** Error message to log if parsing fails */
  errorMessage?: string;
  /** Message to log if source is not found */
  notFoundMessage?: string;
}

/**
 * Generic data extraction pipeline with parsing, validation, and transformation
 * @param config - Extraction configuration
 * @returns Extracted and processed data or null
 *
 * @example
 * const partnerData = extractData({
 *   source: () => getCookie('partner_data'),
 *   parser: parseJsonCookie,
 *   transformer: (data) => {
 *     if (hasProperty(data, 'DXP')) {
 *       return removeProperties(data.DXP, ['secret']);
 *     }
 *     return removeProperties(data, ['secret']);
 *   },
 *   logger,
 *   errorMessage: 'Error parsing partner data from cookie',
 *   notFoundMessage: 'No partner data in cookies',
 * });
 */
export function extractData<TResult>(config: ExtractionConfig<TResult>): TResult | null {
  const rawValue = config.source();

  if (!rawValue) {
    config.logger?.log(config.notFoundMessage || 'No data found');
    return null;
  }

  const parsed = config.parser(rawValue);

  if (!parsed) {
    config.logger?.error(config.errorMessage || 'Error parsing data');
    return null;
  }

  if (config.validator && !config.validator(parsed)) {
    config.logger?.error('Data validation failed');
    return null;
  }

  return config.transformer ? config.transformer(parsed) : parsed;
}

/**
 * Safely parses a JSON string into an object
 * Unlike parseJsonCookie, does not URL-decode the input
 * @param value - Raw JSON string
 * @returns Parsed object or null if invalid
 */
export function parseJsonObject(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
