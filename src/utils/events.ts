/**
 * Event processing, filtering, and validation utilities
 */

import type { Logger } from './logger.js';

/**
 * Logs comprehensive event information for debugging
 * @param event - Event to log
 * @param logger - Logger instance
 * @param additionalInfo - Additional info to log
 *
 * @example
 * logEventInfo(clickEvent, logger, { customData: 'value' })
 */
export default function logEventInfo(
  event: Event | { type?: string; isTrusted?: boolean; [key: string]: unknown } | undefined,
  logger: Logger,
  additionalInfo?: Record<string, unknown>
): void {
  if (!event) {
    logger.log('No event object provided');
    return;
  }

  const eventInfo: Record<string, unknown> = {
    type: 'type' in event ? event.type : 'unknown',
    isTrusted: 'isTrusted' in event ? event.isTrusted : undefined,
  };

  // Add composed path if available
  if (
    event instanceof Event &&
    'composedPath' in event &&
    typeof event.composedPath === 'function'
  ) {
    eventInfo.composedPath = event.composedPath();
  }

  // Add additional info
  if (additionalInfo) {
    Object.assign(eventInfo, additionalInfo);
  }

  logger.log('Event information', eventInfo);
}
