/**
 * Cookie utilities for browser environments
 */

/**
 * Gets a cookie value by name
 * @param name - Cookie name
 * @returns Cookie value or null if not found
 */
export function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(';').shift();
    return cookieValue ?? null;
  }

  return null;
}

/**
 * Parses a JSON cookie value with URL decoding
 * @param cookieValue - The raw cookie value
 * @returns Parsed JSON object or null on error
 */
export function parseJsonCookie<T = unknown>(cookieValue: string | null): T | null {
  if (!cookieValue) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(cookieValue)) as T;
  } catch {
    return null;
  }
}
