/**
 * SnapLogic Script: Transform Chimera Cards (By ID)
 *
 * Transforms Chimera API card responses into XDM-compliant records,
 * deduplicated by card ID.
 *
 * OUTPUT: One XDM record per unique card
 * Format: {"_id":"<hashed-card-id>","_adobepartners":{"caasCard":{...}}}
 */

import type { ScriptHookImpl, JavaMap, TransformedCard } from '../types/index.js';
import formatISODate from '../utils/date.js';
import { arrayContains } from '../utils/array.js';
import {
  cardToObject,
  transformCard,
  buildXdmCardRecord,
  getCardsFromResponse,
} from '../utils/card.js';

// Declare SnapLogic globals (injected by SnapLogic runtime)
declare const input: ScriptHookImpl['input'];
declare const output: ScriptHookImpl['output'];
declare const error: ScriptHookImpl['error'];
declare const log: ScriptHookImpl['log'];
declare const LinkedHashMap: new () => JavaMap;

/**
 * Process cards from a single response and add to accumulator
 * @returns Number of duplicates skipped
 */
function processResponse(
  response: JavaMap,
  responseIndex: number,
  seenIds: string[],
  xdmRecords: ReturnType<typeof buildXdmCardRecord>[],
  snapshotTs: string,
  logger: ScriptHookImpl['log']
): number {
  const cards = getCardsFromResponse(response, responseIndex, logger);
  if (!cards) return 0;

  const cardCount = (cards as unknown as { size(): number }).size();
  logger.info(`Response ${responseIndex}: Processing ${cardCount} cards`);

  let duplicateCount = 0;

  for (let ci = 0; ci < cardCount; ci += 1) {
    const rawCard = (cards as unknown as { get(i: number): JavaMap }).get(ci);
    if (!rawCard) {
      logger.warn(`Null card at index ${ci}`);
    } else {
      const cardObj = cardToObject(rawCard);
      const transformed: TransformedCard = transformCard(cardObj);

      // Dedupe by hashed ID
      if (arrayContains(seenIds, transformed.id)) {
        duplicateCount += 1;
      } else {
        seenIds.push(transformed.id);
        xdmRecords.push(buildXdmCardRecord(transformed, snapshotTs));
      }
    }
  }

  return duplicateCount;
}

/**
 * Main execution function
 */
function executeScript(self: ScriptHookImpl): void {
  self.log.info('Executing Chimera Cards Transform Script (BY ID)');

  const snapshotTs = formatISODate(new Date());
  self.log.info(`Snapshot timestamp: ${snapshotTs}`);

  // Accumulators for all responses from Union
  const seenIds: string[] = [];
  const xdmRecords: ReturnType<typeof buildXdmCardRecord>[] = [];
  let totalDuplicates = 0;
  let responseIndex = 0;

  // Process each response document from Union (one at a time)
  while (self.input.hasNext()) {
    try {
      const inDoc = self.input.next();
      const duplicates = processResponse(
        inDoc,
        responseIndex,
        seenIds,
        xdmRecords,
        snapshotTs,
        self.log
      );
      totalDuplicates += duplicates;
      responseIndex += 1;
    } catch (err) {
      const catchErr = new LinkedHashMap();
      catchErr.put('error', String(err));
      self.log.error(`Error processing response ${responseIndex}: ${err}`);
      self.error.write(catchErr);
    }
  }

  // Output aggregated results after processing all responses
  if (totalDuplicates > 0) {
    self.log.info(`Skipped ${totalDuplicates} duplicate card ID(s) across all responses`);
  }

  // Output each record as a separate document for downstream JSON Formatter
  self.log.info(
    `Outputting ${xdmRecords.length} unique card records from ${responseIndex} response(s)`
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
