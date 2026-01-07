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

// src/utils/dom.ts
function splitAndGet(value, delimiter, index) {
  if (!value || index < 0) {
    return "";
  }
  const parts = value.split(delimiter).map((part) => part.trim());
  return parts[index] || "";
}
function getAttribute(element, attributeName) {
  if (!element) {
    return "";
  }
  return element.getAttribute(attributeName) || "";
}
function getTextContent(element) {
  var _a;
  if (!element) {
    return "";
  }
  return ((_a = element.textContent) == null ? void 0 : _a.trim()) || "";
}
function queryShadow(element, selector) {
  if (!element) {
    return null;
  }
  const { shadowRoot } = element;
  if (!shadowRoot) {
    return null;
  }
  return shadowRoot.querySelector(selector);
}
function findInComposedPath(event, predicate) {
  const path = event.composedPath();
  const element = path.find((item) => item instanceof Element && predicate(item));
  return element || null;
}
function matchesElement(element, tagName, className) {
  let matches = false;
  if (tagName) {
    matches = matches || element.tagName.toLowerCase() === tagName.toLowerCase();
  }
  if (className) {
    matches = matches || element.classList.contains(className);
  }
  return matches;
}
function dispatchCustomEvent(eventName, detail, logger) {
  if (logger) {
    logger.log(`Dispatching custom event: ${eventName}`, detail);
  }
  document.dispatchEvent(new CustomEvent(eventName, { detail }));
}

// src/scripts/extractPartnerCardCtx.ts
var SELECTORS = {
  CARD_COLLECTION_WRAPPER: ".dx-card-collection-wrapper",
  CARD_TITLE: ".card-title",
  PARTNER_CARDS: ".partner-cards",
  FIRST_LINK: "a"
};
var ATTRIBUTES = {
  DAA_LH: "daa-lh",
  DAA_LL: "daa-ll"
};
var CARD_TYPES = {
  TAG_NAME: "single-partner-card",
  CLASS_NAME: "card-wrapper"
};
var EVENT_NAMES = {
  PARTNER_CARD_CLICK: "partnerCardClick"
};
var CONTENT_TYPE = "partner_card";
var DAA_LH_INDICES = {
  POSITION: 0,
  CONTENT_ID: 2
};
function extractCardCtxFromElement(cardElement, sectionID, filterContext, logger) {
  if (!cardElement) {
    logger.error("Card element is required");
    return null;
  }
  const cardDaaLh = getAttribute(cardElement, ATTRIBUTES.DAA_LH);
  const contentID = splitAndGet(cardDaaLh, "|", DAA_LH_INDICES.CONTENT_ID);
  const position = splitAndGet(cardDaaLh, "|", DAA_LH_INDICES.POSITION);
  const cardTitleElement = queryShadow(cardElement, SELECTORS.CARD_TITLE);
  const cardTitle = getTextContent(cardTitleElement);
  if (!cardTitle) {
    logger.error("Card title not found in shadow DOM");
    return null;
  }
  const firstLink = queryShadow(cardElement, SELECTORS.FIRST_LINK);
  const ctaText = getAttribute(firstLink, ATTRIBUTES.DAA_LL);
  const result = {
    cardTitle,
    contentID,
    contentType: CONTENT_TYPE,
    ctaText,
    filterContext,
    name: cardTitle,
    position,
    sectionID
  };
  logger.log("Extracted card context", result);
  return result;
}
function findCardInPath(event, logger) {
  const cardElement = findInComposedPath(
    event,
    (el) => matchesElement(el, CARD_TYPES.TAG_NAME, CARD_TYPES.CLASS_NAME)
  );
  if (!cardElement) {
    logger.log("Click was not on a card element");
  }
  return cardElement;
}
function handleWrapperClick(event, sectionID, filterContext, logger) {
  var _a, _b;
  const cardElement = findCardInPath(event, logger);
  if (!cardElement) {
    return;
  }
  const cardContext = extractCardCtxFromElement(cardElement, sectionID, filterContext, logger);
  if (!cardContext) {
    logger.warn("Failed to extract card context");
    return;
  }
  window._adobePartners = (_a = window._adobePartners) != null ? _a : {};
  window._adobePartners.partnerCard = (_b = window._adobePartners.partnerCard) != null ? _b : {};
  window._adobePartners.partnerCard.context = cardContext;
  dispatchCustomEvent(EVENT_NAMES.PARTNER_CARD_CLICK, cardContext);
  logger.log("Card click processed successfully");
}
function extractWrapperContext(wrapper, logger) {
  if (!wrapper.parentElement) {
    logger.warn("Wrapper has no parent element, sectionID will be empty");
  }
  const sectionID = getAttribute(wrapper.parentElement, ATTRIBUTES.DAA_LH);
  const { shadowRoot } = wrapper;
  const partnerCardsElement = shadowRoot == null ? void 0 : shadowRoot.querySelector(SELECTORS.PARTNER_CARDS);
  const filterContext = getAttribute(partnerCardsElement, ATTRIBUTES.DAA_LH);
  if (!sectionID) {
    logger.warn("Wrapper missing sectionID (parent daa-lh attribute)");
  }
  return { sectionID, filterContext };
}
function attachListenerToWrapper(wrapper, logger, processedWrappers) {
  if (processedWrappers.has(wrapper)) {
    return false;
  }
  const { sectionID, filterContext } = extractWrapperContext(wrapper, logger);
  wrapper.addEventListener("click", (event) => {
    handleWrapperClick(event, sectionID, filterContext, logger);
  });
  processedWrappers.add(wrapper);
  return true;
}
function setupClickListeners(logger, processedWrappers) {
  const wrappers = document.querySelectorAll(SELECTORS.CARD_COLLECTION_WRAPPER);
  if (wrappers.length === 0) {
    logger.warn("No card collection wrappers found on page");
    return 0;
  }
  let newListeners = 0;
  wrappers.forEach((wrapper) => {
    if (attachListenerToWrapper(wrapper, logger, processedWrappers)) {
      newListeners += 1;
    }
  });
  logger.log(
    `Attached ${newListeners} new click listeners (${wrappers.length} total wrappers on page)`
  );
  return newListeners;
}
function setupDynamicObserver(logger, processedWrappers) {
  const observer = new MutationObserver((mutations) => {
    const newWrappersFound = [];
    mutations.forEach((mutation) => {
      Array.from(mutation.addedNodes).forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) {
          return;
        }
        const element = node;
        if (element.matches(SELECTORS.CARD_COLLECTION_WRAPPER)) {
          if (attachListenerToWrapper(element, logger, processedWrappers)) {
            newWrappersFound.push(element);
          }
        }
        const childWrappers = element.querySelectorAll(SELECTORS.CARD_COLLECTION_WRAPPER);
        Array.from(childWrappers).forEach((wrapper) => {
          if (attachListenerToWrapper(wrapper, logger, processedWrappers)) {
            newWrappersFound.push(wrapper);
          }
        });
      });
    });
    if (newWrappersFound.length > 0) {
      logger.log(`Attached listeners to ${newWrappersFound.length} dynamically loaded wrappers`);
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  logger.log("MutationObserver started - watching for dynamic content");
  return observer;
}
function extractPartnerCardCtxScript(testMode = false) {
  var _a, _b;
  const config = {
    debug: testMode
  };
  const logger = createLogger(config.debug, "Partner Card Context", testMode);
  try {
    window._adobePartners = (_a = window._adobePartners) != null ? _a : {};
    window._adobePartners.partnerCard = (_b = window._adobePartners.partnerCard) != null ? _b : {};
    if (window._adobePartners.partnerCard.observer) {
      logger.log("Script already initialized, skipping duplicate setup");
      return { listenersAttached: 0 };
    }
    logger.testHeader("PARTNER CARD CONTEXT EXTRACTOR - SETUP MODE");
    const processedWrappers = /* @__PURE__ */ new WeakSet();
    const listenerCount = setupClickListeners(logger, processedWrappers);
    const observer = setupDynamicObserver(logger, processedWrappers);
    window._adobePartners.partnerCard.observer = observer;
    const result = { listenersAttached: listenerCount };
    logger.testResult(result);
    logger.log(
      `Setup complete: ${listenerCount} listeners attached, observer watching for dynamic content`
    );
    return result;
  } catch (error) {
    logger.error("Unexpected error during setup:", error);
    return null;
  }
}


return extractPartnerCardCtxScript(TEST_MODE);