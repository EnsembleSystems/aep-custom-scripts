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

// src/utils/spaPublisherConfig.ts
var SPA_PUBLISHER_NAME_EVENT = "spaPublisherNameChanged";
var PUBLISHER_ELEMENT_SELECTOR = '[data-testid="publisherName-display"]';
var PUBLISHER_MONITOR_TIMEOUT_MS = 1e4;
function isValidPublisherName(name) {
  return name.trim().length > 0;
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

// src/scripts/spaPublisherNameMonitor.ts
function emitPublisherName(name, logger) {
  setPartnerState("publisherName", name);
  dispatchCustomEvent(SPA_PUBLISHER_NAME_EVENT, {
    publisherName: name,
    timestamp: Date.now()
  });
  logger.log(`Dispatched "${SPA_PUBLISHER_NAME_EVENT}" with name: "${name}"`);
}
function installPublisherNameObserver(logger) {
  var _a;
  const existingElement = document.querySelector(PUBLISHER_ELEMENT_SELECTOR);
  const existingName = ((_a = existingElement == null ? void 0 : existingElement.textContent) != null ? _a : "").trim();
  if (isValidPublisherName(existingName)) {
    logger.log(`Publisher name already available at install time: "${existingName}"`);
    emitPublisherName(existingName, logger);
    return;
  }
  const observer = new MutationObserver(() => {
    var _a2;
    const element = document.querySelector(PUBLISHER_ELEMENT_SELECTOR);
    if (!element) return;
    const name = ((_a2 = element.textContent) != null ? _a2 : "").trim();
    if (!isValidPublisherName(name)) return;
    logger.log(`Publisher name element found: "${name}" \u2014 dispatching event and disconnecting`);
    clearTimeout(getPartnerState("publisherMonitorTimeout"));
    setPartnerState("publisherMonitorObserver", void 0);
    observer.disconnect();
    emitPublisherName(name, logger);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  setPartnerState("publisherMonitorObserver", observer);
  logger.log(
    `MutationObserver installed on document.body watching for "${PUBLISHER_ELEMENT_SELECTOR}"`
  );
  const timeoutId = setTimeout(() => {
    observer.disconnect();
    setPartnerState("publisherMonitorObserver", void 0);
    logger.warn(
      `Publisher name observer timed out after ${PUBLISHER_MONITOR_TIMEOUT_MS}ms \u2014 element not found`
    );
  }, PUBLISHER_MONITOR_TIMEOUT_MS);
  setPartnerState("publisherMonitorTimeout", timeoutId);
}
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
      if (getPartnerState("publisherMonitorHooked")) {
        logger.log("Publisher name observer already installed");
        return {
          success: true,
          message: "Publisher name observer already installed",
          alreadyHooked: true
        };
      }
      try {
        installPublisherNameObserver(logger);
        setPartnerState("publisherMonitorHooked", true);
        logger.log("Publisher name observer successfully installed");
        return {
          success: true,
          message: "Publisher name observer installed successfully",
          alreadyHooked: false
        };
      } catch (error) {
        logger.error("Failed to install observer:", error);
        return {
          success: false,
          message: "Failed to install publisher name observer",
          alreadyHooked: false
        };
      }
    }
  );
}


return spaPublisherNameMonitorScript(TEST_MODE);