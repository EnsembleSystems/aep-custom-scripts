/**
 * URL parsing and extraction utilities
 */

/**
 * Configuration for URL path structure parsing
 */
export interface PathStructure {
  segments: Record<string, number>;
  minSegments?: number;
  requiredSegments?: Record<string, string>;
}

/**
 * Splits a URL path into segments
 * @param path - URL path to split (e.g., "/publisher/cc/123/name")
 * @returns Array of path segments (e.g., ['', 'publisher', 'cc', '123', 'name'])
 */
function splitPath(path: string): string[] {
  if (!path || typeof path !== 'string') {
    return [];
  }
  return path.split('/');
}

/**
 * Validates if URL path segments match a required structure
 * @param segments - Path segments to validate
 * @param structure - Expected structure configuration
 * @returns true if path matches structure
 */
function validatePathStructure(segments: string[], structure: PathStructure): boolean {
  // Check minimum segment count
  if (structure.minSegments && segments.length < structure.minSegments) {
    return false;
  }

  // Check required segments
  if (structure.requiredSegments) {
    const allMatch = Object.entries(structure.requiredSegments).every(([key, expectedValue]) => {
      const segmentIndex = structure.segments[key];
      if (segmentIndex === undefined) return true;

      return segments[segmentIndex] === expectedValue;
    });

    if (!allMatch) {
      return false;
    }
  }

  return true;
}

/**
 * Extracts multiple named segments from a URL path using a structure definition
 * @param path - URL path to parse
 * @param structure - Structure defining which segments to extract
 * @returns Object with named segments or null if validation fails
 */
function extractPathSegments(
  path: string,
  structure: PathStructure
): Record<string, string> | null {
  const segments = splitPath(path);

  // Validate structure
  if (!validatePathStructure(segments, structure)) {
    return null;
  }

  // Extract all defined segments
  const result: Record<string, string> = {};

  Object.entries(structure.segments).forEach(([key, index]) => {
    const value = segments[index];
    if (value) {
      result[key] = value;
    }
  });

  return result;
}

/**
 * Extracts a value from a URL path based on structure and validates it
 * @param path - URL path to parse
 * @param structure - Structure defining path format
 * @param segmentKey - Key of the segment to extract
 * @param validator - Optional validation function for the extracted value
 * @returns Extracted and validated value or null
 *
 * @example
 * const structure = {
 *   segments: { type: 1, id: 3 },
 *   minSegments: 4,
 *   requiredSegments: { type: 'publisher' }
 * };
 * extractAndValidate(
 *   '/publisher/cc/123/name',
 *   structure,
 *   'id',
 *   (id) => /^\d+$/.test(id)
 * ) // Returns '123'
 */
export function extractAndValidate(
  path: string,
  structure: PathStructure,
  segmentKey: string,
  validator?: (value: string) => boolean
): string | null {
  const extracted = extractPathSegments(path, structure);

  if (!extracted || !extracted[segmentKey]) {
    return null;
  }

  const value = extracted[segmentKey];

  // Apply custom validation if provided
  if (validator && !validator(value)) {
    return null;
  }

  return value;
}

/**
 * Creates a path structure configuration for nested resource URL patterns
 * @param type - Type of URL pattern (currently only 'nested-resource' is supported)
 * @param config - Configuration options
 * @returns PathStructure configuration
 *
 * @example
 * // For URLs like /publisher/cc/123/name
 * createPathStructure('nested-resource', {
 *   resourceType: 'publisher',
 *   minSegments: 4
 * })
 */
export function createPathStructure(
  type: 'nested-resource',
  config: {
    resourceType?: string;
    minSegments?: number;
  }
): PathStructure {
  switch (type) {
    case 'nested-resource':
      // Pattern: /resource/subtype/id/name
      return {
        segments: {
          empty: 0,
          resourceType: 1,
          subtype: 2,
          id: 3,
          name: 4,
        },
        minSegments: config.minSegments ?? 4,
        requiredSegments: config.resourceType ? { resourceType: config.resourceType } : undefined,
      };

    default:
      // This should never happen due to TypeScript type narrowing
      throw new Error(`Unsupported path structure type: ${type}`);
  }
}
