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

// src/utils/globalState.ts
function ensurePartnerNamespace() {
  if (!window._adobePartners) {
    window._adobePartners = {};
  }
  return window._adobePartners;
}
function getPartnerStateByKey(key) {
  var _a;
  return (_a = window._adobePartners) == null ? void 0 : _a[key];
}
function setPartnerStateByKey(key, value) {
  const ns = ensurePartnerNamespace();
  ns[key] = value;
}
function isDuplicateByKey(value, stateKey, logger) {
  if (value === getPartnerStateByKey(stateKey)) {
    logger.log("Duplicate detected, skipping");
    return true;
  }
  setPartnerStateByKey(stateKey, value);
  logger.log("Updated deduplication key");
  return false;
}

// src/utils/spaEventTracker.ts
function trackElement(config, logger, testMode) {
  var _a;
  const delay = (_a = config.debounceDelay) != null ? _a : 300;
  const value = getPartnerStateByKey(config.stateKey);
  if (!value) {
    logger.warn(`No value found in partner state at key "${config.stateKey}"`);
    return { success: false, message: `No value at state key "${config.stateKey}"` };
  }
  logger.log(`Value: "${value}"`);
  const existingTimer = getPartnerStateByKey(config.timerKey);
  if (existingTimer !== void 0) {
    clearTimeout(existingTimer);
    logger.log("Cleared existing debounce timer");
  }
  logger.log(`Setting up debounced tracking (${delay}ms delay)`);
  setPartnerStateByKey(
    config.timerKey,
    setTimeout(() => {
      logger.log("Processing after debounce");
      const dedupKey = config.generateDedupKey ? config.generateDedupKey(value) : value;
      if (isDuplicateByKey(dedupKey, config.dedupKey, logger)) {
        return;
      }
      fireSatelliteEvent(config.commitEvent, logger, testMode);
    }, delay)
  );
  return {
    success: true,
    message: `Tracking timer set (${delay}ms delay)`,
    value
  };
}

// src/utils/spaPublisherConfig.ts
var SPA_PUBLISHER_NAME_COMMIT_EVENT = "spaPublisherNameCommit";
var DEBOUNCE_DELAY = 300;

// src/scripts/spaPublisherNameTracker.ts
var PUBLISHER_TRACKER_CONFIG = {
  stateKey: "publisherName",
  timerKey: "publisherNameTimer",
  dedupKey: "lastPublisherNameKey",
  commitEvent: SPA_PUBLISHER_NAME_COMMIT_EVENT,
  debounceDelay: DEBOUNCE_DELAY
};
function spaPublisherNameTrackerScript(testMode = false) {
  return executeScript(
    {
      scriptName: "SPA Publisher Name Tracker",
      testMode,
      testHeaderTitle: "SPA PUBLISHER NAME TRACKER - TEST MODE",
      onError: (error, logger) => {
        logger.error("Error setting up SPA publisher name tracking:", error);
        return { success: false, message: "Failed to set up SPA publisher name tracking" };
      }
    },
    (logger) => {
      const result = trackElement(PUBLISHER_TRACKER_CONFIG, logger, testMode);
      return {
        success: result.success,
        message: result.message,
        publisherName: result.value
      };
    }
  );
}


return spaPublisherNameTrackerScript(TEST_MODE);