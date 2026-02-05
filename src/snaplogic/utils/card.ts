/**
 * Card transformation utilities for SnapLogic Chimera scripts
 */

import { addUnique, toArrayList } from './array.js';
import rollingHash from '../../utils/hash.js';
import type {
  JavaMap,
  CardObject,
  FooterItem,
  TransformedCard,
  XdmCardRecord,
  XdmUrlRecord,
  SnapLogicLogger,
} from '../types/index.js';

/**
 * Convert Java Map card to JS object
 */
export function cardToObject(card: JavaMap): CardObject {
  return {
    id: card.get('id') as string,
    tags: card.get('tags') as Array<{ id: string }>,
    ctaLink: card.get('ctaLink') as string | null,
    overlayLink: card.get('overlayLink') as string | null,
    footer: card.get('footer') as FooterItem[] | null,
  };
}

/**
 * Extract hrefs from footer items
 */
export function extractFooterHrefs(footer: FooterItem[] | null): string[] {
  const hrefs: string[] = [];
  if (!footer) return hrefs;

  const sections: Array<keyof FooterItem> = ['left', 'center', 'right', 'altCta'];

  for (let fi = 0; fi < footer.length; fi += 1) {
    const footerItem = footer[fi];

    for (let si = 0; si < sections.length; si += 1) {
      const section = footerItem[sections[si]];
      if (section && section.length) {
        for (let ii = 0; ii < section.length; ii += 1) {
          if (section[ii] && section[ii].href) {
            hrefs.push(section[ii].href as string);
          }
        }
      }
    }
  }
  return hrefs;
}

/**
 * Transform a single card to cleaned format with shortened ID
 */
export function transformCard(card: CardObject): TransformedCard {
  const hashedId = rollingHash(card.id);

  // Extract tag IDs
  const tags: string[] = [];
  if (card.tags && card.tags.length) {
    for (let ti = 0; ti < card.tags.length; ti += 1) {
      if (card.tags[ti] && card.tags[ti].id) {
        tags.push(card.tags[ti].id);
      }
    }
  }

  // Concatenate all links into ctaHrefs (unique values only)
  const ctaHrefs: string[] = [];
  addUnique(ctaHrefs, card.ctaLink);
  addUnique(ctaHrefs, card.overlayLink);

  const footerHrefs = extractFooterHrefs(card.footer);
  for (let hi = 0; hi < footerHrefs.length; hi += 1) {
    addUnique(ctaHrefs, footerHrefs[hi]);
  }

  return { id: hashedId, tags, ctaHrefs };
}

/**
 * Build XDM record from transformed card (for by-id output)
 * Uses toArrayList to convert JS arrays to Java ArrayList for proper JSON serialization
 */
export function buildXdmCardRecord(
  transformed: TransformedCard,
  snapshotTs: string
): XdmCardRecord {
  return {
    _id: transformed.id,
    _adobepartners: {
      caasCard: {
        id: transformed.id,
        ctahrefs: toArrayList(transformed.ctaHrefs),
        tags: toArrayList(transformed.tags),
        snapshot_ts: snapshotTs,
      },
    },
  };
}

/**
 * Build XDM record for URL-based output
 * Uses toArrayList to convert JS arrays to Java ArrayList for proper JSON serialization
 */
export function buildXdmUrlRecord(
  url: string,
  cardId: string,
  tags: string[],
  snapshotTs: string
): XdmUrlRecord {
  return {
    _id: url,
    _adobepartners: {
      caasCard: {
        id: cardId,
        tags: toArrayList(tags),
        snapshot_ts: snapshotTs,
      },
    },
  };
}

/**
 * Extract cards from a single response document
 * Returns array of cards or null if response is invalid
 */
export function getCardsFromResponse(
  response: JavaMap | null,
  responseIndex: number,
  log: SnapLogicLogger
): JavaMap[] | null {
  if (!response) {
    log.warn(`Null response at index ${responseIndex}`);
    return null;
  }

  const entity = response.get('entity') as JavaMap | null;
  if (!entity) {
    log.warn(`No entity found in response ${responseIndex}`);
    return null;
  }

  const cards = entity.get('cards') as JavaMap[] | null;
  if (!cards) {
    log.warn(`No cards array found in response ${responseIndex}`);
    return null;
  }

  return cards;
}
