/**
 * Date utilities for SnapLogic (Nashorn/JDK 7 compatible)
 *
 * Note: Nashorn doesn't reliably support Date.toISOString() in all JDK versions
 */

/**
 * Pad a number with leading zeros
 */
function pad(num: number, size: number): string {
  let s = String(num);
  while (s.length < size) {
    s = `0${s}`;
  }
  return s;
}

/**
 * Format date as ISO-8601 string (JDK 7 Rhino compatible)
 * This is a manual implementation because Nashorn may not have toISOString()
 */
export default function formatISODate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1, 2)}-${pad(
    date.getUTCDate(),
    2
  )}T${pad(date.getUTCHours(), 2)}:${pad(date.getUTCMinutes(), 2)}:${pad(
    date.getUTCSeconds(),
    2
  )}.${pad(date.getUTCMilliseconds(), 3)}Z`;
}
