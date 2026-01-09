/**
 * Publisher ID Extractor for Adobe Experience Platform (AEP)
 *
 * Extracts publisher/owner ID by parsing DOM links.
 * Looks for <a> tags with href starting with "/publisher/"
 */

import { executeScript } from '../utils/script.js';
import type { Logger } from '../utils/logger.js';
import { isValidPublisherId } from '../utils/validation.js';
import { extractAndValidate, createPathStructure } from '../utils/url.js';

// URL structure configuration for publisher links
// Example: "/publisher/cc/2c4c7552-2bb9-4541-b625-04721319c07b/picture-instruments"
const PUBLISHER_URL_STRUCTURE = createPathStructure('nested-resource', {
  resourceType: 'publisher',
  minSegments: 4,
});

/**
 * Extracts publisher ID from href
 * Example: "/publisher/cc/2c4c7552-2bb9-4541-b625-04721319c07b/picture-instruments"
 * Returns: "2c4c7552-2bb9-4541-b625-04721319c07b" (between 3rd and 4th slash)
 */
function extractPublisherId(href: string, logger: Logger): string | null {
  // Extract and validate publisher ID using url utilities
  const publisherId = extractAndValidate(href, PUBLISHER_URL_STRUCTURE, 'id', isValidPublisherId);

  if (!publisherId) {
    logger.log('Invalid or missing publisher ID in URL', href);
    return null;
  }

  return publisherId;
}

/**
 * Main entry point for the publisher ID extractor
 * @param testMode - Set to true for console testing, false for AEP deployment
 */
export function extractPublisherIdScript(testMode: boolean = false): string | null {
  return executeScript(
    {
      scriptName: 'Publisher ID',
      testMode,
      testHeaderTitle: 'PUBLISHER ID EXTRACTOR - TEST MODE',
      onError: (error, logger) => {
        logger.error('Unexpected error parsing publisher ID:', error);
        return null;
      },
    },
    (logger) => {
      logger.log('Searching for publisher links in DOM');

      // Use optimized selector to only query publisher links
      // This is much faster than querying all links and filtering
      const links = document.querySelectorAll<HTMLAnchorElement>('a[href^="/publisher/"]');
      logger.log(`Found ${links.length} publisher links`);

      // Iterate through publisher links to find valid ID
      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < links.length; i += 1) {
        const href = links[i].getAttribute('href');

        if (href) {
          const publisherId = extractPublisherId(href, logger);

          if (publisherId) {
            logger.log('Found valid publisher ID', publisherId);
            return publisherId;
          }
        }
      }

      logger.log('No valid publisher link found in DOM');
      return null;
    }
  );
}
