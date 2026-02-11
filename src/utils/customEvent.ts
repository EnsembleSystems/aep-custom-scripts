/**
 * Custom event dispatching utility
 *
 * Provides a safe, consistent pattern for dispatching CustomEvents on the window.
 * Used by monitor scripts (searchUrlMonitor, spaPageViewTitleMonitor, etc.)
 */

/**
 * Dispatches a CustomEvent on the window safely
 *
 * @param eventName - Name of the custom event
 * @param detail - Event detail payload
 * @returns true if event was dispatched successfully
 */
export default function dispatchCustomEvent<T>(eventName: string, detail: T): boolean {
  try {
    const event = new CustomEvent(eventName, {
      detail,
      bubbles: true,
      cancelable: false,
    });

    window.dispatchEvent(event);
    return true;
  } catch (error) {
    console.error(`Failed to dispatch ${eventName} event:`, error);
    return false;
  }
}
