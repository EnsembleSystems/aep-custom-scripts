const TEST_MODE = false;

var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));

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
    return Object.entries(data).reduce((cleaned, [key, value]) => {
      if (propertiesToRemove.includes(key)) {
        return cleaned;
      }
      return __spreadProps(__spreadValues({}, cleaned), {
        [key]: removeProperties(value, propertiesToRemove)
      });
    }, {});
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
    cookieKey
  };
  const logger = createLogger("Partner Data", testMode);
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
function findInComposedPath(event, predicate) {
  const path = event.composedPath();
  const element = path.find((item) => item instanceof Element && predicate(item));
  return element || null;
}

// src/scripts/customDataCollectionOnBeforeEventSend.ts
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
function extractCardMetadata(cardElement) {
  const cardDaaLh = getAttribute(cardElement, ATTRIBUTES.DAA_LH);
  return {
    contentID: splitAndGet(cardDaaLh, "|", DAA_LH_INDICES.CONTENT_ID),
    position: splitAndGet(cardDaaLh, "|", DAA_LH_INDICES.POSITION)
  };
}
function extractCardTitle(cardElement, logger) {
  const cardTitleElement = queryShadow(cardElement, SELECTORS.CARD_TITLE);
  const cardTitle = getTextContent(cardTitleElement);
  if (!cardTitle) {
    logger.error("Card title not found in shadow DOM");
    return null;
  }
  return cardTitle;
}
function extractCtaText(cardElement) {
  const firstLink = queryShadow(cardElement, SELECTORS.FIRST_LINK);
  return getAttribute(firstLink, ATTRIBUTES.DAA_LL);
}
function extractCardCtxFromElement(cardElement, sectionID, filterContext, logger) {
  if (!cardElement) {
    logger.error("Card element is required");
    return null;
  }
  const { contentID, position } = extractCardMetadata(cardElement);
  const cardTitle = extractCardTitle(cardElement, logger);
  if (!cardTitle) {
    return null;
  }
  const ctaText = extractCtaText(cardElement);
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
function extractCardMetadataFromEvent(event, logger) {
  logger.log("Extracting card metadata from event.composedPath()");
  const cardElement = findInComposedPath(event, isPartnerCard);
  if (!cardElement) {
    logger.log("Event did not occur within a partner card");
    return null;
  }
  logger.log("Found partner card element in composed path", cardElement);
  const wrapper = findInComposedPath(event, isCardWrapper);
  if (!wrapper) {
    logger.log("No wrapper found in composed path");
    return null;
  }
  logger.log("Found wrapper element in composed path", wrapper);
  const { sectionID, filterContext } = extractWrapperContext(wrapper, logger);
  const cardContext = extractCardCtxFromElement(cardElement, sectionID, filterContext, logger);
  if (!cardContext) {
    logger.warn("Failed to extract card context");
    return null;
  }
  return cardContext;
}
function shouldProcessEvent(content, logger) {
  var _a;
  if (((_a = content.xdm) == null ? void 0 : _a.eventType) === "web.webpagedetails.pageViews") {
    logger.log("Skipping page view event");
    return false;
  }
  return true;
}
function logEventInfo(event, logger) {
  if (event) {
    logger.log("Event object available", { isTrusted: event.isTrusted, type: event.type });
    if (event.composedPath) {
      logger.log("Event composed path available", event.composedPath());
    }
  } else {
    logger.log("No event object provided");
  }
}
function extractCardCollectionFromEvent(event, logger) {
  if (!event) {
    logger.log("No event provided, skipping card collection extraction");
    return null;
  }
  const cardCollection = extractCardMetadataFromEvent(event, logger);
  if (cardCollection) {
    logger.log("Extracted card collection from event", cardCollection);
  } else {
    logger.log("No card collection found in event (click was not on a partner card)");
  }
  return cardCollection;
}
function customDataCollectionOnBeforeEventSendScript(content, event, testMode = false, cookieKey = DEFAULT_COOKIE_KEY2) {
  const logger = createLogger("Before Send Callback", testMode);
  try {
    logger.testHeader("BEFORE SEND EVENT CALLBACK - TEST MODE", `Cookie Key: ${cookieKey}`);
    logEventInfo(event, logger);
    if (!shouldProcessEvent(content, logger)) {
      return content;
    }
    const partnerData = extractPartnerDataScript(testMode, cookieKey);
    logger.log("Extracted partner data from cookie", partnerData);
    const cardCollection = extractCardCollectionFromEvent(event, logger);
    if (!content.xdm) content.xdm = {};
    if (!content.xdm._adobepartners) content.xdm._adobepartners = {};
    content.xdm._adobepartners.partnerData = partnerData;
    content.xdm._adobepartners.cardCollection = cardCollection;
    logger.testResult(content);
    if (!testMode) {
      logger.log("Returning content with partner data and card collection", content);
    }
    return content;
  } catch (error) {
    logger.error("Unexpected error in before send callback:", error);
    return content;
  }
}


return customDataCollectionOnBeforeEventSendScript(content, event, TEST_MODE);