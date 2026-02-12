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

// src/utils/spaPageViewConfig.ts
var SPA_TITLE_CHANGE_EVENT = "spaPageTitleChanged";
var DEFAULT_TITLE_PATTERNS = [
  "React Include",
  "React App",
  "Loading...",
  ""
];
function isDefaultTitle(title) {
  const trimmed = title.trim();
  return DEFAULT_TITLE_PATTERNS.some((pattern) => trimmed.toLowerCase() === pattern.toLowerCase());
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

// src/scripts/spaPageViewTitleMonitor.ts
function installTitleObserver(logger) {
  let previousUrl = getPartnerState("previousPageUrl") || document.referrer || "";
  const titleElement = document.querySelector("title");
  if (!titleElement) {
    logger.warn("No <title> element found in document");
    return;
  }
  const observer = new MutationObserver(() => {
    const currentTitle2 = document.title;
    if (isDefaultTitle(currentTitle2)) {
      logger.log(`Title is still a default/placeholder: "${currentTitle2}"`);
      return;
    }
    const currentUrl = window.location.href;
    logger.log(`Title changed to: "${currentTitle2}"`);
    dispatchCustomEvent(SPA_TITLE_CHANGE_EVENT, {
      title: currentTitle2,
      url: currentUrl,
      referrer: previousUrl,
      timestamp: Date.now()
    });
    previousUrl = currentUrl;
    setPartnerState("previousPageUrl", currentUrl);
  });
  observer.observe(titleElement, { childList: true });
  setPartnerState("titleMonitorObserver", observer);
  logger.log("MutationObserver installed on <title> element");
  const currentTitle = document.title;
  if (!isDefaultTitle(currentTitle)) {
    logger.log(`Title already set at install time: "${currentTitle}", dispatching immediately`);
    dispatchCustomEvent(SPA_TITLE_CHANGE_EVENT, {
      title: currentTitle,
      url: window.location.href,
      referrer: previousUrl,
      timestamp: Date.now()
    });
  }
}
function spaPageViewTitleMonitorScript(testMode = false) {
  return executeScript(
    {
      scriptName: "SPA Page View Title Monitor",
      testMode,
      testHeaderTitle: "SPA PAGE VIEW TITLE MONITOR - TEST MODE",
      onError: (error, logger) => {
        logger.error("Error installing title change monitor:", error);
        return {
          success: false,
          message: "Failed to install title change monitor",
          alreadyHooked: false
        };
      }
    },
    (logger) => {
      if (getPartnerState("titleMonitorHooked")) {
        logger.log("Title change observer already installed");
        return {
          success: true,
          message: "Title change observer already installed",
          alreadyHooked: true,
          currentTitle: document.title
        };
      }
      try {
        installTitleObserver(logger);
        setPartnerState("titleMonitorHooked", true);
        logger.log("Title change observer successfully installed");
        return {
          success: true,
          message: "Title change observer installed successfully",
          alreadyHooked: false,
          currentTitle: document.title
        };
      } catch (error) {
        logger.error("Failed to install observer:", error);
        return {
          success: false,
          message: "Failed to install title change observer",
          alreadyHooked: false
        };
      }
    }
  );
}


return spaPageViewTitleMonitorScript(TEST_MODE);