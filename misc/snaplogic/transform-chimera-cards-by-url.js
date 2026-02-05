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
 * Check if object has own property (ES5 safe)
 */
function hasOwn(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
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
 * Convert JS array to Java ArrayList for proper JSON serialization
 */
function toArrayList(jsArray) {
  var arrayList = new ArrayList();
  for (var i = 0; i < jsArray.length; i++) {
    arrayList.add(jsArray[i]);
  }
  return arrayList;
}

/**
 * Build XDM record for URL-based output
 */
function buildUrlXdmRecord(url, cardId, tags, snapshotTs) {
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
 * Process cards from a single response and add to accumulators
 * @param {Object} response - Single response document from Union
 * @param {number} responseIndex - Index for logging
 * @param {Array} transformedCards - Array of transformed cards (mutated)
 * @param {Object} urlToCards - URL to card ID mapping (mutated)
 * @param {Object} log - Logger
 */
function processResponse(response, responseIndex, transformedCards, urlToCards, log) {
  var cards = getCardsFromResponse(response, responseIndex, log);
  if (!cards) return;

  var cardCount = cards.size();
  log.info('Response ' + responseIndex + ': Processing ' + cardCount + ' cards');

  for (var ci = 0; ci < cardCount; ci++) {
    var rawCard = cards.get(ci);
    if (!rawCard) {
      log.warn('Null card at index ' + ci);
      continue;
    }
    var cardObj = cardToObject(rawCard);
    var transformed = transformCard(cardObj);
    transformedCards.push(transformed);

    // Track URL to card mappings for duplicate detection
    for (var ui = 0; ui < transformed.ctaHrefs.length; ui++) {
      var href = transformed.ctaHrefs[ui];
      if (!urlToCards[href]) {
        urlToCards[href] = [];
      }
      urlToCards[href].push(transformed.id);
    }
  }
}

/**
 * Log URLs that appear in multiple cards
 */
function logDuplicateUrls(urlToCards, log) {
  var duplicateCount = 0;
  for (var url in urlToCards) {
    if (hasOwn(urlToCards, url) && urlToCards[url].length > 1) {
      duplicateCount++;
      log.info('Duplicate URL: ' + url + ' (card IDs: ' + urlToCards[url].join(', ') + ')');
    }
  }
  if (duplicateCount > 0) {
    log.info('Found ' + duplicateCount + ' duplicate URL(s)');
  }
}

/**
 * Second pass: build XDM records for unique URLs (first card wins)
 */
function buildXdmRecordsFromUrls(transformedCards, snapshotTs) {
  var seenUrls = [];
  var xdmRecords = [];

  for (var ti = 0; ti < transformedCards.length; ti++) {
    var card = transformedCards[ti];

    for (var hi = 0; hi < card.ctaHrefs.length; hi++) {
      var url = card.ctaHrefs[hi];

      if (!arrayContains(seenUrls, url)) {
        seenUrls.push(url);
        xdmRecords.push(buildUrlXdmRecord(url, card.id, card.tags, snapshotTs));
      }
    }
  }

  return xdmRecords;
}

/**
 * Create an object that implements the methods defined by the "ScriptHook" interface.
 *
 * OUTPUT: Single NDJSON string containing one XDM record per line (deduplicated by URL, first card wins)
 * Each line:
 * {"_id":"<url>","_adobepartners":{"caasCard":{"id":"<hashed-card-id>","tags":["tag1","tag2"],"snapshot_ts":"2026-02-03T..."}}}
 */
var impl = {
  input: input,
  output: output,
  error: error,
  log: log,

  execute: function () {
    var self = this;
    self.log.info('Executing Chimera Cards Transform Script (BY URL)');

    var snapshotTs = formatISODate(new Date());
    self.log.info('Snapshot timestamp: ' + snapshotTs);

    // Accumulators for all responses from Union
    var transformedCards = [];
    var urlToCards = {};
    var responseIndex = 0;

    // Process each response document from Union (one at a time)
    while (self.input.hasNext()) {
      try {
        var inDoc = self.input.next();
        processResponse(inDoc, responseIndex, transformedCards, urlToCards, self.log);
        responseIndex++;
      } catch (err) {
        var catchErr = new LinkedHashMap();
        catchErr.put('error', String(err));
        self.log.error('Error processing response ' + responseIndex + ': ' + err);
        self.error.write(catchErr);
      }
    }

    // Output aggregated results after processing all responses
    self.log.info(
      'Total cards collected: ' +
        transformedCards.length +
        ' from ' +
        responseIndex +
        ' response(s)'
    );

    // Log duplicate URLs
    logDuplicateUrls(urlToCards, self.log);

    // Build deduplicated XDM records and output each as separate document
    var xdmRecords = buildXdmRecordsFromUrls(transformedCards, snapshotTs);
    self.log.info(
      'Outputting ' +
        xdmRecords.length +
        ' unique URL records from ' +
        transformedCards.length +
        ' cards'
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
