/**
 * SnapLogic Script Types
 *
 * Type definitions for SnapLogic Script Snap environment (Nashorn/JDK 7-8)
 */

/**
 * Java Map interface (LinkedHashMap)
 */
export interface JavaMap {
  get(key: string): unknown;
  put(key: string, value: unknown): void;
  size(): number;
}

/**
 * SnapLogic Logger interface
 */
export interface SnapLogicLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
}

/**
 * SnapLogic Input Stream interface
 */
export interface SnapLogicInput {
  hasNext(): boolean;
  next(): JavaMap;
}

/**
 * SnapLogic Output Stream interface
 */
export interface SnapLogicOutput {
  write(doc: unknown): void;
  write(inDoc: unknown, outDoc: unknown): void;
}

/**
 * SnapLogic Error Stream interface
 */
export interface SnapLogicError {
  write(doc: unknown): void;
}

/**
 * Java ArrayList interface - required for proper JSON array serialization in Nashorn
 */
export interface JavaArrayList<T> {
  add(value: T): void;
  get(index: number): T;
  size(): number;
}

/**
 * SnapLogic ScriptHook implementation interface
 */
export interface ScriptHookImpl {
  input: SnapLogicInput;
  output: SnapLogicOutput;
  error: SnapLogicError;
  log: SnapLogicLogger;
  execute(): void;
  cleanup(): void;
}

/**
 * Raw card from Chimera API (as Java Map)
 */
export interface RawCardMap extends JavaMap {
  get(key: 'id'): string;
  get(key: 'tags'): JavaMap[];
  get(key: 'ctaLink'): string | null;
  get(key: 'overlayLink'): string | null;
  get(key: 'footer'): JavaMap[] | null;
}

/**
 * Footer item structure
 */
export interface FooterItem {
  left?: Array<{ href?: string }>;
  center?: Array<{ href?: string }>;
  right?: Array<{ href?: string }>;
  altCta?: Array<{ href?: string }>;
}

/**
 * Card object after conversion from Java Map
 */
export interface CardObject {
  id: string;
  tags: Array<{ id: string }>;
  ctaLink: string | null;
  overlayLink: string | null;
  footer: FooterItem[] | null;
}

/**
 * Transformed card with extracted data
 */
export interface TransformedCard {
  id: string;
  tags: string[];
  ctaHrefs: string[];
}

/**
 * Base caasCard structure (shared fields)
 * Note: Arrays are JavaArrayList for proper JSON serialization in Nashorn
 */
interface BaseCaasCard {
  id: string;
  tags: JavaArrayList<string>;
  snapshot_ts: string;
}

/**
 * Extended caasCard with ctahrefs (for card-based output)
 */
interface CardCaasCard extends BaseCaasCard {
  ctahrefs: JavaArrayList<string>;
}

/**
 * Generic XDM record wrapper for _adobepartners structure
 */
interface XdmRecord<T extends BaseCaasCard> {
  _id: string;
  _adobepartners: {
    caasCard: T;
  };
}

/** XDM record keyed by card ID (includes ctahrefs) */
export type XdmCardRecord = XdmRecord<CardCaasCard>;

/** XDM record keyed by URL */
export type XdmUrlRecord = XdmRecord<BaseCaasCard>;
