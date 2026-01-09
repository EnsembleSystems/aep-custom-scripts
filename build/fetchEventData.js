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
async function executeAsyncScript(config, execute) {
  const logger = createLogger(config.scriptName, config.testMode);
  try {
    logger.testHeader(config.testHeaderTitle, config.testHeaderExtraInfo);
    const result = await execute(logger);
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
      const errorResult = config.onError(error, logger);
      return errorResult instanceof Promise ? errorResult : Promise.resolve(errorResult);
    }
    logger.error("Unexpected error in script:", error);
    return null;
  }
}

// src/utils/fetch.ts
var MAX_RESPONSE_SIZE = 5 * 1024 * 1024;
function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, __spreadProps(__spreadValues({}, options), { signal: controller.signal })).finally(() => {
    clearTimeout(timeoutId);
  });
}
function validateResponseSize(response) {
  const contentLength = response.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
    throw new Error(`Response too large: ${contentLength} bytes (max: ${MAX_RESPONSE_SIZE})`);
  }
}
function isAbortError(error) {
  return error instanceof Error && error.name === "AbortError";
}
function isNetworkError(error) {
  return error instanceof TypeError && error.message.includes("fetch");
}

// src/utils/constants.ts
var constants_default = {
  EVENT_DATA_READY_EVENT: "eventDataReady"
};

// src/utils/dates.ts
function extractDates(objects) {
  if (!Array.isArray(objects)) {
    return [];
  }
  return objects.filter((obj) => obj && typeof obj.date === "string" && obj.date.trim() !== "").map((obj) => obj.date);
}

// src/utils/dom.ts
function dispatchCustomEvent(eventName, detail, logger) {
  if (logger) {
    logger.log(`Dispatching custom event: ${eventName}`, detail);
  }
  document.dispatchEvent(new CustomEvent(eventName, { detail }));
}

// src/utils/transform.ts
function getNestedProperty(obj, path, defaultValue) {
  const keys = path.split(".");
  const current = keys.reduce((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return acc[key];
    }
    return void 0;
  }, obj);
  return current !== void 0 ? current : defaultValue;
}
function setNestedProperty(obj, path, value) {
  const keys = path.split(".");
  const lastKey = keys.pop();
  if (!lastKey) return;
  const current = keys.reduce((acc, key) => {
    if (!(key in acc) || typeof acc[key] !== "object" || acc[key] === null) {
      acc[key] = {};
    }
    return acc[key];
  }, obj);
  current[lastKey] = value;
}
function transformFields(data, transforms) {
  const result = {};
  transforms.forEach((transform) => {
    const value = getNestedProperty(data, transform.source);
    if (value !== void 0) {
      const transformedValue = transform.transform ? transform.transform(value) : value;
      const targetKey = transform.target || transform.source;
      setNestedProperty(result, targetKey, transformedValue);
    }
  });
  return result;
}
function mergeWithTransforms(data, transforms) {
  const transformed = transformFields(data, transforms);
  return __spreadValues(__spreadValues({}, data), transformed);
}

// src/utils/globalState.ts
function ensurePath(obj, path) {
  let current = obj;
  path.forEach((key) => {
    if (!(key in current) || typeof current[key] !== "object" || current[key] === null) {
      current[key] = {};
    }
    current = current[key];
  });
  return current;
}
function setGlobalValue(obj, path, value, logger) {
  const pathArray = Array.isArray(path) ? path : path.split(".");
  const lastKey = pathArray.pop();
  if (!lastKey) {
    if (logger) {
      logger.error("Invalid path: empty path provided");
    }
    return;
  }
  const target = ensurePath(obj, pathArray);
  target[lastKey] = value;
  if (logger) {
    logger.log(`Set global value at ${pathArray.concat(lastKey).join(".")}`, value);
  }
}

// src/scripts/fetchEventData.ts
var API = {
  EVENT_ENDPOINT: "/api/event.json?meta=true"
};
function transformEventData(data, logger) {
  var _a;
  const rawData = data;
  const dates = extractDates((_a = rawData.dates) != null ? _a : []);
  logger.log("Extracted dates (`yyyy-MM-dd` format):", dates);
  const transformedData = mergeWithTransforms(rawData, [
    { source: "dates", target: "dates", transform: () => dates }
  ]);
  logger.log("Transformed data", transformedData);
  return transformedData;
}
function storeEventDataGlobally(transformedData, logger) {
  setGlobalValue(
    window,
    ["_adobePartners", "eventData", "apiResponse"],
    transformedData,
    logger
  );
}
function fetchEventDataScript(testMode = false) {
  const config = {
    timeout: 1e4
  };
  return executeAsyncScript(
    {
      scriptName: "Event Data",
      testMode,
      testHeaderTitle: "EVENT DATA EXTRACTOR - TEST MODE",
      onError: async (error, logger) => {
        if (isAbortError(error)) {
          logger.error(`Request timeout after ${config.timeout}ms`);
          return null;
        }
        if (isNetworkError(error)) {
          logger.error("Network error:", error);
          return null;
        }
        logger.error("Unexpected error fetching event data:", error);
        return null;
      }
    },
    async (logger) => {
      const currentDomain = window.location.origin;
      const apiUrl = `${currentDomain}${API.EVENT_ENDPOINT}`;
      logger.log("Fetching event data from", apiUrl);
      const response = await fetchWithTimeout(
        apiUrl,
        {
          method: "GET",
          headers: {
            Accept: "application/json"
          }
        },
        config.timeout
      );
      if (!response.ok) {
        logger.error(`API error: ${response.status} ${response.statusText}`);
        throw new Error(`API returned ${response.status}`);
      }
      validateResponseSize(response);
      const data = await response.json();
      logger.log("Event data received", data);
      try {
        const transformedData = transformEventData(data, logger);
        storeEventDataGlobally(transformedData, logger);
        dispatchCustomEvent(constants_default.EVENT_DATA_READY_EVENT);
        return transformedData;
      } catch (err) {
        logger.warn("Could not transform or store data:", err);
        return data;
      }
    }
  );
}


return fetchEventDataScript(TEST_MODE);