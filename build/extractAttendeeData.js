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

// src/utils/storage.ts
function getStorageItem(key) {
  try {
    const item = localStorage.getItem(key);
    if (!item) {
      return null;
    }
    return JSON.parse(item);
  } catch (e) {
    return null;
  }
}

// src/scripts/extractAttendeeData.ts
var STORAGE_KEYS = {
  ATTENDEE: "attendeaseMember"
};
function getAttendeeData(logger) {
  const attendeeData = getStorageItem(STORAGE_KEYS.ATTENDEE);
  if (!attendeeData) {
    logger.log("No attendee data in localStorage");
    return null;
  }
  logger.log("Found attendee data", attendeeData);
  return attendeeData;
}
function extractAttendeeDataScript(testMode = false) {
  const logger = createLogger("Attendee Data", testMode);
  try {
    logger.testHeader("ATTENDEE DATA EXTRACTOR - TEST MODE");
    const attendeeData = getAttendeeData(logger);
    logger.testResult(attendeeData);
    if (!testMode) {
      logger.log("Returning attendee data", attendeeData);
    }
    return attendeeData;
  } catch (error) {
    logger.error("Unexpected error extracting attendee data:", error);
    return null;
  }
}


return extractAttendeeDataScript(TEST_MODE);