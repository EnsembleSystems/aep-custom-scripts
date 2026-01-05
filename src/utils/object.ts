/**
 * Object manipulation utilities
 */

/**
 * Recursively removes specified properties from an object or array
 * @param data - The data to process (object, array, or primitive)
 * @param propertiesToRemove - Array of property names to remove
 * @returns A new object/array with the specified properties removed
 *
 * @example
 * const data = { foo: 'bar', secret: 'password', nested: { secret: 'hidden' } };
 * const cleaned = removeProperties(data, ['secret']);
 * // Returns: { foo: 'bar', nested: {} }
 *
 * @example
 * const data = { agreement: 'v1', data: { agreement: 'v2', value: 123 } };
 * const cleaned = removeProperties(data, ['agreement', 'unused']);
 * // Returns: { data: { value: 123 } }
 */
export default function removeProperties(
  data: unknown,
  propertiesToRemove: string[]
): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => removeProperties(item, propertiesToRemove));
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data);
    const cleaned: Record<string, unknown> = {};

    entries.forEach(([key, value]) => {
      if (!propertiesToRemove.includes(key)) {
        cleaned[key] = removeProperties(value, propertiesToRemove);
      }
    });

    return cleaned;
  }

  return data;
}
