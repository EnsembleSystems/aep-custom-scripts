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

// Types
export interface PartnerCardXdmConfig {
  debug: boolean;
}

// Define the expected structure of partner card data
export interface PartnerCardData {
  cardTitle: string;
  contentID: string;
  contentType: string;
  ctaText: string;
  filterContext: string;
  name: string;
  position: string;
  sectionID: string;
}

// Define the XDM structure
export interface PartnerCardXdm {
  _adobepartners: {
    cardCollection: PartnerCardData | null;
  };
}

// Extend Window interface for type safety
declare global {
  interface Window {
    partnerCardData?: PartnerCardData | null;
  }
}

/**
 * Formats partner card data into XDM structure
 */
function formatPartnerCardXdm(
  logger: ReturnType<typeof createLogger>
): PartnerCardXdm | null {
  // Check if window.partnerCardData exists
  if (!window.partnerCardData) {
    logger.log('No partnerCardData on window');
    return null;
  }

  const { partnerCardData } = window;

  // Create XDM structure with cardCollection as an array
  const xdmData: PartnerCardXdm = {
    _adobepartners: {
      cardCollection: partnerCardData, // Wrap in array for XDM schema
    },
  };

  logger.log('Formatted XDM data', xdmData);
  return xdmData;
}

/**
 * Main entry point for the partner card XDM formatter
 * @param testMode - Set to true for console testing, false for AEP deployment
 *
 * RETURNS: XDM-formatted object ready for AEP Web SDK Send Event action
 */
export function getPartnerCardXdmScript(
  testMode: boolean = false
): PartnerCardXdm | null {
  const config: PartnerCardXdmConfig = {
    debug: testMode,
  };

  const logger = createLogger(config.debug, 'Partner Card XDM', testMode);

  try {
    logger.testHeader('PARTNER CARD XDM FORMATTER - TEST MODE');

    // Format the data into XDM structure
    const xdmData = formatPartnerCardXdm(logger);

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
