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
 * Convert JS array to Java ArrayList
 */
function toArrayList(arr) {
  var list = new ArrayList();
  for (var ai = 0; ai < arr.length; ai++) {
    list.add(arr[ai]);
  }
  return list;
}

/**
 * Check if object has own property (ES5 safe)
 */
function hasOwn(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

/**
 * Create an object that implements the methods defined by the "ScriptHook" interface.
 *
 * OUTPUT: One XDM record per unique URL (URL-based, first card wins)
 * {
 *   "_id": "<url>",
 *   "_adobepartners": {
 *     "caasCard": {
 *       "id": "<hashed-card-id>",
 *       "tags": ["tag1", "tag2"],
 *       "snapshot_ts": "2026-02-03T..."
 *     }
 *   }
 * }
 */
var impl = {
  input: input,
  output: output,
  error: error,
  log: log,

  execute: function () {
    var self = this;
    self.log.info('Executing Chimera Cards Transform Script (BY URL)');

    // Generate snapshot timestamp once for the entire run
    var snapshotTs = formatISODate(new Date());
    self.log.info('Snapshot timestamp: ' + snapshotTs);

    while (self.input.hasNext()) {
      try {
        var inDoc = self.input.next();

        // SnapLogic HTTP GET wraps response in statusLine/entity/headers structure
        // Cards are in entity.cards from Chimera API response
        var entity = inDoc.get('entity');
        if (!entity) {
          self.log.warn('No entity found in HTTP response');
          var noEntityErr = new LinkedHashMap();
          noEntityErr.put('error', 'No entity found in HTTP response');
          noEntityErr.put('original', inDoc);
          self.error.write(noEntityErr);
          continue;
        }

        var cards = entity.get('cards');
        if (!cards) {
          self.log.warn('No cards array found in entity');
          var noCardsErr = new LinkedHashMap();
          noCardsErr.put('error', 'No cards array found in entity');
          noCardsErr.put('original', inDoc);
          self.error.write(noCardsErr);
          continue;
        }

        self.log.info('Processing ' + cards.size() + ' cards');

        // First pass: transform all cards and track URL duplicates
        var transformedCards = [];
        var urlToCards = {}; // Track which cards use each URL

        for (var ci = 0; ci < cards.size(); ci++) {
          var rawCard = cards.get(ci);

          var cardObj = {
            id: rawCard.get('id'),
            tags: rawCard.get('tags'),
            ctaLink: rawCard.get('ctaLink'),
            overlayLink: rawCard.get('overlayLink'),
            footer: rawCard.get('footer'),
          };

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

        // Log duplicates (URLs appearing in multiple cards)
        var duplicateCount = 0;
        for (var dupUrl in urlToCards) {
          if (hasOwn(urlToCards, dupUrl) && urlToCards[dupUrl].length > 1) {
            duplicateCount++;
            self.log.info(
              'Duplicate URL: ' + dupUrl + ' (card IDs: ' + urlToCards[dupUrl].join(', ') + ')'
            );
          }
        }
        if (duplicateCount > 0) {
          self.log.info('Found ' + duplicateCount + ' duplicate URL(s)');
        }

        // Second pass: output one record per unique URL (first card wins)
        var seenUrls = [];
        var urlRecordCount = 0;

        for (var ti = 0; ti < transformedCards.length; ti++) {
          var tCard = transformedCards[ti];

          for (var hi = 0; hi < tCard.ctaHrefs.length; hi++) {
            var ctaUrl = tCard.ctaHrefs[hi];

            if (!arrayContains(seenUrls, ctaUrl)) {
              seenUrls.push(ctaUrl);

              // Build XDM record with URL as _id
              var xdmRecord = new LinkedHashMap();
              xdmRecord.put('_id', ctaUrl);

              var caasCard = new LinkedHashMap();
              caasCard.put('id', tCard.id);
              caasCard.put('tags', toArrayList(tCard.tags));
              caasCard.put('snapshot_ts', snapshotTs);

              var adobepartners = new LinkedHashMap();
              adobepartners.put('caasCard', caasCard);

              xdmRecord.put('_adobepartners', adobepartners);

              self.output.write(inDoc, xdmRecord);
              urlRecordCount++;
            }
          }
        }

        self.log.info(
          'Successfully output ' +
            urlRecordCount +
            ' URL records from ' +
            transformedCards.length +
            ' cards'
        );
      } catch (err) {
        var catchErr = new LinkedHashMap();
        catchErr.put('error', String(err));
        self.log.error('Error processing cards: ' + err);
        self.error.write(catchErr);
      }
    }
    self.log.info('Script executed');
  },

  cleanup: function () {
    this.log.info('Cleaning up');
  },
};

var hook = new com.snaplogic.scripting.language.ScriptHook(impl);
