const TEST_MODE = false;

var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));

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

// src/utils/script.ts
function executeScript(config, execute) {
  const logger = createLogger(config.scriptName, config.testMode);
  try {
    logger.testHeader(config.testHeaderTitle, config.testHeaderExtraInfo);
    const result = execute(logger);
    logger.testResult(result);
    if (!config.testMode) {
      if (config.onSuccess) {
        config.onSuccess(result, logger);
      } else {
        logger.log("Script completed successfully", result);
      }
    }
    return result;
  } catch (error) {
    if (config.onError) {
      return config.onError(error, logger);
    }
    logger.error("Unexpected error in script:", error);
    return null;
  }
}

// src/utils/extraction.ts
function extractData(config) {
  var _a, _b, _c;
  const rawValue = config.source();
  if (!rawValue) {
    (_a = config.logger) == null ? void 0 : _a.log(config.notFoundMessage || "No data found");
    return null;
  }
  const parsed = config.parser(rawValue);
  if (!parsed) {
    (_b = config.logger) == null ? void 0 : _b.error(config.errorMessage || "Error parsing data");
    return null;
  }
  if (config.validator && !config.validator(parsed)) {
    (_c = config.logger) == null ? void 0 : _c.error("Data validation failed");
    return null;
  }
  return config.transformer ? config.transformer(parsed) : parsed;
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
    return Object.entries(data).reduce((cleaned, [key, value]) => {
      if (propertiesToRemove.includes(key)) {
        return cleaned;
      }
      return __spreadProps(__spreadValues({}, cleaned), {
        [key]: removeProperties(value, propertiesToRemove)
      });
    }, {});
  }
  return data;
}

// src/utils/validation.ts
function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function hasProperty(value, property) {
  return isObject(value) && property in value;
}

// src/scripts/extractPartnerData.ts
var DEFAULT_COOKIE_KEY = "partner_data";
var PROPERTIES_TO_REMOVE = ["latestAgreementAcceptedVersion"];
function extractPartnerDataScript(testMode = false, cookieKey = DEFAULT_COOKIE_KEY) {
  return executeScript(
    {
      scriptName: "Partner Data",
      testMode,
      testHeaderTitle: "PARTNER DATA EXTRACTOR - TEST MODE",
      testHeaderExtraInfo: `Cookie Key: ${cookieKey}`,
      onError: (error, logger) => {
        logger.error("Unexpected error extracting partner data:", error);
        return null;
      }
    },
    (logger) => {
      const partnerData = extractData({
        source: () => getCookie(cookieKey),
        parser: parseJsonCookie,
        transformer: (data) => {
          if (hasProperty(data, "DXP")) {
            const dxpValue = data.DXP;
            const cleanedDxpValue = removeProperties(dxpValue, PROPERTIES_TO_REMOVE);
            logger.log("Found partner data (DXP extracted)", cleanedDxpValue);
            return cleanedDxpValue;
          }
          const cleanedPartnerData = removeProperties(data, PROPERTIES_TO_REMOVE);
          logger.log("Found partner data (no DXP key)", cleanedPartnerData);
          return cleanedPartnerData;
        },
        logger,
        errorMessage: "Error parsing partner data from cookie",
        notFoundMessage: "No partner data in cookies"
      });
      return partnerData;
    }
  );
}


return extractPartnerDataScript(TEST_MODE);