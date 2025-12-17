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
function isAbortError(error) {
  return error instanceof Error && error.name === "AbortError";
}
function isNetworkError(error) {
  return error instanceof TypeError && error.message.includes("fetch");
}

// src/scripts/helloWorld.ts
var DEFAULT_CONFIG = {
  timeout: 1e4,
  debug: false,
  message: "Hello from AEP!"
};
async function helloWorldScript(testMode = false) {
  const config = __spreadProps(__spreadValues({}, DEFAULT_CONFIG), {
    debug: testMode
    // Enable debug logging in test mode
  });
  const logger = createLogger(config.debug, "Hello World", testMode);
  try {
    logger.testHeader("HELLO WORLD SCRIPT - TEST MODE", config);
    logger.log("Script started");
    const simpleResult = {
      message: config.message || DEFAULT_CONFIG.message,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      userAgent: navigator.userAgent,
      currentUrl: window.location.href
    };
    logger.log("Simple result created:", simpleResult);
    const result = {
      success: true,
      message: "Hello World script executed successfully",
      data: simpleResult,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    logger.testResult(result);
    if (!testMode) {
      logger.log("Returning result:", result);
    }
    return result;
  } catch (error) {
    if (isAbortError(error)) {
      logger.error(`Request timeout after ${config.timeout}ms`);
      return null;
    }
    if (isNetworkError(error)) {
      logger.error("Network error:", error);
      return null;
    }
    logger.error("Unexpected error in Hello World script:", error);
    return null;
  }
}


return helloWorldScript(TEST_MODE);