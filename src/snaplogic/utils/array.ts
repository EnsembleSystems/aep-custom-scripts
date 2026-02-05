/**
 * ES5-compatible array utilities for SnapLogic (Nashorn)
 */

import type { JavaArrayList } from '../types/index.js';

// Declare Java ArrayList class (injected by SnapLogic runtime via importClass)
declare const ArrayList: new <T>() => JavaArrayList<T>;

/**
 * Convert JS array to Java ArrayList for proper JSON serialization in Nashorn.
 * Without this conversion, JS arrays serialize as objects with numeric keys: {"0": "val", "1": "val2"}
 * With ArrayList, they serialize correctly as JSON arrays: ["val", "val2"]
 */
export function toArrayList<T>(jsArray: T[]): JavaArrayList<T> {
  const arrayList = new ArrayList<T>();
  for (let i = 0; i < jsArray.length; i += 1) {
    arrayList.add(jsArray[i]);
  }
  return arrayList;
}

/**
 * Check if array contains a value (ES5 compatible - no Array.includes)
 */
export function arrayContains<T>(arr: T[], value: T): boolean {
  for (let idx = 0; idx < arr.length; idx += 1) {
    if (arr[idx] === value) return true;
  }
  return false;
}

/**
 * Add value to array if not already present
 */
export function addUnique<T>(arr: T[], value: T | null | undefined): void {
  if (value != null && !arrayContains(arr, value)) {
    arr.push(value);
  }
}

/**
 * Check if object has own property (ES5 safe)
 */
export function hasOwn(obj: Record<string, unknown>, prop: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}
