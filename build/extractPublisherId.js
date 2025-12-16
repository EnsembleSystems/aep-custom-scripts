return (() => {
  const TEST_MODE = false;

  // src/utils/logger.ts
  var Logger = class {
    constructor(debug, prefix, isTestMode) {
      this.debug = debug;
      this.prefix = prefix;
      this.isTestMode = isTestMode;
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
  function createLogger(debug, scriptName, isTestMode) {
    const prefix = isTestMode ? `[${scriptName} Test]` : `[AEP ${scriptName}]`;
    return new Logger(debug, prefix, isTestMode);
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

  // src/scripts/extractPublisherId.ts
  function extractPublisherId(href, logger) {
    const URL_PARTS = {
      EMPTY: 0,
      // ''
      PUBLISHER: 1,
      // 'publisher'
      APP_TYPE: 2,
      // 'cc' | 'dc' | 'ec'
      ID: 3,
      // actual ID
      NAME: 4
      // publisher name
    };
    const MIN_PARTS = 4;
    const parts = href.split("/");
    if (parts.length >= MIN_PARTS && parts[URL_PARTS.PUBLISHER] === "publisher") {
      const publisherId = parts[URL_PARTS.ID];
      if (publisherId && isValidPublisherId(publisherId)) {
        return publisherId;
      }
      logger.log("Invalid publisher ID format", publisherId);
    }
    return null;
  }
  function extractPublisherIdScript(testMode = false) {
    const config = {
      debug: testMode
    };
    const logger = createLogger(config.debug, "Publisher ID", testMode);
    try {
      logger.testHeader("PUBLISHER ID EXTRACTOR - TEST MODE");
      logger.log("Searching for publisher links in DOM");
      const links = document.querySelectorAll(
        'a[href^="/publisher/"]'
      );
      logger.log(`Found ${links.length} publisher links`);
      for (let i = 0; i < links.length; i += 1) {
        const href = links[i].getAttribute("href");
        if (href) {
          const publisherId = extractPublisherId(href, logger);
          if (publisherId) {
            logger.log("Found valid publisher ID", publisherId);
            logger.testResult(`Publisher ID: ${publisherId}`);
            return publisherId;
          }
        }
      }
      logger.log("No valid publisher link found in DOM");
      logger.testResult("null (no publisher link found)");
      return null;
    } catch (error) {
      logger.error("Unexpected error parsing publisher ID:", error);
      return null;
    }
  }


  return extractPublisherIdScript(TEST_MODE);
})();