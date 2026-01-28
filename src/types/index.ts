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
 * Checkout data extracted when Place Order is clicked
 * Matches XDM schema: _adobepartners.Checkout
 */
export interface CheckoutData {
  cartItems: string;
  paymentType: string;
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
  }
}
