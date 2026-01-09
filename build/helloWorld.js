const TEST_MODE = false;

var __defProp = Object.defineProperty;
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
function isAbortError(error) {
  return error instanceof Error && error.name === "AbortError";
}
function isNetworkError(error) {
  return error instanceof TypeError && error.message.includes("fetch");
}

// src/scripts/helloWorld.ts
var DEFAULT_CONFIG = {
  timeout: 1e4,
  message: "Hello from AEP!"
};
async function helloWorldScript(testMode = false) {
  const config = __spreadValues({}, DEFAULT_CONFIG);
  return executeAsyncScript(
    {
      scriptName: "Hello World",
      testMode,
      testHeaderTitle: "HELLO WORLD SCRIPT - TEST MODE",
      testHeaderExtraInfo: config,
      onError: (error) => {
        if (isAbortError(error)) {
          return null;
        }
        if (isNetworkError(error)) {
          return null;
        }
        return null;
      }
    },
    async (logger) => {
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
      return result;
    }
  );
}


return helloWorldScript(TEST_MODE);