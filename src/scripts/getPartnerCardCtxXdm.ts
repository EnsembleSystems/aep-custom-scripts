/**
 * Partner Card XDM Formatter for Adobe Experience Platform (AEP)
 *
 * Formats partner card data from window.partnerCardData into the correct XDM structure
 * for the _adobepartner.cardCollection schema field.
 *
 * USAGE IN AEP LAUNCH:
 * -------------------
 * 1. Create a Data Element with this script
 * 2. In your "Send Event" action, select this data element in the XDM field
 * 3. The script will automatically wrap the card data in the correct XDM structure
 */

import { createLogger } from '../utils/logger.js';
import type { PartnerCardCtx } from '../types';

// Types
export interface PartnerCardXdmConfig {
  debug: boolean;
}

// Define the XDM structure
export interface PartnerCardCtxXdm {
  _adobepartners: {
    cardCollection: PartnerCardCtx | null;
  };
}

/**
 * Cache duration in milliseconds (500ms = same event context)
 * AEP data elements can be called multiple times per event, so we cache
 * the result for a short duration to avoid redundant formatting
 */
const CACHE_DURATION_MS = 500;

/**
 * Checks if cached data is still valid and matches current source data
 */
function isCacheValid(logger: ReturnType<typeof createLogger>): boolean {
  if (!window._adobePartners?.partnerCard) {
    logger.log('No _adobePartners.partnerCard found');
    return false;
  }

  const { xdmCache: cache, context: currentData } = window._adobePartners.partnerCard;

  if (!cache) {
    logger.log('No cache found');
    return false;
  }

  const now = Date.now();
  const isExpired = now - cache.timestamp > CACHE_DURATION_MS;

  if (isExpired) {
    logger.log('Cache expired');
    return false;
  }

  // Check if source data has changed
  const dataChanged = JSON.stringify(cache.sourceData) !== JSON.stringify(currentData);

  if (dataChanged) {
    logger.log('Source data changed, cache invalid');
    return false;
  }

  logger.log('Cache is valid, returning cached data');
  return true;
}

/**
 * Formats partner card data into XDM structure
 */
function formatPartnerCardCtxXdm(
  logger: ReturnType<typeof createLogger>
): PartnerCardCtxXdm | null {
  // Check if window._adobePartners.partnerCard.context exists
  if (!window._adobePartners?.partnerCard?.context) {
    logger.log('No partner card context on window._adobePartners.partnerCard.context');
    return null;
  }

  const partnerCardContext = window._adobePartners.partnerCard.context;

  // Check if we have valid cached data
  if (isCacheValid(logger)) {
    return window._adobePartners.partnerCard.xdmCache!.data as PartnerCardCtxXdm;
  }

  // Create XDM structure with cardCollection
  const xdmData: PartnerCardCtxXdm = {
    _adobepartners: {
      cardCollection: partnerCardContext,
    },
  };

  // Cache the result (partnerCard guaranteed to exist from line 90 check)
  window._adobePartners.partnerCard.xdmCache = {
    timestamp: Date.now(),
    data: xdmData,
    sourceData: partnerCardContext,
  };

  logger.log('Formatted XDM data (cached for reuse)', xdmData);
  return xdmData;
}

/**
 * Main entry point for the partner card XDM formatter
 * @param testMode - Set to true for console testing, false for AEP deployment
 *
 * RETURNS: XDM-formatted object ready for AEP Web SDK Send Event action
 */
export function getPartnerCardCtxXdmScript(testMode: boolean = false): PartnerCardCtxXdm | null {
  const config: PartnerCardXdmConfig = {
    debug: testMode,
  };

  const logger = createLogger(config.debug, 'Partner Card Context XDM', testMode);

  try {
    logger.testHeader('PARTNER CARD CONTEXT XDM FORMATTER - TEST MODE');

    // Format the data into XDM structure
    const xdmData = formatPartnerCardCtxXdm(logger);

    logger.testResult(xdmData);
    if (!testMode) {
      logger.log('Returning XDM data', xdmData);
    }

    return xdmData;
  } catch (error) {
    // Handle errors
    logger.error('Unexpected error formatting partner card XDM:', error);
    return null;
  }
}
