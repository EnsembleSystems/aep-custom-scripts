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
  }
}
