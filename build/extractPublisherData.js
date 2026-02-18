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

// src/utils/validation.ts
function isValidPublisherId(id) {
  if (!id || typeof id !== "string") {
    return false;
  }
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const salesforcePattern = /^[a-z0-9]{15}([a-z0-9]{3})?$/i;
  return uuidPattern.test(id) || salesforcePattern.test(id);
}

// src/utils/url.ts
function splitPath(path) {
  if (!path || typeof path !== "string") {
    return [];
  }
  return path.split("/");
}
function validatePathStructure(segments, structure) {
  if (structure.minSegments && segments.length < structure.minSegments) {
    return false;
  }
  if (structure.requiredSegments) {
    const allMatch = Object.entries(structure.requiredSegments).every(([key, expectedValue]) => {
      const segmentIndex = structure.segments[key];
      if (segmentIndex === void 0) return true;
      return segments[segmentIndex] === expectedValue;
    });
    if (!allMatch) {
      return false;
    }
  }
  return true;
}
function extractPathSegments(path, structure) {
  const segments = splitPath(path);
  if (!validatePathStructure(segments, structure)) {
    return null;
  }
  const result = {};
  Object.entries(structure.segments).forEach(([key, index]) => {
    const value = segments[index];
    if (value) {
      result[key] = value;
    }
  });
  return result;
}
function extractAndValidate(path, structure, segmentKey, validator) {
  const extracted = extractPathSegments(path, structure);
  if (!extracted || !extracted[segmentKey]) {
    return null;
  }
  const value = extracted[segmentKey];
  if (validator && !validator(value)) {
    return null;
  }
  return value;
}
function createPathStructure(type, config) {
  var _a;
  switch (type) {
    case "nested-resource":
      return {
        segments: {
          empty: 0,
          resourceType: 1,
          subtype: 2,
          id: 3,
          name: 4
        },
        minSegments: (_a = config.minSegments) != null ? _a : 4,
        requiredSegments: config.resourceType ? { resourceType: config.resourceType } : void 0
      };
    default:
      throw new Error(`Unsupported path structure type: ${type}`);
  }
}

// src/scripts/extractPublisherData.ts
var PUBLISHER_URL_STRUCTURE = createPathStructure("nested-resource", {
  resourceType: "publisher",
  minSegments: 4
});
function extractPublisherId(href, logger) {
  const publisherId = extractAndValidate(href, PUBLISHER_URL_STRUCTURE, "id", isValidPublisherId);
  if (!publisherId) {
    logger.log("Invalid or missing publisher ID in URL", href);
    return null;
  }
  return publisherId;
}
var UI_TEXT_PATTERNS = ["view all", "see all", "show more", "see more", "load more"];
function getPublisherNameFromLink(link) {
  const text = (link.textContent || "").trim();
  if (!text) return "";
  if (UI_TEXT_PATTERNS.includes(text.toLowerCase())) return "";
  return text;
}
function extractPublisherName(links, logger) {
  var _a, _b;
  const byTestId = document.querySelector('[data-testid="publisherName-display"]');
  if ((_a = byTestId == null ? void 0 : byTestId.textContent) == null ? void 0 : _a.trim()) {
    logger.log("Found publisher name via data-testid", byTestId.textContent.trim());
    return byTestId.textContent.trim();
  }
  const byLaunchId = document.querySelector('[data-launchid="Publisher"]');
  if ((_b = byLaunchId == null ? void 0 : byLaunchId.textContent) == null ? void 0 : _b.trim()) {
    logger.log("Found publisher name via data-launchid", byLaunchId.textContent.trim());
    return byLaunchId.textContent.trim();
  }
  for (let i = 0; i < links.length; i += 1) {
    const name = getPublisherNameFromLink(links[i]);
    if (name) {
      logger.log("Found publisher name via link text", name);
      return name;
    }
  }
  logger.log("No publisher name found in DOM");
  return "";
}
function extractPublisherDataScript(testMode = false) {
  return executeScript(
    {
      scriptName: "Publisher Data",
      testMode,
      testHeaderTitle: "PUBLISHER DATA EXTRACTOR - TEST MODE",
      onError: (error, logger) => {
        logger.error("Unexpected error parsing publisher data:", error);
        return null;
      }
    },
    (logger) => {
      logger.log("Searching for publisher links in DOM");
      const links = document.querySelectorAll('a[href^="/publisher/"]');
      logger.log(`Found ${links.length} publisher links`);
      let publisherId = null;
      for (let i = 0; i < links.length; i += 1) {
        const href = links[i].getAttribute("href");
        if (href) {
          publisherId = extractPublisherId(href, logger);
          if (publisherId) break;
        }
      }
      if (!publisherId) {
        logger.log("No valid publisher link found in DOM");
        return null;
      }
      const description = extractPublisherName(links, logger);
      const publisherData = {
        publisherID: publisherId,
        description
      };
      logger.log("Found valid publisher data", publisherData);
      return publisherData;
    }
  );
}


return extractPublisherDataScript(TEST_MODE);