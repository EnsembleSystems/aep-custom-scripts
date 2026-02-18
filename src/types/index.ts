/**
 * Common types for AEP Custom Scripts
 */

export interface BaseConfig {
  timeout?: number;
}

export interface LoggerConfig {
  prefix: string;
  isTestMode: boolean;
}

export type FetchResult<T> = T | null;

/**
 * Partner Card Context type
 * Used by partner card tracking scripts
 */
export interface PartnerCardCtx {
  cardTitle: string;
  contentID: string;
  contentType: string;
  ctaText: string;
  filterContext: string;
  name: string;
  position: string;
  sectionID: string;
}

/**
 * Cart item data extracted from Magento's mage-cache-storage
 * Matches XDM schema: _adobepartners.Checkout.itemsInCart[]
 */
export interface CartItem {
  type: string;
  quantity: number;
  productID: string;
  productName: string;
  SKU: string;
  url: string;
  price: number;
}

/**
 * Checkout data extracted when Place Order is clicked
 * Matches XDM schema: _adobepartners.Checkout
 */
export interface CheckoutData {
  paymentType: string;
  itemsInCart: CartItem[];
}

/**
 * IMS organization data extracted from localStorage
 * Used by extractImsData and customDataCollectionOnBeforeEventSend
 */
export interface ImsData {
  imsID: string;
  imsName: string;
}

/**
 * Publisher data extracted from DOM links
 * Used by extractPublisherData and customDataCollectionOnBeforeEventSend
 */
export interface PublisherData {
  publisherID: string;
  description: string;
}

// Extend Window interface to include Adobe Partners namespace
declare global {
  interface Window {
    _adobePartners?: {
      // Event data (from fetchEventData/getEventData)
      eventData?: {
        apiResponse?: unknown;
      };

      // Title change monitoring
      /** Flag to prevent duplicate observer installation */
      titleMonitorHooked?: boolean;
      /** MutationObserver instance for cleanup */
      titleMonitorObserver?: MutationObserver;

      // Page view tracking
      /** Debounce timer for page view tracking */
      pageViewTimer?: ReturnType<typeof setTimeout>;
      /** Last tracked page view key for deduplication */
      lastPageViewKey?: string;
      /** Previous page URL for SPA referrer tracking */
      previousPageUrl?: string;

      // Search tracking
      /** Current search payload */
      searchPayload?: import('../utils/searchUrlParser.js').SearchPayload;
      /** Debounce timer for dynamic search tracking */
      searchUrlTimer?: ReturnType<typeof setTimeout>;
      /** Last tracked search key for deduplication */
      lastSearchKey?: string;
      /** Flag to prevent duplicate URL hook installation */
      urlHooked?: boolean;
      /** Flag to ensure entry search check runs only once per page load */
      entrySearchChecked?: boolean;
    };

    /** AEP Launch satellite object */
    _satellite?: {
      setVar: (name: string, value: unknown) => void;
      getVar: (name: string) => Record<string, unknown> | undefined;
      track: (eventName: string) => void;
    };
  }
}
