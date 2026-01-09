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

// src/scripts/getEventData.ts
function getEventData(logger) {
  var _a, _b;
  if (!((_b = (_a = window._adobePartners) == null ? void 0 : _a.eventData) == null ? void 0 : _b.apiResponse)) {
    logger.log("No apiResponse found in window._adobePartners.eventData");
    return null;
  }
  const eventData = window._adobePartners.eventData.apiResponse;
  logger.log("Found event data", eventData);
  return eventData;
}
function getEventDataScript(testMode = false) {
  const logger = createLogger("Get Event Data", testMode);
  try {
    logger.testHeader("GET EVENT DATA - TEST MODE");
    const eventData = getEventData(logger);
    logger.testResult(eventData);
    if (!testMode) {
      logger.log("Returning event data", eventData);
    }
    return eventData;
  } catch (error) {
    logger.error("Unexpected error getting event data:", error);
    return null;
  }
}


return getEventDataScript(TEST_MODE);