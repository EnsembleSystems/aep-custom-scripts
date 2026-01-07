const TEST_MODE = false;

// src/utils/logger.ts
var Logger = class {
  constructor(debug, prefix, isTestMode) {
    this.debug = debug;
    this.prefix = prefix;
    this.isTestMode = isTestMode;
  }
  log(message, data) {
    if (this.debug) {
      console.log(`${this.prefix} ${message}`, data != null ? data : "");
    }
  }
  error(message, data) {
    console.error(`${this.prefix} ${message}`, data != null ? data : "");
  }
  warn(message, data) {
    console.warn(`${this.prefix} ${message}`, data != null ? data : "");
  }
  /**
   * Prints a test mode header with separator lines
   * Only outputs if testMode is enabled
   */
  testHeader(title, extraInfo) {
    if (!this.isTestMode) {
      return;
    }
    const separator = "=".repeat(80);
    console.debug(separator);
    console.debug(title);
    console.debug(separator);
    if (extraInfo !== void 0) {
      console.debug(extraInfo);
      console.debug(separator);
    }
  }
  /**
   * Prints test mode result output with separator lines
   * Only outputs if testMode is enabled
   */
  testResult(result) {
    if (!this.isTestMode) {
      return;
    }
    const separator = "=".repeat(80);
    console.debug(separator);
    console.debug("RESULT:");
    console.debug(separator);
    if (typeof result === "string") {
      console.debug(result);
    } else {
      console.debug(JSON.stringify(result, null, 2));
    }
    console.debug(separator);
  }
  /**
   * Prints additional test mode info
   * Only outputs if testMode is enabled
   */
  testInfo(message, data) {
    if (!this.isTestMode) {
      return;
    }
    if (data !== void 0) {
      console.debug(message, data);
    } else {
      console.debug(message);
    }
  }
};
function createLogger(debug, scriptName, isTestMode) {
  const prefix = isTestMode ? `[${scriptName} Test]` : `[AEP ${scriptName}]`;
  return new Logger(debug, prefix, isTestMode);
}

// src/scripts/getPartnerCardCtxXdm.ts
var CACHE_DURATION_MS = 500;
function isCacheValid(logger) {
  var _a;
  if (!((_a = window._adobePartners) == null ? void 0 : _a.partnerCard)) {
    logger.log("No _adobePartners.partnerCard found");
    return false;
  }
  const { xdmCache: cache, context: currentData } = window._adobePartners.partnerCard;
  if (!cache) {
    logger.log("No cache found");
    return false;
  }
  const now = Date.now();
  const isExpired = now - cache.timestamp > CACHE_DURATION_MS;
  if (isExpired) {
    logger.log("Cache expired");
    return false;
  }
  const dataChanged = JSON.stringify(cache.sourceData) !== JSON.stringify(currentData);
  if (dataChanged) {
    logger.log("Source data changed, cache invalid");
    return false;
  }
  logger.log("Cache is valid, returning cached data");
  return true;
}
function formatPartnerCardCtxXdm(logger) {
  var _a, _b;
  if (!((_b = (_a = window._adobePartners) == null ? void 0 : _a.partnerCard) == null ? void 0 : _b.context)) {
    logger.log("No partner card context on window._adobePartners.partnerCard.context");
    return null;
  }
  const partnerCardContext = window._adobePartners.partnerCard.context;
  if (isCacheValid(logger)) {
    return window._adobePartners.partnerCard.xdmCache.data;
  }
  const xdmData = {
    _adobepartners: {
      cardCollection: partnerCardContext
    }
  };
  window._adobePartners.partnerCard.xdmCache = {
    timestamp: Date.now(),
    data: xdmData,
    sourceData: partnerCardContext
  };
  logger.log("Formatted XDM data (cached for reuse)", xdmData);
  return xdmData;
}
function getPartnerCardCtxXdmScript(testMode = false) {
  const config = {
    debug: testMode
  };
  const logger = createLogger(config.debug, "Partner Card Context XDM", testMode);
  try {
    logger.testHeader("PARTNER CARD CONTEXT XDM FORMATTER - TEST MODE");
    const xdmData = formatPartnerCardCtxXdm(logger);
    logger.testResult(xdmData);
    if (!testMode) {
      logger.log("Returning XDM data", xdmData);
    }
    return xdmData;
  } catch (error) {
    logger.error("Unexpected error formatting partner card XDM:", error);
    return null;
  }
}


return getPartnerCardCtxXdmScript(TEST_MODE);