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

// src/utils/spaElementObserver.ts
var DEFAULT_EXTRACT = (el) => {
  var _a, _b;
  return (_b = (_a = el.textContent) == null ? void 0 : _a.trim()) != null ? _b : "";
};
var DEFAULT_IS_VALID = (value) => value.length > 0;
function emit(config, value, logger) {
  setPartnerStateByKey(config.stateKey, value);
  dispatchCustomEvent(config.eventName, {
    value,
    timestamp: Date.now()
  });
  logger.log(`Dispatched "${config.eventName}" with value: "${value}"`);
  if (config.onEmit) {
    config.onEmit(value);
  }
}
function cancelTimeout(config) {
  if (config.timeoutKey) {
    const id = getPartnerStateByKey(config.timeoutKey);
    if (id !== void 0) {
      clearTimeout(id);
    }
  }
}
function installElementObserver(config, logger) {
  var _a, _b, _c, _d;
  const extract = (_a = config.extractValue) != null ? _a : DEFAULT_EXTRACT;
  const isValid = (_b = config.isValidValue) != null ? _b : DEFAULT_IS_VALID;
  const watchBody = (_c = config.watchBody) != null ? _c : false;
  const disconnectAfterFirst = (_d = config.disconnectAfterFirst) != null ? _d : true;
  const existingEl = document.querySelector(config.selector);
  if (existingEl) {
    const existingValue = extract(existingEl);
    if (isValid(existingValue)) {
      logger.log(`Element "${config.selector}" already has valid value at install time`);
      emit(config, existingValue, logger);
      return { success: true, message: "Dispatched immediately", immediateValue: existingValue };
    }
  } else if (!watchBody) {
    logger.warn(`Element "${config.selector}" not found in document`);
    return { success: false, message: `Element "${config.selector}" not found` };
  }
  const observer = new MutationObserver(() => {
    const el = document.querySelector(config.selector);
    if (!el) return;
    const value = extract(el);
    if (!isValid(value)) {
      logger.log(`Value not yet valid: "${value}"`);
      return;
    }
    logger.log(`Valid value detected: "${value}"`);
    if (disconnectAfterFirst) {
      cancelTimeout(config);
      setPartnerStateByKey(config.observerKey, void 0);
      observer.disconnect();
      logger.log("Observer disconnected after first valid value");
    }
    emit(config, value, logger);
  });
  if (watchBody) {
    observer.observe(document.body, { childList: true, subtree: true });
    logger.log(`MutationObserver installed on document.body watching for "${config.selector}"`);
  } else {
    observer.observe(existingEl, { childList: true });
    logger.log(`MutationObserver installed on "${config.selector}"`);
  }
  setPartnerStateByKey(config.observerKey, observer);
  if (config.timeout && config.timeoutKey) {
    const timeoutId = setTimeout(() => {
      observer.disconnect();
      setPartnerStateByKey(config.observerKey, void 0);
      logger.warn(`Observer timed out after ${config.timeout}ms \u2014 "${config.selector}" not found`);
    }, config.timeout);
    setPartnerStateByKey(config.timeoutKey, timeoutId);
  } else if (config.timeout && !config.timeoutKey) {
    logger.warn("`timeout` is set but `timeoutKey` is missing \u2014 timeout will not be stored");
  }
  return { success: true, message: "Observer installed" };
}

// src/utils/spaPublisherConfig.ts
var SPA_PUBLISHER_NAME_EVENT = "spaPublisherNameChanged";
var PUBLISHER_ELEMENT_SELECTOR = '[data-testid="publisherName-display"]';
var PUBLISHER_MONITOR_TIMEOUT_MS = 1e4;
function isValidPublisherName(name) {
  return name.trim().length > 0;
}

// src/scripts/spa/spaPublisherNameMonitor.ts
var PUBLISHER_MONITOR_CONFIG = {
  selector: PUBLISHER_ELEMENT_SELECTOR,
  stateKey: "publisherName",
  hookKey: "publisherMonitorHooked",
  observerKey: "publisherMonitorObserver",
  timeoutKey: "publisherMonitorTimeout",
  eventName: SPA_PUBLISHER_NAME_EVENT,
  watchBody: true,
  isValidValue: isValidPublisherName,
  timeout: PUBLISHER_MONITOR_TIMEOUT_MS,
  disconnectAfterFirst: true
};
function spaPublisherNameMonitorScript(testMode = false) {
  return executeScript(
    {
      scriptName: "SPA Publisher Name Monitor",
      testMode,
      testHeaderTitle: "SPA PUBLISHER NAME MONITOR - TEST MODE",
      onError: (error, logger) => {
        logger.error("Error installing publisher name monitor:", error);
        return {
          success: false,
          message: "Failed to install publisher name monitor",
          alreadyHooked: false
        };
      }
    },
    (logger) => {
      if (getPartnerStateByKey(PUBLISHER_MONITOR_CONFIG.hookKey)) {
        logger.log("Publisher name observer already installed");
        return {
          success: true,
          message: "Publisher name observer already installed",
          alreadyHooked: true
        };
      }
      const result = installElementObserver(PUBLISHER_MONITOR_CONFIG, logger);
      if (result.success) {
        setPartnerStateByKey(PUBLISHER_MONITOR_CONFIG.hookKey, true);
      }
      return {
        success: result.success,
        message: result.message,
        alreadyHooked: false,
        publisherName: result.immediateValue
      };
    }
  );
}


return spaPublisherNameMonitorScript(TEST_MODE);