/**
 * Common types for AEP Custom Scripts
 */

import { PartnerCardCtx } from '../scripts/extractPartnerCardCtx';

export interface BaseConfig {
  debug?: boolean;
  timeout?: number;
}

export interface LoggerConfig {
  debug: boolean;
  prefix: string;
}

export type FetchResult<T> = T | null;

// Extend Window interface to include Adobe Partners namespace
declare global {
  interface Window {
    _adobePartners?: {
      // Partner data (from extractPartnerData)
      partnerData?: unknown;

      // Event data (from fetchEventData/getEventData)
      eventData?: {
        apiResponse?: unknown;
      };

      // Partner card tracking (from extractPartnerCardCtx/getPartnerCardCtxXdm)
      partnerCard?: {
        context?: PartnerCardCtx | null;
        initialized?: boolean;
        lastClickEvent?: Event;
        xdmCache?: {
          timestamp: number;
          data: unknown;
          sourceData: PartnerCardCtx | null;
        };
      };
    };
  }
}
