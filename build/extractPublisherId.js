const TEST_MODE = false;

// src/utils/logger.ts
var Logger = class {
  constructor(prefix, isTestMode) {
    this.prefix = prefix;
    this.isTestMode = isTestMode;
  }
  get debug() {
    return this.isTestMode;
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
function createLogger(scriptName, isTestMode) {
  const prefix = isTestMode ? `[${scriptName} Test]` : `[AEP ${scriptName}]`;
  return new Logger(prefix, isTestMode);
}

// src/utils/validation.ts
function isValidPublisherId(id) {
  if (!id || typeof id !== "string") {
    return false;
  }
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const salesforcePattern = /^[a-z0-9]{15}([a-z0-9]{3})?$/i;
  return uuidPattern.test(id) || salesforcePattern.test(id);
}

// src/scripts/extractPublisherId.ts
var PUBLISHER_URL_STRUCTURE = {
  PARTS: {
    EMPTY: 0,
    // ''
    PUBLISHER: 1,
    // 'publisher'
    APP_TYPE: 2,
    // 'cc' | 'dc' | 'ec'
    ID: 3,
    // actual ID
    NAME: 4
    // publisher name
  },
  MIN_PARTS: 4
};
function isValidPublisherUrl(parts) {
  return parts.length >= PUBLISHER_URL_STRUCTURE.MIN_PARTS && parts[PUBLISHER_URL_STRUCTURE.PARTS.PUBLISHER] === "publisher";
}
function extractPublisherId(href, logger) {
  const parts = href.split("/");
  if (!isValidPublisherUrl(parts)) {
    return null;
  }
  const publisherId = parts[PUBLISHER_URL_STRUCTURE.PARTS.ID];
  if (publisherId && isValidPublisherId(publisherId)) {
    return publisherId;
  }
  logger.log("Invalid publisher ID format", publisherId);
  return null;
}
function extractPublisherIdScript(testMode = false) {
  const logger = createLogger("Publisher ID", testMode);
  try {
    logger.testHeader("PUBLISHER ID EXTRACTOR - TEST MODE");
    logger.log("Searching for publisher links in DOM");
    const links = document.querySelectorAll('a[href^="/publisher/"]');
    logger.log(`Found ${links.length} publisher links`);
    for (let i = 0; i < links.length; i += 1) {
      const href = links[i].getAttribute("href");
      if (href) {
        const publisherId = extractPublisherId(href, logger);
        if (publisherId) {
          logger.log("Found valid publisher ID", publisherId);
          logger.testResult(`Publisher ID: ${publisherId}`);
          return publisherId;
        }
      }
    }
    logger.log("No valid publisher link found in DOM");
    logger.testResult("null (no publisher link found)");
    return null;
  } catch (error) {
    logger.error("Unexpected error parsing publisher ID:", error);
    return null;
  }
}


return extractPublisherIdScript(TEST_MODE);