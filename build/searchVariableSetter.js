const TEST_MODE = localStorage.getItem('__aep_scripts_debug') === 'true';

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

// src/scripts/searchVariableSetter.ts
var DEFAULTS = {
  TERM: "",
  FILTERS: {},
  SOURCE: "unknown"
};
var VARIABLE_NAMES = {
  TERM: "searchTerm",
  FILTERS: "searchFilters",
  SOURCE: "searchSource"
};
function searchVariableSetterScript(testMode = false) {
  return executeScript(
    {
      scriptName: "Search Variable Setter",
      testMode,
      testHeaderTitle: "SEARCH VARIABLE SETTER V2 - TEST MODE",
      onError: (error, logger) => {
        logger.error("Error setting search variables:", error);
        return {
          success: false,
          message: "Failed to set search variables"
        };
      }
    },
    (logger) => {
      var _a, _b, _c;
      const payload = readSearchPayload(logger);
      if (!payload) {
        logger.log("No search payload found, using defaults");
      }
      const term = (_a = payload == null ? void 0 : payload.term) != null ? _a : DEFAULTS.TERM;
      const filters = (_b = payload == null ? void 0 : payload.filters) != null ? _b : DEFAULTS.FILTERS;
      const source = (_c = payload == null ? void 0 : payload.source) != null ? _c : DEFAULTS.SOURCE;
      logger.log("Extracted values:", { term, filters, source });
      if (window._satellite && typeof window._satellite.setVar === "function") {
        try {
          window._satellite.setVar(VARIABLE_NAMES.TERM, term);
          window._satellite.setVar(VARIABLE_NAMES.FILTERS, filters);
          window._satellite.setVar(VARIABLE_NAMES.SOURCE, source);
          logger.log("Successfully set Launch variables");
          return {
            success: true,
            message: "Search variables set successfully",
            variables: {
              searchTerm: term,
              searchFilters: filters,
              searchSource: source
            }
          };
        } catch (error) {
          logger.error("Error setting Launch variables:", error);
          return {
            success: false,
            message: "Failed to set Launch variables"
          };
        }
      } else {
        const message = testMode ? "_satellite.setVar() not available (normal in test mode)" : "_satellite.setVar() not available - ensure AEP Launch is loaded";
        logger.warn(message);
        return {
          success: false,
          message: "_satellite not available",
          variables: {
            searchTerm: term,
            searchFilters: filters,
            searchSource: source
          }
        };
      }
    }
  );
}
function readSearchPayload(logger) {
  try {
    const payload = window.__searchPayload;
    if (!payload || typeof payload !== "object") {
      return null;
    }
    if (typeof payload.term !== "string") {
      logger.warn("Invalid payload: term is not a string");
      return null;
    }
    if (typeof payload.source !== "string") {
      logger.warn("Invalid payload: source is not a string");
      return null;
    }
    if (payload.filters && typeof payload.filters === "object") {
      const filters = payload.filters;
      const isValid = Object.values(filters).every(
        (value) => Array.isArray(value) && value.every((v) => typeof v === "string")
      );
      if (!isValid) {
        logger.warn("Invalid payload: filters format incorrect");
        return null;
      }
    }
    logger.log("Payload validated successfully");
    return payload;
  } catch (error) {
    logger.error("Error reading search payload:", error);
    return null;
  }
}


return searchVariableSetterScript(TEST_MODE);