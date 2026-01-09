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

// src/utils/events.ts
function logEventInfo(event, logger, additionalInfo) {
  if (!event) {
    logger.log("No event object provided");
    return;
  }
  const eventInfo = {
    type: "type" in event ? event.type : "unknown",
    isTrusted: "isTrusted" in event ? event.isTrusted : void 0
  };
  if (event instanceof Event && "composedPath" in event && typeof event.composedPath === "function") {
    eventInfo.composedPath = event.composedPath();
  }
  if (additionalInfo) {
    Object.assign(eventInfo, additionalInfo);
  }
  logger.log("Event information", eventInfo);
}
function isValidUserEvent(event, logger) {
  if (!event) {
    logger == null ? void 0 : logger.log("Event is missing");
    return false;
  }
  if ("isTrusted" in event && !event.isTrusted) {
    logger == null ? void 0 : logger.log("Event is not trusted (programmatic)");
    return false;
  }
  return true;
}

// src/scripts/customDataCollectionOnFilterClickCallback.ts
function customDataCollectionOnFilterClickCallbackScript(content, event, testMode = false) {
  const logger = createLogger("Filter Click Callback", testMode);
  try {
    logger.testHeader("FILTER CLICK CALLBACK - TEST MODE");
    logger.testInfo("Provided content object", content);
    logEventInfo(event, logger);
    if (!isValidUserEvent(event, logger)) {
      return false;
    }
    logger.log("\u2705 Event is trusted (genuine user click)", {
      isTrusted: event.isTrusted,
      type: event.type
    });
    if (testMode) {
      logger.testResult({
        shouldProcess: true,
        reason: "Event is trusted",
        eventType: event.type,
        isTrusted: event.isTrusted
      });
    }
    return true;
  } catch (error) {
    logger.error("Unexpected error in filter click callback:", error);
    return false;
  }
}


return customDataCollectionOnFilterClickCallbackScript(content, event, TEST_MODE);