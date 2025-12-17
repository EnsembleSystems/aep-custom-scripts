/**
 * Common types for AEP Custom Scripts
 */

export interface BaseConfig {
  debug?: boolean;
  timeout?: number;
}

export interface LoggerConfig {
  debug: boolean;
  prefix: string;
}

export type FetchResult<T> = T | null;

// Extend Window interface to include _eventData
declare global {
  interface Window {
    _eventData?: {
      apiResponse?: unknown;
    };
  }
}
