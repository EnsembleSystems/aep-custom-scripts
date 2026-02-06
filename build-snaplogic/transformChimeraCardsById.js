// Ensure compatibility with both JDK 7 and 8 JSR-223 Script Engines
try {
  load('nashorn:mozilla_compat.js');
} catch (e) {}

// Import the interface required by the Script snap.
importPackage(com.snaplogic.scripting.language);

// Import the serializable Java types we'll use for the output data.
importClass(java.util.LinkedHashMap);
importClass(java.util.ArrayList);

var __pow = Math.pow;

// src/snaplogic/utils/date.ts
function pad(num, size) {
  var s = String(num);
  while (s.length < size) {
    s = "0".concat(s);
  }
  return s;
}
function formatISODate(date) {
  return "".concat(date.getUTCFullYear(), "-").concat(pad(date.getUTCMonth() + 1, 2), "-").concat(pad(date.getUTCDate(), 2), "T").concat(pad(date.getUTCHours(), 2), ":").concat(pad(date.getUTCMinutes(), 2), ":").concat(pad(date.getUTCSeconds(), 2), ".").concat(pad(date.getUTCMilliseconds(), 3), "Z");
}

// src/snaplogic/utils/array.ts
function toArrayList(jsArray) {
  var arrayList = new ArrayList();
  for (var i = 0; i < jsArray.length; i += 1) {
    arrayList.add(jsArray[i]);
  }
  return arrayList;
}
function arrayContains(arr, value) {
  for (var idx = 0; idx < arr.length; idx += 1) {
    if (arr[idx] === value) return true;
  }
  return false;
}
function addUnique(arr, value) {
  if (value != null && !arrayContains(arr, value)) {
    arr.push(value);
  }
}

// src/utils/hash.ts
function rollingHash(s, length) {
  var len = length || 10;
  if (!s) return "";
  var BASE = 53;
  var MOD = __pow(10, len) + 7;
  var hash = 0;
  var basePower = 1;
  for (var idx = 0; idx < s.length; idx += 1) {
    hash = (hash + (s.charCodeAt(idx) - 97 + 1) * basePower) % MOD;
    basePower = basePower * BASE % MOD;
  }
  return ((hash + MOD) % MOD).toString(36);
}

// src/snaplogic/utils/card.ts
function cardToObject(card) {
  return {
    id: card.get("id"),
    tags: card.get("tags"),
    ctaLink: card.get("ctaLink"),
    overlayLink: card.get("overlayLink"),
    footer: card.get("footer")
  };
}
function extractFooterHrefs(footer) {
  var hrefs = [];
  if (!footer) return hrefs;
  var sections = ["left", "center", "right", "altCta"];
  for (var fi = 0; fi < footer.length; fi += 1) {
    var footerItem = footer[fi];
    for (var si = 0; si < sections.length; si += 1) {
      var section = footerItem[sections[si]];
      if (section && section.length) {
        for (var ii = 0; ii < section.length; ii += 1) {
          if (section[ii] && section[ii].href) {
            hrefs.push(section[ii].href);
          }
        }
      }
    }
  }
  return hrefs;
}
function transformCard(card) {
  var hashedId = rollingHash(card.id);
  var tags = [];
  if (card.tags && card.tags.length) {
    for (var ti = 0; ti < card.tags.length; ti += 1) {
      if (card.tags[ti] && card.tags[ti].id) {
        tags.push(card.tags[ti].id);
      }
    }
  }
  var ctaHrefs = [];
  addUnique(ctaHrefs, card.ctaLink);
  addUnique(ctaHrefs, card.overlayLink);
  var footerHrefs = extractFooterHrefs(card.footer);
  for (var hi = 0; hi < footerHrefs.length; hi += 1) {
    addUnique(ctaHrefs, footerHrefs[hi]);
  }
  return {
    id: hashedId,
    tags: tags,
    ctaHrefs: ctaHrefs
  };
}
function buildXdmCardRecord(transformed, snapshotTs) {
  return {
    _id: transformed.id,
    _adobepartners: {
      caasCard: {
        id: transformed.id,
        ctahrefs: toArrayList(transformed.ctaHrefs),
        tags: toArrayList(transformed.tags),
        snapshot_ts: snapshotTs
      }
    }
  };
}
function getCardsFromResponse(response, responseIndex, log2) {
  if (!response) {
    log2.warn("Null response at index ".concat(responseIndex));
    return null;
  }
  var entity = response.get("entity");
  if (!entity) {
    log2.warn("No entity found in response ".concat(responseIndex));
    return null;
  }
  var cards = entity.get("cards");
  if (!cards) {
    log2.warn("No cards array found in response ".concat(responseIndex));
    return null;
  }
  return cards;
}

// src/snaplogic/scripts/transformChimeraCardsById.ts
function processResponse(response, responseIndex, seenIds, xdmRecords, snapshotTs, logger) {
  var cards = getCardsFromResponse(response, responseIndex, logger);
  if (!cards) return 0;
  var cardCount = cards.size();
  logger.info("Response ".concat(responseIndex, ": Processing ").concat(cardCount, " cards"));
  var duplicateCount = 0;
  for (var ci = 0; ci < cardCount; ci += 1) {
    var rawCard = cards.get(ci);
    if (!rawCard) {
      logger.warn("Null card at index ".concat(ci));
    } else {
      var cardObj = cardToObject(rawCard);
      var transformed = transformCard(cardObj);
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
function executeScript(self) {
  self.log.info("Executing Chimera Cards Transform Script (BY ID)");
  var snapshotTs = formatISODate(/* @__PURE__ */new Date());
  self.log.info("Snapshot timestamp: ".concat(snapshotTs));
  var seenIds = [];
  var xdmRecords = [];
  var totalDuplicates = 0;
  var responseIndex = 0;
  while (self.input.hasNext()) {
    try {
      var inDoc = self.input.next();
      var duplicates = processResponse(inDoc, responseIndex, seenIds, xdmRecords, snapshotTs, self.log);
      totalDuplicates += duplicates;
      responseIndex += 1;
    } catch (err) {
      var catchErr = new LinkedHashMap();
      catchErr.put("error", String(err));
      self.log.error("Error processing response ".concat(responseIndex, ": ").concat(err));
      self.error.write(catchErr);
    }
  }
  if (totalDuplicates > 0) {
    self.log.info("Skipped ".concat(totalDuplicates, " duplicate card ID(s) across all responses"));
  }
  self.log.info("Outputting ".concat(xdmRecords.length, " unique card records from ").concat(responseIndex, " response(s)"));
  for (var ri = 0; ri < xdmRecords.length; ri += 1) {
    self.output.write(xdmRecords[ri]);
  }
  if (xdmRecords.length === 0) {
    self.log.warn("No records to output");
  }
  self.log.info("Script executed");
}
var impl = {
  input: input,
  output: output,
  error: error,
  log: log,
  execute: function execute() {
    executeScript(this);
  },
  cleanup: function cleanup() {
    this.log.info("Cleaning up");
  }
};
var transformChimeraCardsById_default = impl;

/**
 * The Script Snap will look for a ScriptHook object in the "hook"
 * variable. The snap will then call the hook's "execute" method.
 */
var hook = new com.snaplogic.scripting.language.ScriptHook(impl);
