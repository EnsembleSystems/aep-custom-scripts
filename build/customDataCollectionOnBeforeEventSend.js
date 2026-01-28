const TEST_MODE = localStorage.getItem('__aep_scripts_debug') === 'true';

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

// src/utils/extraction.ts
function extractData(config) {
  var _a, _b, _c;
  const rawValue = config.source();
  if (!rawValue) {
    (_a = config.logger) == null ? void 0 : _a.log(config.notFoundMessage || "No data found");
    return null;
  }
  const parsed = config.parser(rawValue);
  if (!parsed) {
    (_b = config.logger) == null ? void 0 : _b.error(config.errorMessage || "Error parsing data");
    return null;
  }
  if (config.validator && !config.validator(parsed)) {
    (_c = config.logger) == null ? void 0 : _c.error("Data validation failed");
    return null;
  }
  return config.transformer ? config.transformer(parsed) : parsed;
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
function ensureNestedPath(obj, path) {
  const keys = Array.isArray(path) ? path : path.split(".");
  let current = obj;
  keys.forEach((key) => {
    if (!(key in current) || typeof current[key] !== "object" || current[key] === null) {
      current[key] = {};
    }
    current = current[key];
  });
  return current;
}
function setNestedValue(obj, path, value, merge = false) {
  const keys = Array.isArray(path) ? path : path.split(".");
  const lastKey = keys.pop();
  if (!lastKey) return;
  const target = ensureNestedPath(obj, keys);
  if (merge && typeof target[lastKey] === "object" && target[lastKey] !== null && typeof value === "object" && value !== null) {
    target[lastKey] = __spreadValues(__spreadValues({}, target[lastKey]), value);
  } else {
    target[lastKey] = value;
  }
}
function conditionalProperties(condition, properties) {
  return condition ? properties : {};
}
function mergeNonNull(...objects) {
  return objects.reduce((acc, obj) => {
    if (!obj) return acc;
    Object.entries(obj).forEach(([key, value]) => {
      if (value !== null && value !== void 0) {
        acc[key] = value;
      }
    });
    return acc;
  }, {});
}

// src/utils/validation.ts
function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function hasProperty(value, property) {
  return isObject(value) && property in value;
}

// src/utils/constants.ts
var DEFAULT_COOKIE_KEYS = ["partner_data", "partner_info"];

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

// src/scripts/extractPartnerData.ts
var PROPERTIES_TO_REMOVE = ["latestAgreementAcceptedVersion"];
var MAGE_CACHE_STORAGE_KEY = "mage-cache-storage";
function extractFromCookie(key, logger) {
  return extractData({
    source: () => getCookie(key),
    parser: parseJsonCookie,
    transformer: (data) => {
      const source = hasProperty(data, "DXP") ? data.DXP : data;
      return removeProperties(source, PROPERTIES_TO_REMOVE);
    },
    logger,
    errorMessage: `Error parsing ${key} from cookie`,
    notFoundMessage: `No data in ${key} cookie`
  });
}
function extractEmailFromStorage() {
  const mageCache = getStorageItem(MAGE_CACHE_STORAGE_KEY);
  const customer = mageCache == null ? void 0 : mageCache.customer;
  const email = customer == null ? void 0 : customer.email;
  return typeof email === "string" && email ? email : null;
}
function extractPartnerDataScript(testMode = false, cookieKeys = DEFAULT_COOKIE_KEYS) {
  return executeScript(
    {
      scriptName: "Partner Data",
      testMode,
      testHeaderTitle: "PARTNER DATA EXTRACTOR - TEST MODE",
      testHeaderExtraInfo: `Cookie Keys: ${cookieKeys.join(", ")}`,
      onError: (error, logger) => {
        logger.error("Unexpected error extracting partner data:", error);
        return null;
      }
    },
    (logger) => {
      const mergedData = cookieKeys.reduce(
        (acc, key) => mergeNonNull(acc, extractFromCookie(key, logger)),
        {}
      );
      if (!mergedData.email) {
        const email = extractEmailFromStorage();
        if (email) {
          mergedData.email = email;
          logger.log("Email extracted from mage-cache-storage");
        }
      }
      if (Object.keys(mergedData).length === 0) {
        logger.log("No partner data found in cookies or storage");
        return null;
      }
      logger.log("Found partner data", mergedData);
      return mergedData;
    }
  );
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
function createElementMatcher(tagName, className) {
  return (element) => {
    if (tagName && element.tagName.toLowerCase() === tagName.toLowerCase()) {
      return true;
    }
    if (className && element.classList.contains(className)) {
      return true;
    }
    return false;
  };
}
function extractStructuredAttribute(element, attributeName, delimiter, indices) {
  const attrValue = getAttribute(element, attributeName);
  if (!attrValue) {
    return {};
  }
  const result = {};
  Object.entries(indices).forEach(([key, index]) => {
    const value = splitAndGet(attrValue, delimiter, index);
    if (value) {
      result[key] = value;
    }
  });
  return result;
}

// src/utils/events.ts
function logEventInfo(event, logger, additionalInfo) {
  if (!event) {
    logger.log("No event object provided");
    return;
  }
  const eventInfo = {
    type: "type" in event ? event.type : "unknown",
    isTrusted: "isTrusted" in event ? event.isTrusted : void 0
  };
  if (event instanceof Event && "composedPath" in event && typeof event.composedPath === "function") {
    eventInfo.composedPath = event.composedPath();
  }
  if (additionalInfo) {
    Object.assign(eventInfo, additionalInfo);
  }
  logger.log("Event information", eventInfo);
}
function shouldProcessEventType(eventType, skipTypes, logger) {
  if (!eventType) {
    return true;
  }
  if (skipTypes.includes(eventType)) {
    logger == null ? void 0 : logger.log(`Skipping event type: ${eventType}`);
    return false;
  }
  return true;
}

// src/scripts/customDataCollectionOnBeforeEventSend.ts
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
var CHECKOUT_SELECTORS = {
  PAYMENT_METHOD_RADIO: 'input[name="payment[method]"]:checked',
  CART_ITEMS_CONTAINER: "ol.minicart-items",
  CART_ITEM: "li.product-item",
  PRODUCT_NAME: ".product-item-name"
};
var MAGE_CACHE_STORAGE_KEY2 = "mage-cache-storage";
var isPartnerCard = createElementMatcher(CARD_TYPES.TAG_NAME, CARD_TYPES.CLASS_NAME);
var isCardWrapper = createElementMatcher(void 0, WRAPPER_CLASS);
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
  const metadata = extractStructuredAttribute(cardElement, ATTRIBUTES.DAA_LH, "|", {
    contentID: DAA_LH_INDICES.CONTENT_ID,
    position: DAA_LH_INDICES.POSITION
  });
  return {
    contentID: metadata.contentID || "",
    position: metadata.position || ""
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
function extractLinkDaaLl(event) {
  console.log("[extractLinkDaaLl] Called with event:", event);
  if (!event) {
    console.log("[extractLinkDaaLl] No event provided, returning empty string");
    return "";
  }
  const isLink = createElementMatcher("a");
  const linkElement = findInComposedPath(event, isLink);
  console.log("[extractLinkDaaLl] Found link element:", linkElement);
  const daaLlValue = getAttribute(linkElement, ATTRIBUTES.DAA_LL);
  console.log("[extractLinkDaaLl] daa-ll value:", daaLlValue);
  return daaLlValue;
}
function isPlaceOrderClick(event) {
  var _a;
  if (!event) return false;
  const isPlaceOrderButton = createElementMatcher("button", "action");
  const button = findInComposedPath(event, isPlaceOrderButton);
  if (!button) return false;
  const hasCheckoutClass = button.classList.contains("checkout");
  const hasPlaceOrderText = (_a = button.textContent) == null ? void 0 : _a.toLowerCase().includes("place order");
  return hasCheckoutClass && !!hasPlaceOrderText;
}
function extractPaymentType(logger) {
  const checkedRadio = document.querySelector(
    CHECKOUT_SELECTORS.PAYMENT_METHOD_RADIO
  );
  if (!checkedRadio) {
    logger.log("No payment method selected");
    return "";
  }
  const label = document.querySelector(`label[for="${checkedRadio.id}"]`);
  const rawPaymentType = getTextContent(label) || checkedRadio.value;
  const paymentType = rawPaymentType.startsWith("Invoice") ? "Invoice" : "Credit Card";
  logger.log("Extracted payment type", paymentType);
  return paymentType;
}
function extractCartItemsFromStorage(logger) {
  var _a, _b;
  const cacheData = getStorageItem(MAGE_CACHE_STORAGE_KEY2);
  if (!((_b = (_a = cacheData == null ? void 0 : cacheData.cart) == null ? void 0 : _a.items) == null ? void 0 : _b.length)) {
    return null;
  }
  const cartItems = cacheData.cart.items.map((item) => ({
    type: item.product_type || "",
    quantity: item.qty || 0,
    productID: item.product_id || "",
    productName: item.product_name || "",
    SKU: item.product_sku || "",
    url: item.product_url || "",
    price: item.product_price_value || 0
  }));
  logger.log("Extracted cart items from localStorage", cartItems);
  return cartItems;
}
function extractCartItemsFromDOM(logger) {
  const itemElements = document.querySelectorAll(
    `${CHECKOUT_SELECTORS.CART_ITEMS_CONTAINER} ${CHECKOUT_SELECTORS.CART_ITEM}`
  );
  if (!itemElements.length) {
    logger.log("No cart items found in DOM");
    return [];
  }
  const cartItems = [];
  itemElements.forEach((item) => {
    const nameElement = item.querySelector(CHECKOUT_SELECTORS.PRODUCT_NAME);
    const productName = getTextContent(nameElement);
    if (productName) {
      cartItems.push({
        type: "",
        quantity: 0,
        productID: "",
        productName,
        SKU: "",
        url: "",
        price: 0
      });
    }
  });
  logger.log("Extracted cart items from DOM (fallback)", cartItems);
  return cartItems;
}
function extractCartItems(logger) {
  const storageItems = extractCartItemsFromStorage(logger);
  if (storageItems) {
    return storageItems;
  }
  logger.log("localStorage extraction failed, falling back to DOM");
  return extractCartItemsFromDOM(logger);
}
function extractCheckoutData(event, logger) {
  if (!isPlaceOrderClick(event)) {
    return null;
  }
  logger.log("Place Order button clicked, extracting checkout data");
  const paymentType = extractPaymentType(logger);
  const itemsInCart = extractCartItems(logger);
  if (!paymentType && !itemsInCart.length) {
    logger.warn("Could not extract checkout data");
    return null;
  }
  const checkoutData = {
    paymentType,
    itemsInCart
  };
  logger.log("Extracted checkout data", checkoutData);
  return checkoutData;
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
function customDataCollectionOnBeforeEventSendScript(content, event, testMode = false, cookieKeys = DEFAULT_COOKIE_KEYS) {
  return executeScript(
    {
      scriptName: "Before Send Callback",
      testMode,
      testHeaderTitle: "BEFORE SEND EVENT CALLBACK - TEST MODE",
      testHeaderExtraInfo: `Cookie Keys: ${cookieKeys.join(", ")}`,
      onError: (error, logger) => {
        logger.error("Unexpected error in before send callback:", error);
        return content;
      }
    },
    (logger) => {
      var _a;
      logEventInfo(event, logger);
      if (!shouldProcessEventType((_a = content.xdm) == null ? void 0 : _a.eventType, ["web.webpagedetails.pageViews"], logger)) {
        return content;
      }
      const pageName = document.title;
      logger.log("Extracted page name", pageName);
      const partnerData = extractPartnerDataScript(testMode, cookieKeys);
      logger.log("Extracted partner data from cookie", partnerData);
      const cardCollection = extractCardCollectionFromEvent(event, logger);
      const linkClickLabel = extractLinkDaaLl(event);
      if (linkClickLabel) {
        logger.log("Extracted link daa-ll", linkClickLabel);
      }
      const checkout = extractCheckoutData(event, logger);
      if (pageName) {
        setNestedValue(content, "xdm.web.webPageDetails.name", pageName, true);
      }
      setNestedValue(
        content,
        "xdm._adobepartners",
        mergeNonNull(
          { partnerData },
          conditionalProperties(cardCollection !== null, { cardCollection }),
          conditionalProperties(linkClickLabel !== "", { linkClickLabel }),
          conditionalProperties(checkout !== null, { Checkout: checkout })
        ),
        true
      );
      return content;
    }
  );
}


return customDataCollectionOnBeforeEventSendScript(content, event, TEST_MODE);