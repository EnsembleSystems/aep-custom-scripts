/**
 * Publisher ID Fetcher for Adobe Experience Platform (AEP)
 *
 * Fetches publisher/owner ID by parsing DOM links.
 * Looks for <a> tags with href starting with "/publisher/"
 */

import { createLogger } from '../utils/logger.js';
import { isValidPublisherId } from '../utils/validation.js';

// Types
export interface PublisherIdConfig {
  debug: boolean;
}

/**
 * Extracts publisher ID from href
 * Example: "/publisher/cc/2c4c7552-2bb9-4541-b625-04721319c07b/picture-instruments"
 * Returns: "2c4c7552-2bb9-4541-b625-04721319c07b" (between 3rd and 4th slash)
 */
function extractPublisherId(
  href: string,
  logger: ReturnType<typeof createLogger>
): string | null {
  // Constants for array indices
  const PUBLISHER_INDEX = 1;
  const ID_INDEX = 3;
  const MIN_PARTS = 4;

  // Split by slash and get the part between 3rd and 4th slash
  // /publisher/cc/2c4c7552-2bb9-4541-b625-04721319c07b/picture-instruments
  // Split: ['', 'publisher', 'cc', '2c4c7552-2bb9-4541-b625-04721319c07b', 'picture-instruments']
  // Index:   0      1          2               3                              4
  const parts = href.split('/');

  // We want index 3 (between 3rd and 4th slash)
  if (parts.length >= MIN_PARTS && parts[PUBLISHER_INDEX] === 'publisher') {
    const publisherId = parts[ID_INDEX];

    // Validate the ID format for security
    if (publisherId && isValidPublisherId(publisherId)) {
      return publisherId;
    }

    logger.log('Invalid publisher ID format', publisherId);
  }

  return null;
}

/**
 * Main entry point for the publisher ID fetcher
 * @param testMode - Set to true for console testing, false for AEP deployment
 */
export async function fetchPublisherIdScript(testMode: boolean = false): Promise<string | null> {
  const config: PublisherIdConfig = {
    debug: testMode,
  };

  const logger = createLogger(config.debug, 'Publisher ID DOM', testMode);

  try {
    if (testMode) {
      console.log('='.repeat(80));
      console.log('PUBLISHER ID FETCHER (DOM) - TEST MODE');
      console.log('='.repeat(80));
    }

    logger.log('Searching for publisher links in DOM');

    // Use optimized selector to only query publisher links
    // This is much faster than querying all links and filtering
    const links = document.querySelectorAll<HTMLAnchorElement>('a[href^="/publisher/"]');
    logger.log(`Found ${links.length} publisher links`);

    // Iterate through publisher links to find valid ID
    for (let i = 0; i < links.length; i++) {
      const href = links[i].getAttribute('href');

      if (href) {
        const publisherId = extractPublisherId(href, logger);

        if (publisherId) {
          logger.log('Found valid publisher ID', publisherId);

          if (testMode) {
            console.log('='.repeat(80));
            console.log('RESULT:');
            console.log('='.repeat(80));
            console.log(`Publisher ID: ${publisherId}`);
            console.log('='.repeat(80));
          }

          return publisherId;
        }
      }
    }

    logger.log('No valid publisher link found in DOM');

    if (testMode) {
      console.log('='.repeat(80));
      console.log('RESULT: null (no publisher link found)');
      console.log('='.repeat(80));
    }

    return null;
  } catch (error) {
    logger.error('Error:', error);
    return null;
  }
}
