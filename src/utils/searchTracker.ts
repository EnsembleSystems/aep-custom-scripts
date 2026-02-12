/**
 * Shared search tracking utility
 *
 * Extracts the common parse → deduplicate → store → fire flow
 * used by both searchTrackerDynamic and searchTrackerEntry scripts.
 */

import type { Logger } from './logger.js';
import { parseSearchUrl, createSearchPayload, generateSearchKey } from './searchUrlParser.js';
import { SEARCH_TRACKING_EVENT, type SearchSource } from './searchConfig.js';
import { fireSatelliteEvent } from './satellite.js';
import { getPartnerState, setPartnerState } from './globalState.js';

/**
 * Result returned by trackSearch
 */
export interface TrackSearchResult {
  success: boolean;
  message: string;
  term?: string;
  filterCount?: number;
}

/**
 * Parses the current URL, deduplicates, stores payload, and fires the tracking event.
 *
 * @param source - Search source identifier ('entry' or 'url')
 * @param logger - Logger instance
 * @param testMode - Whether in test mode
 * @returns Result with success status and details
 */
export function trackSearch(
  source: SearchSource,
  logger: Logger,
  testMode: boolean
): TrackSearchResult {
  // Parse URL securely
  const parsed = parseSearchUrl(undefined, logger);

  if (!parsed.hasValidTerm || !parsed.term) {
    logger.log('No valid search term found');
    return { success: false, message: 'No valid search term found' };
  }

  // Deduplicate
  const searchKey = generateSearchKey();
  logger.log('Generated search key:', searchKey);

  if (searchKey === getPartnerState('lastSearchKey')) {
    logger.log('Duplicate search detected, skipping');
    return {
      success: false,
      message: 'Duplicate search (already tracked)',
      term: parsed.term,
    };
  }

  setPartnerState('lastSearchKey', searchKey);
  logger.log('Updated deduplication key');

  // Create and store payload
  const payload = createSearchPayload(parsed, source);

  if (!payload) {
    logger.error('Failed to create search payload');
    return { success: false, message: 'Failed to create search payload' };
  }

  setPartnerState('searchPayload', payload);
  logger.log('Stored search payload:', payload);

  // Fire tracking event
  fireSatelliteEvent(SEARCH_TRACKING_EVENT, logger, testMode);

  const filterCount = Object.keys(payload.filters).length;

  return {
    success: true,
    message: 'Search tracked successfully',
    term: payload.term,
    filterCount,
  };
}
