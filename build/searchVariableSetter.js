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

// src/utils/searchConfig.ts
var FILTER_TO_XDM_MAP = {
  "content-type": "searchContentType",
  functionality: "searchFunctionality",
  industries: "searchIndustries",
  products: "searchProducts",
  solutions: "searchSolutions",
  topic: "searchTopic"
};

// src/scripts/searchVariableSetter.ts
var XDM_VARIABLE_NAME = "XDMVariable";
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
      const { filters } = payload;
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
function mapFiltersToXdm(filters, logger) {
  const xdmFilters = {};
  Object.entries(filters).forEach(([key, values]) => {
    const xdmKey = FILTER_TO_XDM_MAP[key];
    if (xdmKey) {
      xdmFilters[xdmKey] = values;
      logger.log(`Mapped filter "${key}" \u2192 "${xdmKey}":`, values);
    } else {
      logger.log(`Skipping unmapped filter "${key}" (not in XDM schema)`);
    }
  });
  return xdmFilters;
}
function ensurePath(obj, keys) {
  let current = obj;
  keys.forEach((key) => {
    if (!current[key] || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key];
  });
  return current;
}
function searchVariableSetterScript(testMode = false) {
  return executeScript(
    {
      scriptName: "Search Variable Setter",
      testMode,
      testHeaderTitle: "SEARCH VARIABLE SETTER - TEST MODE",
      onError: (error, logger) => {
        logger.error("Error setting search variables:", error);
        return {
          success: false,
          message: "Failed to set search variables"
        };
      }
    },
    (logger) => {
      const payload = readSearchPayload(logger);
      if (!payload) {
        logger.log("No valid search payload found");
        return {
          success: false,
          message: "No valid search payload found"
        };
      }
      const xdmFilters = mapFiltersToXdm(payload.filters, logger);
      const searchResults = {
        searchTerm: payload.term,
        searchSource: payload.source,
        searchFilters: xdmFilters
      };
      logger.log("Built XDM searchResults:", searchResults);
      if (window._satellite && typeof window._satellite.getVar === "function") {
        try {
          const xdmVar = window._satellite.getVar(XDM_VARIABLE_NAME);
          if (!xdmVar) {
            logger.error(`XDM Variable "${XDM_VARIABLE_NAME}" not found`);
            return {
              success: false,
              message: `XDM Variable "${XDM_VARIABLE_NAME}" not found`,
              searchResults
            };
          }
          const searchResultsNode = ensurePath(xdmVar, ["_adobepartners", "searchResults"]);
          searchResultsNode.searchTerm = searchResults.searchTerm;
          searchResultsNode.searchSource = searchResults.searchSource;
          searchResultsNode.searchFilters = searchResults.searchFilters;
          logger.log("Successfully set XDM Variable searchResults");
          return {
            success: true,
            message: "Search results set in XDM Variable",
            searchResults
          };
        } catch (error) {
          logger.error("Error setting XDM Variable:", error);
          return {
            success: false,
            message: "Failed to set XDM Variable",
            searchResults
          };
        }
      } else {
        const message = testMode ? "_satellite.getVar() not available (normal in test mode)" : "_satellite.getVar() not available - ensure AEP Launch is loaded";
        logger.warn(message);
        return {
          success: false,
          message: "_satellite not available",
          searchResults
        };
      }
    }
  );
}


return searchVariableSetterScript(TEST_MODE);