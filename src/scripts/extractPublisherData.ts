/**
 * Publisher Data Extractor for Adobe Experience Platform (AEP)
 *
 * Extracts publisher ID and name by parsing DOM links.
 * Looks for <a> tags with href starting with "/publisher/"
 * Returns an object matching the publisherData XDM schema.
 */

import { executeScript } from '../utils/script.js';
import type { Logger } from '../utils/logger.js';
import { isValidPublisherId } from '../utils/validation.js';
import { extractAndValidate, createPathStructure } from '../utils/url.js';

interface PublisherData {
  publisherID: string;
  description: string;
}

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
  const publisherId = extractAndValidate(href, PUBLISHER_URL_STRUCTURE, 'id', isValidPublisherId);

  if (!publisherId) {
    logger.log('Invalid or missing publisher ID in URL', href);
    return null;
  }

  return publisherId;
}

// Generic UI text patterns that are not publisher names
const UI_TEXT_PATTERNS = ['view all', 'see all', 'show more', 'see more', 'load more'];

/**
 * Checks if link text is a publisher name vs generic UI text (e.g. "View all").
 * Returns the trimmed name or empty string if it looks like UI text.
 */
function getPublisherNameFromLink(link: HTMLAnchorElement): string {
  const text = (link.textContent || '').trim();
  if (!text) return '';
  if (UI_TEXT_PATTERNS.includes(text.toLowerCase())) return '';
  return text;
}

/**
 * Extracts publisher name from the page using multiple strategies:
 * 1. data-testid="publisherName-display" (may be stripped in prod)
 * 2. data-launchid="Publisher"
 * 3. Scan publisher links for one with a real name (not "View all" etc.)
 */
function extractPublisherName(links: NodeListOf<HTMLAnchorElement>, logger: Logger): string {
  // Strategy 1: data-testid
  const byTestId = document.querySelector<HTMLElement>('[data-testid="publisherName-display"]');
  if (byTestId?.textContent?.trim()) {
    logger.log('Found publisher name via data-testid', byTestId.textContent.trim());
    return byTestId.textContent.trim();
  }

  // Strategy 2: data-launchid
  const byLaunchId = document.querySelector<HTMLElement>('[data-launchid="Publisher"]');
  if (byLaunchId?.textContent?.trim()) {
    logger.log('Found publisher name via data-launchid', byLaunchId.textContent.trim());
    return byLaunchId.textContent.trim();
  }

  // Strategy 3: find a publisher link whose text is a name, not UI text
  for (let i = 0; i < links.length; i += 1) {
    const name = getPublisherNameFromLink(links[i]);
    if (name) {
      logger.log('Found publisher name via link text', name);
      return name;
    }
  }

  logger.log('No publisher name found in DOM');
  return '';
}

/**
 * Main entry point for the publisher data extractor
 * @param testMode - Set to true for console testing, false for AEP deployment
 */
export function extractPublisherDataScript(testMode: boolean = false): PublisherData | null {
  return executeScript(
    {
      scriptName: 'Publisher Data',
      testMode,
      testHeaderTitle: 'PUBLISHER DATA EXTRACTOR - TEST MODE',
      onError: (error, logger) => {
        logger.error('Unexpected error parsing publisher data:', error);
        return null;
      },
    },
    (logger) => {
      logger.log('Searching for publisher links in DOM');

      const links = document.querySelectorAll<HTMLAnchorElement>('a[href^="/publisher/"]');
      logger.log(`Found ${links.length} publisher links`);

      let publisherId: string | null = null;

      // Find the first valid publisher ID from any link
      for (let i = 0; i < links.length; i += 1) {
        const href = links[i].getAttribute('href');
        if (href) {
          publisherId = extractPublisherId(href, logger);
          if (publisherId) break;
        }
      }

      if (!publisherId) {
        logger.log('No valid publisher link found in DOM');
        return null;
      }

      const description = extractPublisherName(links, logger);
      const publisherData: PublisherData = {
        publisherID: publisherId,
        description,
      };
      logger.log('Found valid publisher data', publisherData);
      return publisherData;
    }
  );
}
