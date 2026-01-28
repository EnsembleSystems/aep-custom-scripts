const TEST_MODE = localStorage.getItem('__aep_scripts_debug') === 'true';

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
function mergeNonNull(...objects) {
  return objects.reduce((acc, obj) => {
    if (!obj) return acc;
    Object.entries(obj).forEach(([key, value]) => {
      if (value !== null && value !== void 0) {
        acc[key] = value;
      }
    });
    return acc;
  }, {});
}

// src/utils/validation.ts
function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function hasProperty(value, property) {
  return isObject(value) && property in value;
}

// src/utils/constants.ts
var DEFAULT_COOKIE_KEYS = ["partner_data", "partner_info"];

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

// src/scripts/extractPartnerData.ts
var PROPERTIES_TO_REMOVE = ["latestAgreementAcceptedVersion"];
var MAGE_CACHE_STORAGE_KEY = "mage-cache-storage";
function extractFromCookie(key, logger) {
  return extractData({
    source: () => getCookie(key),
    parser: parseJsonCookie,
    transformer: (data) => {
      const source = hasProperty(data, "DXP") ? data.DXP : data;
      return removeProperties(source, PROPERTIES_TO_REMOVE);
    },
    logger,
    errorMessage: `Error parsing ${key} from cookie`,
    notFoundMessage: `No data in ${key} cookie`
  });
}
function extractEmailFromStorage() {
  const mageCache = getStorageItem(MAGE_CACHE_STORAGE_KEY);
  const customer = mageCache == null ? void 0 : mageCache.customer;
  const email = customer == null ? void 0 : customer.email;
  return typeof email === "string" && email ? email : null;
}
function extractPartnerDataScript(testMode = false, cookieKeys = DEFAULT_COOKIE_KEYS) {
  return executeScript(
    {
      scriptName: "Partner Data",
      testMode,
      testHeaderTitle: "PARTNER DATA EXTRACTOR - TEST MODE",
      testHeaderExtraInfo: `Cookie Keys: ${cookieKeys.join(", ")}`,
      onError: (error, logger) => {
        logger.error("Unexpected error extracting partner data:", error);
        return null;
      }
    },
    (logger) => {
      const mergedData = cookieKeys.reduce(
        (acc, key) => mergeNonNull(acc, extractFromCookie(key, logger)),
        {}
      );
      if (!mergedData.email) {
        const email = extractEmailFromStorage();
        if (email) {
          mergedData.email = email;
          logger.log("Email extracted from mage-cache-storage");
        }
      }
      if (Object.keys(mergedData).length === 0) {
        logger.log("No partner data found in cookies or storage");
        return null;
      }
      logger.log("Found partner data", mergedData);
      return mergedData;
    }
  );
}


return extractPartnerDataScript(TEST_MODE);