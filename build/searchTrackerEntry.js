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
var TERM_PARAMS = ["term", "q", "keyword"];
var IGNORED_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "filters"];
var MIN_TERM_LENGTH = 2;
var MAX_TERM_LENGTH = 500;
var MAX_FILTER_PARAMS = 50;
var MAX_FILTER_VALUE_LENGTH = 1e3;
var SEARCH_SOURCES = {
  ENTRY: "entry",
  DYNAMIC: "url"
};

// src/utils/searchUrlParser.ts
function sanitizeValue(value, maxLength) {
  let sanitized = value.trim();
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  sanitized = sanitized.replace(/[\x00-\x1F\x7F-\x9F\u200B-\u200D\uFEFF]/g, "");
  sanitized = sanitized.replace(/\s+/g, " ");
  return sanitized;
}
function isSafeKey(key) {
  if (key === "__proto__" || key === "constructor" || key === "prototype") {
    return false;
  }
  return /^[a-zA-Z0-9_:-]+$/.test(key);
}
function parseSearchUrl(url, logger) {
  const searchUrl = url || window.location.href;
  try {
    const urlObj = new URL(searchUrl, window.location.origin);
    const params = urlObj.searchParams;
    let term = null;
    let termParam = null;
    const termParams = ["term", "q", "keyword"];
    termParams.some((param) => {
      const value = params.get(param);
      if (value) {
        const sanitized = sanitizeValue(value, MAX_TERM_LENGTH);
        if (sanitized.length >= MIN_TERM_LENGTH) {
          term = sanitized;
          termParam = param;
          logger == null ? void 0 : logger.log(`Found term from '${param}' param:`, term);
          return true;
        }
      }
      return false;
    });
    const filters = {};
    let filterCount = 0;
    params.forEach((value, key) => {
      if (filterCount >= MAX_FILTER_PARAMS) {
        logger == null ? void 0 : logger.warn(`Max filter limit (${MAX_FILTER_PARAMS}) reached, skipping remaining params`);
        return;
      }
      const termParamsList = TERM_PARAMS;
      const ignoredParamsList = IGNORED_PARAMS;
      if (termParamsList.includes(key) || ignoredParamsList.includes(key)) {
        return;
      }
      if (!isSafeKey(key)) {
        logger == null ? void 0 : logger.warn(`Skipping unsafe key: ${key}`);
        return;
      }
      const values = value.split(",").map((v) => sanitizeValue(v, MAX_FILTER_VALUE_LENGTH)).filter((v) => v.length > 0);
      if (values.length > 0) {
        filters[key] = values;
        filterCount += 1;
      }
    });
    const hasValidTerm = term !== null && term.length >= MIN_TERM_LENGTH;
    return {
      hasValidTerm,
      term,
      filters,
      termParam
    };
  } catch (error) {
    logger == null ? void 0 : logger.error("Error parsing URL:", error);
    return {
      hasValidTerm: false,
      term: null,
      filters: {},
      termParam: null
    };
  }
}
function createSearchPayload(parsed, source) {
  if (!parsed.hasValidTerm || !parsed.term) {
    return null;
  }
  return {
    term: parsed.term,
    filters: parsed.filters,
    source
  };
}
function generateSearchKey(url) {
  try {
    const searchUrl = url || window.location.href;
    const urlObj = new URL(searchUrl, window.location.origin);
    const params = urlObj.searchParams;
    IGNORED_PARAMS.forEach((param) => {
      params.delete(param);
    });
    const entries = [];
    params.forEach((value, key) => {
      entries.push([key, value]);
    });
    const sorted = entries.sort(([a], [b]) => a.localeCompare(b));
    return sorted.map(([key, value]) => `${key}=${value}`).join("&");
  } catch (e) {
    return "";
  }
}

// src/scripts/searchTrackerEntry.ts
function searchTrackerEntryScript(testMode = false) {
  return executeScript(
    {
      scriptName: "Search Tracker Entry",
      testMode,
      testHeaderTitle: "SEARCH TRACKER ENTRY V2 - TEST MODE",
      onError: (error, logger) => {
        logger.error("Error tracking entry search:", error);
        return {
          success: false,
          message: "Failed to track entry search"
        };
      }
    },
    (logger) => {
      logger.log("Processing entry search URL parameters");
      const parsed = parseSearchUrl(void 0, logger);
      if (!parsed.hasValidTerm || !parsed.term) {
        logger.log("No valid search term found");
        return {
          success: false,
          message: "No valid search term found"
        };
      }
      const searchKey = generateSearchKey();
      logger.log("Generated search key:", searchKey);
      if (searchKey === window.__lastSearchKey) {
        logger.log("Duplicate search detected, skipping");
        return {
          success: false,
          message: "Duplicate search (already tracked)",
          term: parsed.term
        };
      }
      window.__lastSearchKey = searchKey;
      logger.log("Updated deduplication key");
      const payload = createSearchPayload(parsed, SEARCH_SOURCES.ENTRY);
      if (!payload) {
        logger.error("Failed to create search payload");
        return {
          success: false,
          message: "Failed to create search payload"
        };
      }
      window.__searchPayload = payload;
      logger.log("Stored search payload:", payload);
      if (window._satellite && typeof window._satellite.track === "function") {
        logger.log('Triggering _satellite.track("searchCommit")');
        window._satellite.track("searchCommit");
      } else {
        const message = testMode ? "_satellite.track() not available (normal in test mode)" : "_satellite.track() not available - ensure AEP Launch is loaded";
        logger.warn(message);
      }
      const filterCount = Object.keys(payload.filters).length;
      return {
        success: true,
        message: "Entry search tracked successfully",
        term: payload.term,
        filterCount
      };
    }
  );
}


return searchTrackerEntryScript(TEST_MODE);