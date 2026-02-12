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

// Extend Window interface to include Adobe Partners namespace
declare global {
  interface Window {
    _adobePartners?: {
      // Event data (from fetchEventData/getEventData)
      eventData?: {
        apiResponse?: unknown;
      };
    };

    /** AEP Launch satellite object */
    _satellite?: {
      setVar: (name: string, value: unknown) => void;
      getVar: (name: string) => Record<string, unknown> | undefined;
      track: (eventName: string) => void;
    };

    // Title change monitoring
    /** Flag to prevent duplicate observer installation */
    __titleMonitorHooked?: boolean;
    /** MutationObserver instance for cleanup */
    __titleMonitorObserver?: MutationObserver;

    // Page view tracking
    /** Debounce timer for page view tracking */
    __pageViewTimer?: ReturnType<typeof setTimeout>;
    /** Last tracked page view key for deduplication */
    __lastPageViewKey?: string;

    // Search tracking
    /** Current search payload */
    __searchPayload?: import('../utils/searchUrlParser.js').SearchPayload;
    /** Debounce timer for dynamic search tracking */
    __searchUrlTimer?: ReturnType<typeof setTimeout>;
    /** Last tracked search key for deduplication */
    __lastSearchKey?: string;
    /** Flag to prevent duplicate URL hook installation */
    __urlHooked?: boolean;
    /** Flag to ensure entry search check runs only once per page load */
    __entrySearchChecked?: boolean;
  }
}
