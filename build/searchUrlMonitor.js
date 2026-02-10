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

// src/scripts/searchUrlMonitor.ts
var URL_CHANGE_EVENT = "aepUrlChanged";
function searchUrlMonitorScript(testMode = false) {
  return executeScript(
    {
      scriptName: "Search URL Monitor",
      testMode,
      testHeaderTitle: "SEARCH URL MONITOR V2 - TEST MODE",
      onError: (error, logger) => {
        logger.error("Error installing URL change monitor:", error);
        return {
          success: false,
          message: "Failed to install URL change monitor",
          alreadyHooked: false
        };
      }
    },
    (logger) => {
      if (window.__urlHooked) {
        logger.log("URL change hooks already installed");
        return {
          success: true,
          message: "URL change hooks already installed",
          alreadyHooked: true
        };
      }
      try {
        installHistoryHooks(logger);
        window.__urlHooked = true;
        logger.log("URL change hooks successfully installed");
        return {
          success: true,
          message: "URL change hooks installed successfully",
          alreadyHooked: false
        };
      } catch (error) {
        logger.error("Failed to install hooks:", error);
        return {
          success: false,
          message: "Failed to install URL change hooks",
          alreadyHooked: false
        };
      }
    }
  );
}
function dispatchUrlChangeEvent(url) {
  try {
    const detail = {
      url,
      timestamp: Date.now()
    };
    const event = new CustomEvent(URL_CHANGE_EVENT, {
      detail,
      bubbles: true,
      cancelable: false
    });
    window.dispatchEvent(event);
  } catch (error) {
    console.error("Failed to dispatch URL change event:", error);
  }
}
function installHistoryHooks(logger) {
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  history.pushState = function pushStateHook(...args) {
    try {
      originalPushState.apply(history, args);
      logger.log("pushState detected, dispatching URL change event");
      dispatchUrlChangeEvent(window.location.href);
    } catch (error) {
      logger.error("Error in pushState hook:", error);
      originalPushState.apply(history, args);
    }
  };
  history.replaceState = function replaceStateHook(...args) {
    try {
      originalReplaceState.apply(history, args);
      logger.log("replaceState detected, dispatching URL change event");
      dispatchUrlChangeEvent(window.location.href);
    } catch (error) {
      logger.error("Error in replaceState hook:", error);
      originalReplaceState.apply(history, args);
    }
  };
  window.addEventListener(
    "popstate",
    () => {
      logger.log("popstate detected, dispatching URL change event");
      dispatchUrlChangeEvent(window.location.href);
    },
    { passive: true }
    // Performance optimization
  );
  logger.log("History API hooks installed successfully");
}


return searchUrlMonitorScript(TEST_MODE);