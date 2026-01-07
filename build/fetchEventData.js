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

// src/scripts/fetchEventData.ts
var API = {
  EVENT_ENDPOINT: "/api/event.json?meta=true"
};
function fetchEventDataScript(testMode = false) {
  const config = {
    timeout: 1e4,
    debug: testMode
  };
  const logger = createLogger(config.debug, "Event Data", testMode);
  logger.testHeader("EVENT DATA EXTRACTOR - TEST MODE");
  const currentDomain = window.location.origin;
  const apiUrl = `${currentDomain}${API.EVENT_ENDPOINT}`;
  logger.log("Fetching event data from", apiUrl);
  return fetchWithTimeout(
    apiUrl,
    {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    },
    config.timeout
  ).then((response) => {
    if (!response.ok) {
      logger.error(`API error: ${response.status} ${response.statusText}`);
      throw new Error(`API returned ${response.status}`);
    }
    validateResponseSize(response);
    return response.json();
  }).then((data) => {
    logger.log("Event data received", data);
    logger.testResult(data);
    try {
      if (!window._eventData || typeof window._eventData !== "object") {
        window._eventData = {};
      }
      const dates = extractDates(data.dates);
      logger.log("Extracted dates (`yyyy-MM-dd` format):", dates);
      const transformedData = __spreadProps(__spreadValues({}, data), {
        dates
      });
      logger.log("Transformed data", transformedData);
      window._eventData.apiResponse = transformedData;
      logger.log("Event data stored in window._eventData.apiResponse");
      dispatchCustomEvent(constants_default.EVENT_DATA_READY_EVENT);
      return transformedData;
    } catch (err) {
      logger.warn("Could not store data on window._eventData:", err);
      return data;
    }
  }).catch((error) => {
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
  });
}


return fetchEventDataScript(TEST_MODE);