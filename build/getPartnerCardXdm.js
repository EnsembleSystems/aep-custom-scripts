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

// src/scripts/getPartnerCardXdm.ts
function formatPartnerCardXdm(logger) {
  if (!window.partnerCardData) {
    logger.log("No partnerCardData on window");
    return null;
  }
  const { partnerCardData } = window;
  const xdmData = {
    _adobepartners: {
      cardCollection: partnerCardData
      // Wrap in array for XDM schema
    }
  };
  logger.log("Formatted XDM data", xdmData);
  return xdmData;
}
function getPartnerCardXdmScript(testMode = false) {
  const config = {
    debug: testMode
  };
  const logger = createLogger(config.debug, "Partner Card XDM", testMode);
  try {
    logger.testHeader("PARTNER CARD XDM FORMATTER - TEST MODE");
    const xdmData = formatPartnerCardXdm(logger);
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


return getPartnerCardXdmScript(TEST_MODE);