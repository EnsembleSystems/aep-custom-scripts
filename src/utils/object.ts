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
export default function removeProperties(data: unknown, propertiesToRemove: string[]): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => removeProperties(item, propertiesToRemove));
  }

  if (typeof data === 'object') {
    return Object.entries(data).reduce<Record<string, unknown>>((cleaned, [key, value]) => {
      if (propertiesToRemove.includes(key)) {
        return cleaned;
      }
      return {
        ...cleaned,
        [key]: removeProperties(value, propertiesToRemove),
      };
    }, {});
  }

  return data;
}

/**
 * Ensures a nested path exists in an object, creating intermediate objects as needed
 * Returns the object at the end of the path
 * @param obj - Root object
 * @param path - Dot-notation path or array of keys
 * @returns The object at the end of the path
 *
 * @example
 * const obj = {};
 * ensureNestedPath(obj, 'xdm._adobepartners');
 * // obj.xdm._adobepartners now exists
 */
export function ensureNestedPath(
  obj: Record<string, unknown>,
  path: string | string[]
): Record<string, unknown> {
  const keys = Array.isArray(path) ? path : path.split('.');
  let current = obj;

  keys.forEach((key) => {
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  });

  return current;
}

/**
 * Sets a value at a nested path, creating intermediate objects as needed
 * @param obj - Root object
 * @param path - Dot-notation path or array of keys
 * @param value - Value to set
 * @param merge - If true, merges with existing object instead of replacing
 *
 * @example
 * const obj = {};
 * setNestedValue(obj, 'xdm._adobepartners', { partnerData: 'value' });
 * // obj.xdm._adobepartners.partnerData = 'value'
 *
 * @example
 * setNestedValue(obj, 'xdm._adobepartners', { cardCollection: 'value' }, true);
 * // Merges with existing object instead of replacing
 */
export function setNestedValue(
  obj: Record<string, unknown>,
  path: string | string[],
  value: unknown,
  merge: boolean = false
): void {
  const keys = Array.isArray(path) ? path : path.split('.');
  const lastKey = keys.pop();

  if (!lastKey) return;

  const target = ensureNestedPath(obj, keys);

  if (
    merge &&
    typeof target[lastKey] === 'object' &&
    target[lastKey] !== null &&
    typeof value === 'object' &&
    value !== null
  ) {
    target[lastKey] = {
      ...(target[lastKey] as Record<string, unknown>),
      ...(value as Record<string, unknown>),
    };
  } else {
    target[lastKey] = value;
  }
}

/**
 * Conditionally includes properties in an object
 * @param condition - Condition to check
 * @param properties - Properties to include if condition is true
 * @returns Object with properties or empty object
 *
 * @example
 * const result = {
 *   ...base,
 *   ...conditionalProperties(cardCollection !== null, { cardCollection })
 * };
 */
export function conditionalProperties<T extends Record<string, unknown>>(
  condition: boolean,
  properties: T
): T | Record<string, unknown> {
  return condition ? properties : {};
}

/**
 * Merges objects, excluding null/undefined values
 * @param objects - Objects to merge
 * @returns Merged object without null/undefined values
 *
 * @example
 * const result = mergeNonNull(
 *   { a: 1 },
 *   { b: null },
 *   { c: 2 }
 * );
 * // Returns { a: 1, c: 2 }
 */
export function mergeNonNull<T extends Record<string, unknown>>(
  ...objects: Array<T | null | undefined>
): Partial<T> {
  return objects.reduce<Partial<T>>((acc, obj) => {
    if (!obj) return acc;

    Object.entries(obj).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        acc[key as keyof T] = value as T[keyof T];
      }
    });

    return acc;
  }, {});
}
