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

// src/utils/globalState.ts
function ensurePartnerNamespace() {
  if (!window._adobePartners) {
    window._adobePartners = {};
  }
  return window._adobePartners;
}
function getPartnerState(key) {
  var _a;
  return (_a = window._adobePartners) == null ? void 0 : _a[key];
}
function setPartnerState(key, value) {
  const ns = ensurePartnerNamespace();
  ns[key] = value;
}

// src/utils/customEvent.ts
function dispatchCustomEvent(eventName, detail) {
  try {
    const event = new CustomEvent(eventName, {
      detail,
      bubbles: true,
      cancelable: false
    });
    window.dispatchEvent(event);
    return true;
  } catch (error) {
    console.error(`Failed to dispatch ${eventName} event:`, error);
    return false;
  }
}

// src/utils/searchConfig.ts
var URL_CHANGE_EVENT = "partnersSearchUrlChanged";
var URL_PATTERN = /.*\/digitalexperience\/home\/search\/.*/;

// src/scripts/search/searchUrlMonitor.ts
function installHistoryHooks(logger) {
  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;
  window.history.pushState = function pushStateHook(...args) {
    try {
      originalPushState.apply(window.history, args);
      logger.log("pushState detected, dispatching URL change event");
      dispatchCustomEvent(URL_CHANGE_EVENT, {
        url: window.location.href,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error("Error in pushState hook:", error);
      originalPushState.apply(window.history, args);
    }
  };
  window.history.replaceState = function replaceStateHook(...args) {
    try {
      originalReplaceState.apply(window.history, args);
      logger.log("replaceState detected, dispatching URL change event");
      dispatchCustomEvent(URL_CHANGE_EVENT, {
        url: window.location.href,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error("Error in replaceState hook:", error);
      originalReplaceState.apply(window.history, args);
    }
  };
  window.addEventListener(
    "popstate",
    () => {
      logger.log("popstate detected, dispatching URL change event");
      dispatchCustomEvent(URL_CHANGE_EVENT, {
        url: window.location.href,
        timestamp: Date.now()
      });
    },
    { passive: true }
    // Performance optimization
  );
  logger.log("window.history API hooks installed successfully");
}
function searchUrlMonitorScript(testMode = false) {
  return executeScript(
    {
      scriptName: "Search URL Monitor",
      testMode,
      testHeaderTitle: "SEARCH URL MONITOR - TEST MODE",
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
      if (!URL_PATTERN.test(window.location.pathname)) {
        logger.log("URL does not match search pattern, skipping initialization");
        return {
          success: false,
          message: "URL does not match search pattern",
          alreadyHooked: false
        };
      }
      if (getPartnerState("urlHooked")) {
        logger.log("URL change hooks already installed");
        return {
          success: true,
          message: "URL change hooks already installed",
          alreadyHooked: true
        };
      }
      try {
        installHistoryHooks(logger);
        setPartnerState("urlHooked", true);
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


return searchUrlMonitorScript(TEST_MODE);