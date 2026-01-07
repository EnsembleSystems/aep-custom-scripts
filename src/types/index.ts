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

// Extend Window interface to include _eventData and _partnerCardCtx
declare global {
  interface Window {
    _eventData?: {
      apiResponse?: unknown;
    };
    _partnerCardCtx?: PartnerCardCtx | null;
  }
}
