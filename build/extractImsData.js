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

// src/utils/storage.ts
function getStorageItem(key) {
  try {
    const item = localStorage.getItem(key);
    if (!item) {
      return null;
    }
    return JSON.parse(item);
  } catch (e) {
    return null;
  }
}

// src/utils/validation.ts
function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isString(value) {
  return typeof value === "string";
}
function isArray(value) {
  return Array.isArray(value);
}

// src/scripts/extractImsData.ts
var SELECTED_ORG_KEY = "selectedOrg";
var ORGS_ARR_KEY = "orgsArr";
function extractFromOrgObject(selectedOrg, logger) {
  if (!isObject(selectedOrg) || !isString(selectedOrg.id) || !selectedOrg.id) {
    return null;
  }
  const id = selectedOrg.id;
  const { name } = selectedOrg;
  logger.log("Found IMS data from selectedOrg object", { id, name });
  return { imsID: id, imsName: isString(name) ? name : "" };
}
function findOrgInArray(orgId, logger) {
  const orgsArr = getStorageItem(ORGS_ARR_KEY);
  if (!isArray(orgsArr) || orgsArr.length === 0) {
    logger.log("No orgsArr found in localStorage");
    return null;
  }
  const match = orgsArr.find(
    (org) => isObject(org) && isString(org.orgID) && org.orgID === orgId
  );
  if (!match) {
    logger.log(`No matching org found for ID: ${orgId}`);
    return null;
  }
  logger.log("Found IMS data from orgsArr lookup", {
    orgCode: match.orgCode,
    orgName: match.orgName
  });
  return {
    imsID: isString(match.orgCode) ? match.orgCode : "",
    imsName: isString(match.orgName) ? match.orgName : ""
  };
}
function extractImsDataScript(testMode = false) {
  return executeScript(
    {
      scriptName: "IMS Data",
      testMode,
      testHeaderTitle: "IMS DATA EXTRACTOR - TEST MODE",
      onError: (error, logger) => {
        logger.error("Unexpected error extracting IMS data:", error);
        return null;
      }
    },
    (logger) => {
      const selectedOrg = getStorageItem(SELECTED_ORG_KEY);
      if (selectedOrg === null) {
        logger.log("No selectedOrg found in localStorage");
        return null;
      }
      const fromObject = extractFromOrgObject(selectedOrg, logger);
      if (fromObject) return fromObject;
      if (isString(selectedOrg) && selectedOrg || typeof selectedOrg === "number") {
        const orgId = String(selectedOrg);
        logger.log(`selectedOrg is a string/numeric ID: ${orgId}, looking up in orgsArr`);
        const fromArray = findOrgInArray(orgId, logger);
        if (fromArray) return fromArray;
      }
      logger.log("Unable to resolve IMS data from localStorage");
      return null;
    }
  );
}


return extractImsDataScript(TEST_MODE);