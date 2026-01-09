/**
 * Validation utilities for input sanitization
 */

/**
 * Validates if a string is a valid publisher ID
 * Supports two formats:
 * 1. UUID format: "510e1fe9-6a03-4cfb-b1a9-42e2ceef6cd9"
 * 2. Salesforce ID format: "0011O000020psd3QAA" (15 or 18 characters, alphanumeric)
 */
export function isValidPublisherId(id: string | undefined): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }

  // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Salesforce ID format: 15 or 18 alphanumeric characters
  const salesforcePattern = /^[a-z0-9]{15}([a-z0-9]{3})?$/i;

  return uuidPattern.test(id) || salesforcePattern.test(id);
}

/**
 * Type guard to check if value is a non-null object
 * @param value - Value to check
 * @returns true if value is a non-null object (not array)
 *
 * @example
 * if (isObject(data) && 'DXP' in data) {
 *   // TypeScript knows data is Record<string, unknown>
 * }
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard to check if value has a specific property
 * @param value - Value to check
 * @param property - Property name to check for
 * @returns true if value is an object with the specified property
 *
 * @example
 * if (hasProperty(data, 'DXP')) {
 *   // TypeScript knows data.DXP exists
 * }
 */
export function hasProperty<T extends string>(
  value: unknown,
  property: T
): value is Record<T, unknown> {
  return isObject(value) && property in value;
}

/**
 * Type guard to check if value is a string
 * @param value - Value to check
 * @returns true if value is a string
 *
 * @example
 * if (isString(value)) {
 *   // TypeScript knows value is string
 * }
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard to check if value is an array
 * @param value - Value to check
 * @returns true if value is an array
 *
 * @example
 * if (isArray<number>(value)) {
 *   // TypeScript knows value is number[]
 * }
 */
export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}
