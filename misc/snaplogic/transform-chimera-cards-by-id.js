// Ensure compatibility with both JDK 7 and 8 JSR-223 Script Engines
try {
  load('nashorn:mozilla_compat.js');
} catch (e) {}

// Import the interface required by the Script snap.
importPackage(com.snaplogic.scripting.language);

// Import the serializable Java types we'll use for the output data.
importClass(java.util.LinkedHashMap);
importClass(java.util.ArrayList);

/**
 * Format date as ISO-8601 string (JDK 7 Rhino compatible)
 * @param {Date} date - Date object
 * @returns {string} - ISO-8601 formatted string
 */
function formatISODate(date) {
  function pad(num, size) {
    var s = String(num);
    while (s.length < size) {
      s = '0' + s;
    }
    return s;
  }
  return (
    date.getUTCFullYear() +
    '-' +
    pad(date.getUTCMonth() + 1, 2) +
    '-' +
    pad(date.getUTCDate(), 2) +
    'T' +
    pad(date.getUTCHours(), 2) +
    ':' +
    pad(date.getUTCMinutes(), 2) +
    ':' +
    pad(date.getUTCSeconds(), 2) +
    '.' +
    pad(date.getUTCMilliseconds(), 3) +
    'Z'
  );
}

/**
 * Rolling hash function matching the original implementation
 * @param {string} s - String to hash
 * @param {number} l - Length of hash (default 10)
 * @returns {string} - Hashed string in base 36
 */
function rollingHash(s, l) {
  var len = l || 10;
  if (!s) return '';
  var BASE = 53;
  var MOD = Math.pow(10, len) + 7;
  var hash = 0;
  var basePower = 1;
  for (var idx = 0; idx < s.length; idx++) {
    hash = (hash + (s.charCodeAt(idx) - 97 + 1) * basePower) % MOD;
    basePower = (basePower * BASE) % MOD;
  }
  return ((hash + MOD) % MOD).toString(36);
}

/**
 * Helper to check if array contains value
 */
function arrayContains(arr, value) {
  for (var idx = 0; idx < arr.length; idx++) {
    if (arr[idx] === value) return true;
  }
  return false;
}

/**
 * Helper to add unique values to array
 */
function addUnique(arr, value) {
  if (value && !arrayContains(arr, value)) {
    arr.push(value);
  }
}

/**
 * Extract hrefs from footer items
 */
function extractFooterHrefs(footer) {
  var hrefs = [];
  if (!footer) return hrefs;

  for (var fi = 0; fi < footer.length; fi++) {
    var footerItem = footer[fi];
    var sections = ['left', 'center', 'right', 'altCta'];

    for (var si = 0; si < sections.length; si++) {
      var section = footerItem[sections[si]];
      if (section && section.length) {
        for (var ii = 0; ii < section.length; ii++) {
          if (section[ii] && section[ii].href) {
            hrefs.push(section[ii].href);
          }
        }
      }
    }
  }
  return hrefs;
}

/**
 * Transform a single card to cleaned format with shortened ID
 * @param {Object} card - Raw card from API
 * @returns {Object} - Transformed card with id, tags, ctaHrefs
 */
function transformCard(card) {
  var hashedId = rollingHash(card.id);

  // Extract tag IDs
  var tags = [];
  if (card.tags && card.tags.length) {
    for (var ti = 0; ti < card.tags.length; ti++) {
      if (card.tags[ti] && card.tags[ti].id) {
        tags.push(card.tags[ti].id);
      }
    }
  }

  // Concatenate all links into ctaHrefs (unique values only)
  var ctaHrefs = [];
  addUnique(ctaHrefs, card.ctaLink);
  addUnique(ctaHrefs, card.overlayLink);

  var footerHrefs = extractFooterHrefs(card.footer);
  for (var hi = 0; hi < footerHrefs.length; hi++) {
    addUnique(ctaHrefs, footerHrefs[hi]);
  }

  return { id: hashedId, tags: tags, ctaHrefs: ctaHrefs };
}

/**
 * Convert Java Map card to JS object
 */
function cardToObject(card) {
  return {
    id: card.get('id'),
    tags: card.get('tags'),
    ctaLink: card.get('ctaLink'),
    overlayLink: card.get('overlayLink'),
    footer: card.get('footer'),
  };
}

/**
 * Build XDM record from transformed card
 */
function buildXdmRecord(transformed, snapshotTs) {
  return {
    _id: transformed.id,
    _adobepartners: {
      caasCard: {
        id: transformed.id,
        ctahrefs: transformed.ctaHrefs,
        tags: transformed.tags,
        snapshot_ts: snapshotTs,
      },
    },
  };
}

/**
 * Extract cards from a single response document
 * Returns array of cards or null if response is invalid
 */
function getCardsFromResponse(response, responseIndex, log) {
  if (!response) {
    log.warn('Null response at index ' + responseIndex);
    return null;
  }

  var entity = response.get('entity');
  if (!entity) {
    log.warn('No entity found in response ' + responseIndex);
    return null;
  }

  var cards = entity.get('cards');
  if (!cards) {
    log.warn('No cards array found in response ' + responseIndex);
    return null;
  }

  return cards;
}

/**
 * Process cards from a single response and add to accumulator
 * @param {Object} response - Single response document from Union
 * @param {number} responseIndex - Index for logging
 * @param {Array} seenIds - Array of already seen card IDs (mutated)
 * @param {Array} xdmRecords - Array of XDM records to output (mutated)
 * @param {string} snapshotTs - Timestamp for records
 * @param {Object} log - Logger
 * @returns {number} - Number of duplicates skipped
 */
function processResponse(response, responseIndex, seenIds, xdmRecords, snapshotTs, log) {
  var cards = getCardsFromResponse(response, responseIndex, log);
  if (!cards) return 0;

  var cardCount = cards.size();
  log.info('Response ' + responseIndex + ': Processing ' + cardCount + ' cards');

  var duplicateCount = 0;
  for (var ci = 0; ci < cardCount; ci++) {
    var rawCard = cards.get(ci);
    if (!rawCard) {
      log.warn('Null card at index ' + ci);
      continue;
    }
    var cardObj = cardToObject(rawCard);
    var transformed = transformCard(cardObj);

    // Dedupe by hashed ID
    if (arrayContains(seenIds, transformed.id)) {
      duplicateCount++;
      continue;
    }
    seenIds.push(transformed.id);

    xdmRecords.push(buildXdmRecord(transformed, snapshotTs));
  }

  return duplicateCount;
}

/**
 * Create an object that implements the methods defined by the "ScriptHook" interface.
 *
 * OUTPUT: Single NDJSON string containing one XDM record per line (deduplicated by card ID)
 * Each line:
 * {"_id":"<hashed-card-id>","_adobepartners":{"caasCard":{"id":"<hashed-card-id>","ctahrefs":["url1","url2"],"tags":["tag1","tag2"],"snapshot_ts":"2026-02-03T..."}}}
 */
var impl = {
  input: input,
  output: output,
  error: error,
  log: log,

  execute: function () {
    var self = this;
    self.log.info('Executing Chimera Cards Transform Script (BY ID)');

    var snapshotTs = formatISODate(new Date());
    self.log.info('Snapshot timestamp: ' + snapshotTs);

    // Accumulators for all responses from Union
    var seenIds = [];
    var xdmRecords = [];
    var totalDuplicates = 0;
    var responseIndex = 0;

    // Process each response document from Union (one at a time)
    while (self.input.hasNext()) {
      try {
        var inDoc = self.input.next();
        var duplicates = processResponse(
          inDoc,
          responseIndex,
          seenIds,
          xdmRecords,
          snapshotTs,
          self.log
        );
        totalDuplicates += duplicates;
        responseIndex++;
      } catch (err) {
        var catchErr = new LinkedHashMap();
        catchErr.put('error', String(err));
        self.log.error('Error processing response ' + responseIndex + ': ' + err);
        self.error.write(catchErr);
      }
    }

    // Output aggregated results after processing all responses
    if (totalDuplicates > 0) {
      self.log.info('Skipped ' + totalDuplicates + ' duplicate card ID(s) across all responses');
    }

    // Output each record as a separate document for downstream JSON Formatter
    self.log.info(
      'Outputting ' +
        xdmRecords.length +
        ' unique card records from ' +
        responseIndex +
        ' response(s)'
    );
    for (var ri = 0; ri < xdmRecords.length; ri++) {
      self.output.write(xdmRecords[ri]);
    }

    if (xdmRecords.length === 0) {
      self.log.warn('No records to output');
    }

    self.log.info('Script executed');
  },

  cleanup: function () {
    this.log.info('Cleaning up');
  },
};

var hook = new com.snaplogic.scripting.language.ScriptHook(impl);
