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

// Extend Window interface to include _eventData, _partnerCardCtx, and _partnerCardObserver
declare global {
  interface Window {
    _eventData?: {
      apiResponse?: unknown;
    };
    _partnerCardCtx?: PartnerCardCtx | null;
    _partnerCardObserver?: MutationObserver;
    _partnerCardXdmCache?: {
      timestamp: number;
      data: unknown;
      sourceData: PartnerCardCtx | null;
    };
  }
}
