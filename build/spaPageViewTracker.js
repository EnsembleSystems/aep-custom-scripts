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

// src/utils/satellite.ts
function fireSatelliteEvent(eventName, logger, testMode) {
  if (window._satellite && typeof window._satellite.track === "function") {
    logger.log(`Triggering _satellite.track("${eventName}")`);
    window._satellite.track(eventName);
    return true;
  }
  const message = testMode ? "_satellite.track() not available (normal in test mode)" : "_satellite.track() not available - ensure AEP Launch is loaded";
  logger.warn(message);
  return false;
}

// src/utils/spaPageViewConfig.ts
var SPA_PAGE_VIEW_COMMIT_EVENT = "spaPageViewCommit";
var DEBOUNCE_DELAY = 300;

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
function isDuplicate(key, stateKey, logger) {
  if (key === getPartnerState(stateKey)) {
    logger.log("Duplicate detected, skipping");
    return true;
  }
  setPartnerState(stateKey, key);
  logger.log("Updated deduplication key");
  return false;
}

// src/scripts/spaPageViewTracker.ts
function processPageView(title, url, logger, testMode) {
  logger.log("Processing SPA page view after debounce");
  const pageViewKey = `${url}|${title}`;
  logger.log("Generated page view key:", pageViewKey);
  if (isDuplicate(pageViewKey, "lastPageViewKey", logger)) {
    return;
  }
  fireSatelliteEvent(SPA_PAGE_VIEW_COMMIT_EVENT, logger, testMode);
}
function spaPageViewTrackerScript(testMode = false) {
  return executeScript(
    {
      scriptName: "SPA Page View Tracker",
      testMode,
      testHeaderTitle: "SPA PAGE VIEW TRACKER - TEST MODE",
      onError: (error, logger) => {
        logger.error("Error setting up SPA page view tracking:", error);
        return {
          success: false,
          message: "Failed to set up SPA page view tracking"
        };
      }
    },
    (logger) => {
      const { title } = document;
      const url = window.location.href;
      logger.log(`Title: "${title}", URL: "${url}"`);
      const existingTimer = getPartnerState("pageViewTimer");
      if (existingTimer) {
        clearTimeout(existingTimer);
        logger.log("Cleared existing page view timer");
      }
      logger.log(`Setting up debounced SPA page view tracking (${DEBOUNCE_DELAY}ms delay)`);
      setPartnerState(
        "pageViewTimer",
        setTimeout(() => {
          processPageView(title, url, logger, testMode);
        }, DEBOUNCE_DELAY)
      );
      return {
        success: true,
        message: `SPA page view tracking timer set (${DEBOUNCE_DELAY}ms delay)`,
        title,
        url
      };
    }
  );
}


return spaPageViewTrackerScript(TEST_MODE);