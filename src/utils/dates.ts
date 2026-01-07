/**
 * Date utility functions for extracting and transforming date fields
 */

/**
 * Extracts date field values from an array of objects and returns an array of date strings
 * @param objects - Array of objects containing a 'date' field
 * @returns Array of date strings
 */
export function extractDates(objects: Array<{ date?: string }>): string[] {
  if (!Array.isArray(objects)) {
    return [];
  }

  return objects
    .filter((obj) => obj && typeof obj.date === 'string' && obj.date.trim() !== '')
    .map((obj) => obj.date as string);
}

/**
 * Extracts date field values from an array of objects and returns an array of Date objects
 * @param objects - Array of objects containing a 'date' field
 * @returns Array of Date objects
 */
export function extractDatesArray(objects: Array<{ date?: string }>): string[] {
  if (!Array.isArray(objects)) {
    return [];
  }

  return objects
    .filter((obj) => obj && typeof obj.date === 'string' && obj.date.trim() !== '')
    .map((obj) => new Date(obj.date as string).toISOString());
}

/**
 * Formats a date string or Date object to AEP DateTime format (yyyy-MM-ddTHH:mm:ss+00:00)
 * @param date - Date string or Date object
 * @returns Formatted date string in AEP DateTime format, or empty string if invalid
 * @example "2018-11-12T20:20:39+00:00"
 */
export function formatDateTimeForAEP(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // Check if date is valid
    if (Number.isNaN(dateObj.getTime())) {
      return '';
    }

    // Get ISO string and replace 'Z' with '+00:00'
    // ISO format: "2026-01-15T00:00:00.000Z"
    // AEP format: "2026-01-15T00:00:00+00:00"
    const isoString = dateObj.toISOString();

    // Remove milliseconds (.000) and replace Z with +00:00
    const aepDateTime = isoString.replace(/\.\d{3}Z$/, '+00:00');

    return aepDateTime;
  } catch {
    return '';
  }
}

/**
 * Extracts date field values from an array of objects and returns an array of AEP DateTime formatted strings
 * This is the format required by AEP XDM DateTime[] fields: "2018-11-12T20:20:39+00:00"
 * @param objects - Array of objects containing a 'date' field
 * @returns Array of date strings in AEP DateTime format (yyyy-MM-ddTHH:mm:ss+00:00)
 */
export function extractDateTimeArray(objects: Array<{ date?: string }>): string[] {
  if (!Array.isArray(objects)) {
    return [];
  }

  return objects
    .filter((obj) => obj && typeof obj.date === 'string' && obj.date.trim() !== '')
    .map((obj) => formatDateTimeForAEP(obj.date as string))
    .filter((dateStr) => dateStr !== ''); // Remove any invalid dates
}
