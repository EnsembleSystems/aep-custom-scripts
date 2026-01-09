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

// src/utils/cookie.ts
function getCookie(name) {
  var _a;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const cookieValue = (_a = parts.pop()) == null ? void 0 : _a.split(";").shift();
    return cookieValue != null ? cookieValue : null;
  }
  return null;
}
function parseJsonCookie(cookieValue) {
  if (!cookieValue) {
    return null;
  }
  try {
    return JSON.parse(decodeURIComponent(cookieValue));
  } catch (e) {
    return null;
  }
}

// src/utils/object.ts
function removeProperties(data, propertiesToRemove) {
  if (data === null || data === void 0) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => removeProperties(item, propertiesToRemove));
  }
  if (typeof data === "object") {
    const entries = Object.entries(data);
    const cleaned = {};
    entries.forEach(([key, value]) => {
      if (!propertiesToRemove.includes(key)) {
        cleaned[key] = removeProperties(value, propertiesToRemove);
      }
    });
    return cleaned;
  }
  return data;
}

// src/scripts/extractPartnerData.ts
var DEFAULT_COOKIE_KEY = "partner_data";
var PROPERTIES_TO_REMOVE = ["latestAgreementAcceptedVersion"];
function getPartnerData(cookieKey, logger) {
  const partnerCookie = getCookie(cookieKey);
  if (!partnerCookie) {
    logger.log("No partner data in cookies");
    return null;
  }
  const partnerData = parseJsonCookie(partnerCookie);
  if (!partnerData) {
    logger.error("Error parsing partner data from cookie");
    return null;
  }
  if (typeof partnerData === "object" && partnerData !== null && "DXP" in partnerData) {
    const dxpValue = partnerData.DXP;
    const cleanedDxpValue = removeProperties(dxpValue, PROPERTIES_TO_REMOVE);
    logger.log("Found partner data (DXP extracted)", cleanedDxpValue);
    return cleanedDxpValue;
  }
  const cleanedPartnerData = removeProperties(partnerData, PROPERTIES_TO_REMOVE);
  logger.log("Found partner data (no DXP key)", cleanedPartnerData);
  return cleanedPartnerData;
}
function extractPartnerDataScript(testMode = false, cookieKey = DEFAULT_COOKIE_KEY) {
  const config = {
    debug: testMode,
    cookieKey
  };
  const logger = createLogger(config.debug, "Partner Data", testMode);
  try {
    logger.testHeader("PARTNER DATA EXTRACTOR - TEST MODE", `Cookie Key: ${config.cookieKey}`);
    const partnerData = getPartnerData(config.cookieKey, logger);
    logger.testResult(partnerData);
    if (!testMode) {
      logger.log("Returning partner data (DXP value)", partnerData);
    }
    return partnerData;
  } catch (error) {
    logger.error("Unexpected error extracting partner data:", error);
    return null;
  }
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

// src/scripts/customDataCollectionOnFilterClickCallback.ts
var DEFAULT_COOKIE_KEY2 = "partner_data";
var SELECTORS = {
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
var WRAPPER_CLASS = "dx-card-collection-wrapper";
var CONTENT_TYPE = "partner_card";
var DAA_LH_INDICES = {
  POSITION: 0,
  CONTENT_ID: 2
};
function findAncestor(element, predicate, maxDepth = 20) {
  let current = element;
  let depth = 0;
  while (current && depth < maxDepth) {
    if (predicate(current)) {
      return current;
    }
    const parent = current.parentElement;
    if (!parent && current.getRootNode) {
      const root = current.getRootNode();
      if (root instanceof ShadowRoot) {
        current = root.host;
      } else {
        break;
      }
    } else {
      current = parent;
    }
    depth += 1;
  }
  return null;
}
function isPartnerCard(element) {
  const tagName = element.tagName.toLowerCase();
  const hasClass = element.classList.contains(CARD_TYPES.CLASS_NAME);
  return tagName === CARD_TYPES.TAG_NAME || hasClass;
}
function isCardWrapper(element) {
  return element.classList.contains(WRAPPER_CLASS);
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
function extractCardMetadataFromClick(clickedElement, logger) {
  logger.log("Extracting card metadata from clicked element", clickedElement);
  const cardElement = findAncestor(clickedElement, isPartnerCard);
  if (!cardElement) {
    logger.log("Clicked element is not within a partner card");
    return null;
  }
  logger.log("Found partner card element", cardElement);
  const wrapper = findAncestor(cardElement, isCardWrapper);
  if (!wrapper) {
    logger.log("No wrapper found for card element");
    return null;
  }
  logger.log("Found wrapper element", wrapper);
  const { sectionID, filterContext } = extractWrapperContext(wrapper, logger);
  const cardContext = extractCardCtxFromElement(cardElement, sectionID, filterContext, logger);
  if (!cardContext) {
    logger.warn("Failed to extract card context");
    return null;
  }
  return cardContext;
}
function customDataCollectionOnFilterClickCallbackScript(content, testMode = false, cookieKey = DEFAULT_COOKIE_KEY2) {
  var _a, _b;
  const logger = createLogger(testMode, "Filter Click Callback", testMode);
  try {
    logger.testHeader("FILTER CLICK CALLBACK", `Cookie Key: ${cookieKey}`);
    logger.testInfo("Provided content object", content);
    const partnerData = extractPartnerDataScript(testMode, cookieKey);
    logger.log("Extracted partner data", partnerData);
    let cardCollection = null;
    if (content.clickedElement) {
      logger.log("Clicked element provided, extracting card metadata");
      cardCollection = extractCardMetadataFromClick(content.clickedElement, logger);
    } else {
      logger.log("No clicked element provided");
    }
    window._adobePartners = (_a = window._adobePartners) != null ? _a : {};
    window._adobePartners.partnerData = partnerData;
    if (cardCollection) {
      window._adobePartners.partnerCard = (_b = window._adobePartners.partnerCard) != null ? _b : {};
      window._adobePartners.partnerCard.context = cardCollection;
      logger.log("Stored partner data and card context in window._adobePartners");
    } else {
      logger.log("Stored partner data in window._adobePartners (no card context)");
    }
    if (testMode) {
      logger.testResult(window._adobePartners);
    }
  } catch (error) {
    logger.error("Unexpected error in filter click callback:", error);
  }
}


return customDataCollectionOnFilterClickCallbackScript(content, TEST_MODE);