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

// src/utils/cookie.ts
function getCookie(name) {
  var _a;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const cookieValue = (_a = parts.pop()) == null ? void 0 : _a.split(";").shift();
    return cookieValue != null ? cookieValue : null;
  }
  return null;
}
function parseJsonCookie(cookieValue) {
  if (!cookieValue) {
    return null;
  }
  try {
    return JSON.parse(decodeURIComponent(cookieValue));
  } catch (e) {
    return null;
  }
}

// src/utils/object.ts
function removeProperties(data, propertiesToRemove) {
  if (data === null || data === void 0) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => removeProperties(item, propertiesToRemove));
  }
  if (typeof data === "object") {
    const entries = Object.entries(data);
    const cleaned = {};
    entries.forEach(([key, value]) => {
      if (!propertiesToRemove.includes(key)) {
        cleaned[key] = removeProperties(value, propertiesToRemove);
      }
    });
    return cleaned;
  }
  return data;
}

// src/scripts/extractPartnerData.ts
var DEFAULT_COOKIE_KEY = "partner_data";
var PROPERTIES_TO_REMOVE = ["latestAgreementAcceptedVersion"];
function getPartnerData(cookieKey, logger) {
  const partnerCookie = getCookie(cookieKey);
  if (!partnerCookie) {
    logger.log("No partner data in cookies");
    return null;
  }
  const partnerData = parseJsonCookie(partnerCookie);
  if (!partnerData) {
    logger.error("Error parsing partner data from cookie");
    return null;
  }
  if (typeof partnerData === "object" && partnerData !== null && "DXP" in partnerData) {
    const dxpValue = partnerData.DXP;
    const cleanedDxpValue = removeProperties(dxpValue, PROPERTIES_TO_REMOVE);
    logger.log("Found partner data (DXP extracted)", cleanedDxpValue);
    return cleanedDxpValue;
  }
  const cleanedPartnerData = removeProperties(partnerData, PROPERTIES_TO_REMOVE);
  logger.log("Found partner data (no DXP key)", cleanedPartnerData);
  return cleanedPartnerData;
}
function extractPartnerDataScript(testMode = false, cookieKey = DEFAULT_COOKIE_KEY) {
  const config = {
    debug: testMode,
    cookieKey
  };
  const logger = createLogger(config.debug, "Partner Data", testMode);
  try {
    logger.testHeader("PARTNER DATA EXTRACTOR - TEST MODE", `Cookie Key: ${config.cookieKey}`);
    const partnerData = getPartnerData(config.cookieKey, logger);
    logger.testResult(partnerData);
    if (!testMode) {
      logger.log("Returning partner data (DXP value)", partnerData);
    }
    return partnerData;
  } catch (error) {
    logger.error("Unexpected error extracting partner data:", error);
    return null;
  }
}

// src/scripts/customDataCollectionOnBeforeEventSend.ts
var DEFAULT_COOKIE_KEY2 = "partner_data";
function customDataCollectionOnBeforeEventSendScript(content, testMode = false, cookieKey = DEFAULT_COOKIE_KEY2) {
  var _a, _b, _c, _d;
  const logger = createLogger(testMode, "Before Send Callback", testMode);
  try {
    logger.testHeader("BEFORE SEND EVENT CALLBACK - TEST MODE", `Cookie Key: ${cookieKey}`);
    if (((_a = content.xdm) == null ? void 0 : _a.eventType) === "web.webpagedetails.pageViews") {
      logger.log("Skipping page view event");
      return content;
    }
    let partnerData = (_b = window == null ? void 0 : window._adobePartners) == null ? void 0 : _b.partnerData;
    if (!partnerData) {
      partnerData = extractPartnerDataScript(testMode, cookieKey);
      logger.log("Extracted partner data from cookie", partnerData);
    } else {
      logger.log("Using existing partner data from window", partnerData);
    }
    const cardCollection = (_d = (_c = window == null ? void 0 : window._adobePartners) == null ? void 0 : _c.partnerCard) == null ? void 0 : _d.context;
    logger.log("Retrieved card collection from window", cardCollection);
    if (!content.xdm) content.xdm = {};
    if (!content.xdm._adobepartners) content.xdm._adobepartners = {};
    content.xdm._adobepartners.partnerData = partnerData;
    content.xdm._adobepartners.cardCollection = cardCollection;
    logger.testResult(content);
    if (!testMode) {
      logger.log("Returning content with partner data and card collection", content);
    }
    return content;
  } catch (error) {
    logger.error("Unexpected error in before send callback:", error);
    return content;
  }
}


return customDataCollectionOnBeforeEventSendScript(content, TEST_MODE);