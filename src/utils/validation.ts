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
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Salesforce ID format: 15 or 18 alphanumeric characters
  const salesforcePattern = /^[a-z0-9]{15}([a-z0-9]{3})?$/i;

  return uuidPattern.test(id) || salesforcePattern.test(id);
}
