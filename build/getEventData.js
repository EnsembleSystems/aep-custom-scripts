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

// src/scripts/getEventData.ts
function getEventData(logger) {
  if (!window._eventData) {
    logger.log("No _eventData object on window");
    return null;
  }
  if (!window._eventData.apiResponse) {
    logger.log("No apiResponse in window._eventData");
    return null;
  }
  const eventData = window._eventData.apiResponse;
  logger.log("Found event data", eventData);
  return eventData;
}
function getEventDataScript(testMode = false) {
  const config = {
    debug: testMode
  };
  const logger = createLogger(config.debug, "Get Event Data", testMode);
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