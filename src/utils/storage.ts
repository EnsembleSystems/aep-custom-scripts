/**
 * LocalStorage utilities for browser environments
 */

/**
 * Gets and parses a JSON value from localStorage
 * @param key - Storage key
 * @returns Parsed value or null
 */
export function getStorageItem<T = unknown>(key: string): T | null {
  try {
    const item = localStorage.getItem(key);
    if (!item) {
      return null;
    }
    return JSON.parse(item) as T;
  } catch {
    return null;
  }
}

/**
 * Sets a value in localStorage as JSON
 * @param key - Storage key
 * @param value - Value to store
 * @returns true if successful, false otherwise
 */
export function setStorageItem<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Failed to set storage item ${key}:`, error);
    return false;
  }
}
