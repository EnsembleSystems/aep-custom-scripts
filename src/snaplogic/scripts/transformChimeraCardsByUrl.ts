/**
 * SnapLogic Script: Transform Chimera Cards (By URL)
 *
 * Transforms Chimera API card responses into XDM-compliant records,
 * with one record per unique URL (first card wins for duplicates).
 *
 * OUTPUT: One XDM record per unique URL
 * Format: {"_id":"<url>","_adobepartners":{"caasCard":{"id":"<card-id>",...}}}
 */

import type { ScriptHookImpl, JavaMap, TransformedCard } from '../types/index.js';
import formatISODate from '../utils/date.js';
import { arrayContains, hasOwn } from '../utils/array.js';
import {
  cardToObject,
  transformCard,
  buildXdmUrlRecord,
  getCardsFromResponse,
} from '../utils/card.js';

// Declare SnapLogic globals (injected by SnapLogic runtime)
declare const input: ScriptHookImpl['input'];
declare const output: ScriptHookImpl['output'];
declare const error: ScriptHookImpl['error'];
declare const log: ScriptHookImpl['log'];
declare const LinkedHashMap: new () => JavaMap;

/**
 * Process cards from a single response and add to accumulators
 */
function processResponse(
  response: JavaMap,
  responseIndex: number,
  transformedCards: TransformedCard[],
  urlToCards: Record<string, string[]>,
  logger: ScriptHookImpl['log']
): void {
  const cards = getCardsFromResponse(response, responseIndex, logger);
  if (!cards) return;

  const cardCount = (cards as unknown as { size(): number }).size();
  logger.info(`Response ${responseIndex}: Processing ${cardCount} cards`);

  for (let ci = 0; ci < cardCount; ci += 1) {
    const rawCard = (cards as unknown as { get(i: number): JavaMap }).get(ci);
    if (!rawCard) {
      logger.warn(`Null card at index ${ci}`);
    } else {
      const cardObj = cardToObject(rawCard);
      const transformed: TransformedCard = transformCard(cardObj);
      transformedCards.push(transformed);

      // Track URL to card mappings for duplicate detection
      for (let ui = 0; ui < transformed.ctaHrefs.length; ui += 1) {
        const href = transformed.ctaHrefs[ui];
        if (!hasOwn(urlToCards, href)) {
          // eslint-disable-next-line no-param-reassign
          urlToCards[href] = [];
        }
        urlToCards[href].push(transformed.id);
      }
    }
  }
}

/**
 * Log URLs that appear in multiple cards
 */
function logDuplicateUrls(
  urlToCards: Record<string, string[]>,
  logger: ScriptHookImpl['log']
): void {
  let duplicateCount = 0;
  const urls = Object.keys(urlToCards);

  for (let i = 0; i < urls.length; i += 1) {
    const url = urls[i];
    if (urlToCards[url].length > 1) {
      duplicateCount += 1;
      logger.info(`Duplicate URL: ${url} (card IDs: ${urlToCards[url].join(', ')})`);
    }
  }

  if (duplicateCount > 0) {
    logger.info(`Found ${duplicateCount} duplicate URL(s)`);
  }
}

/**
 * Build XDM records for unique URLs (first card wins)
 */
function buildXdmRecordsFromUrls(
  transformedCards: TransformedCard[],
  snapshotTs: string
): ReturnType<typeof buildXdmUrlRecord>[] {
  const seenUrls: string[] = [];
  const xdmRecords: ReturnType<typeof buildXdmUrlRecord>[] = [];

  for (let ti = 0; ti < transformedCards.length; ti += 1) {
    const card = transformedCards[ti];

    for (let hi = 0; hi < card.ctaHrefs.length; hi += 1) {
      const url = card.ctaHrefs[hi];

      if (!arrayContains(seenUrls, url)) {
        seenUrls.push(url);
        xdmRecords.push(buildXdmUrlRecord(url, card.id, card.tags, snapshotTs));
      }
    }
  }

  return xdmRecords;
}

/**
 * Main execution function
 */
function executeScript(self: ScriptHookImpl): void {
  self.log.info('Executing Chimera Cards Transform Script (BY URL)');

  const snapshotTs = formatISODate(new Date());
  self.log.info(`Snapshot timestamp: ${snapshotTs}`);

  // Accumulators for all responses from Union
  const transformedCards: TransformedCard[] = [];
  const urlToCards: Record<string, string[]> = {};
  let responseIndex = 0;

  // Process each response document from Union (one at a time)
  while (self.input.hasNext()) {
    try {
      const inDoc = self.input.next();
      processResponse(inDoc, responseIndex, transformedCards, urlToCards, self.log);
      responseIndex += 1;
    } catch (err) {
      const catchErr = new LinkedHashMap();
      catchErr.put('error', String(err));
      self.log.error(`Error processing response ${responseIndex}: ${err}`);
      self.error.write(catchErr);
    }
  }

  // Output aggregated results after processing all responses
  self.log.info(
    `Total cards collected: ${transformedCards.length} from ${responseIndex} response(s)`
  );

  // Log duplicate URLs
  logDuplicateUrls(urlToCards, self.log);

  // Build deduplicated XDM records and output each as separate document
  const xdmRecords = buildXdmRecordsFromUrls(transformedCards, snapshotTs);
  self.log.info(
    `Outputting ${xdmRecords.length} unique URL records from ${transformedCards.length} cards`
  );

  for (let ri = 0; ri < xdmRecords.length; ri += 1) {
    self.output.write(xdmRecords[ri]);
  }

  if (xdmRecords.length === 0) {
    self.log.warn('No records to output');
  }

  self.log.info('Script executed');
}

/**
 * ScriptHook implementation
 */
const impl: ScriptHookImpl = {
  input,
  output,
  error,
  log,

  execute(): void {
    executeScript(this);
  },

  cleanup(): void {
    this.log.info('Cleaning up');
  },
};

// Export for build script to process
export default impl;
