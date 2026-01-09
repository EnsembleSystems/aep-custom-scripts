/**
 * Data transformation utilities for processing and reshaping data structures
 */

/**
 * Type for a transformation function
 */
export type TransformFn<TInput = unknown, TOutput = unknown> = (input: TInput) => TOutput;

/**
 * Configuration for field transformation
 */
export interface FieldTransform {
  source: string;
  target?: string;
  transform?: TransformFn;
}

/**
 * Safely gets a nested property from an object using dot notation
 * @param obj - Object to extract from
 * @param path - Dot-notation path (e.g., 'user.profile.name')
 * @param defaultValue - Value to return if path doesn't exist
 * @returns Value at path or default value
 *
 * @example
 * getNestedProperty({ user: { name: 'John' } }, 'user.name') // Returns 'John'
 * getNestedProperty({ user: {} }, 'user.name', 'Unknown') // Returns 'Unknown'
 */
export function getNestedProperty<T = unknown>(
  obj: Record<string, unknown>,
  path: string,
  defaultValue?: T
): T | undefined {
  const keys = path.split('.');
  const current = keys.reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);

  return current !== undefined ? (current as T) : defaultValue;
}

/**
 * Sets a nested property in an object using dot notation
 * @param obj - Object to modify
 * @param path - Dot-notation path
 * @param value - Value to set
 *
 * @example
 * const obj = {};
 * setNestedProperty(obj, 'user.profile.name', 'John');
 * // obj is now { user: { profile: { name: 'John' } } }
 */
export function setNestedProperty(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const keys = path.split('.');
  const lastKey = keys.pop();

  if (!lastKey) return;

  const current = keys.reduce<Record<string, unknown>>((acc, key) => {
    if (!(key in acc) || typeof acc[key] !== 'object' || acc[key] === null) {
      acc[key] = {};
    }
    return acc[key] as Record<string, unknown>;
  }, obj);

  current[lastKey] = value;
}

/**
 * Transforms data by extracting and optionally transforming specific fields
 * @param data - Source data object
 * @param transforms - Array of field transformations
 * @returns New object with transformed fields
 *
 * @example
 * const data = { firstName: 'John', lastName: 'Doe', age: 30 };
 * const transforms = [
 *   { source: 'firstName', target: 'name' },
 *   { source: 'age', transform: (age) => age > 18 ? 'adult' : 'minor' }
 * ];
 * transformFields(data, transforms)
 * // Returns { name: 'John', age: 'adult' }
 */
export function transformFields(
  data: Record<string, unknown>,
  transforms: FieldTransform[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  transforms.forEach((transform) => {
    const value = getNestedProperty(data, transform.source);

    if (value !== undefined) {
      const transformedValue = transform.transform ? transform.transform(value) : value;
      const targetKey = transform.target || transform.source;
      setNestedProperty(result, targetKey, transformedValue);
    }
  });

  return result;
}

/**
 * Merges source data with transformed data, preserving original fields
 * @param data - Source data
 * @param transforms - Field transformations
 * @returns New object with original data plus transformed fields
 *
 * @example
 * const data = { id: 1, name: 'John', raw: '2024-01-01' };
 * mergeWithTransforms(data, [
 *   { source: 'raw', target: 'date', transform: (d) => new Date(d) }
 * ]);
 * // Returns { id: 1, name: 'John', raw: '2024-01-01', date: Date(...) }
 */
export function mergeWithTransforms(
  data: Record<string, unknown>,
  transforms: FieldTransform[]
): Record<string, unknown> {
  const transformed = transformFields(data, transforms);
  return { ...data, ...transformed };
}
