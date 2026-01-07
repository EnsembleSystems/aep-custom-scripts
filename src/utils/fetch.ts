/**
 * Fetch utilities with timeout support
 */

/**
 * Maximum response size (5MB) - prevents memory exhaustion attacks
 */
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024;

/**
 * Creates a fetch request with automatic timeout handling
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @param timeoutMs - Timeout in milliseconds
 * @returns Promise that resolves with the Response
 */
export function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, { ...options, signal: controller.signal }).finally(() => {
    clearTimeout(timeoutId);
  });
}

/**
 * Validates response size before parsing
 * @param response - Fetch response object
 * @throws Error if response is too large
 */
export function validateResponseSize(response: Response): void {
  const contentLength = response.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
    throw new Error(`Response too large: ${contentLength} bytes (max: ${MAX_RESPONSE_SIZE})`);
  }
}

/**
 * Error types for better error handling
 */
export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError && error.message.includes('fetch');
}
