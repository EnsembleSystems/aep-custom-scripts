/**
 * Event processing, filtering, and validation utilities
 */

import type { LaunchEventContent } from '../types/index.js';
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

/**
 * Validates if a Launch click event is a genuine SPA interaction and not a ghost click
 * (e.g. a click on whitespace with no meaningful link target).
 *
 * Rules:
 * - Exit links (`linkType === 'exit'`) are always valid.
 * - Clicks in broad layout regions (`linkRegion === 'MAIN'` or `'BODY'`) without a
 *   specific anchor are treated as ghost clicks and rejected.
 * - Everything else is considered valid.
 *
 * @param content - The content object from the Launch click event
 * @param logger - Optional logger instance
 * @returns true if the click should be processed
 */
export function isMeaningfulClickEvent(content: LaunchEventContent, logger?: Logger): boolean {
  if (!content.clickedElement) {
    logger?.log('Clicked element is missing');
    return false;
  }

  const { linkType, linkRegion } = content as { linkType?: string; linkRegion?: string };

  if (linkType?.toLowerCase() === 'exit') {
    return true;
  }

  if (linkRegion?.toLowerCase() === 'main' || linkRegion?.toLowerCase() === 'body') {
    logger?.log(`Ghost click detected — linkRegion is "${linkRegion}", ignoring`);
    return false;
  }

  return true;
}

/**
 * Validates if an event is a trusted user interaction
 * @param event - Event to validate
 * @param logger - Optional logger for warnings
 * @returns true if event is valid and trusted
 *
 * @example
 * if (!isValidUserEvent(event, logger)) {
 *   return false;
 * }
 */
export function isValidUserEvent(
  event: Event | PointerEvent | MouseEvent | undefined,
  logger?: Logger
): boolean {
  if (!event) {
    logger?.log('Event is missing');
    return false;
  }

  if ('isTrusted' in event && !event.isTrusted) {
    logger?.log('Event is not trusted (programmatic)');
    return false;
  }

  return true;
}

/**
 * Validates event type matches expected types
 * @param event - Event to check
 * @param allowedTypes - Array of allowed event types
 * @returns true if event type is allowed
 *
 * @example
 * if (!isEventType(event, ['click', 'pointerdown'])) {
 *   return false;
 * }
 */
export function isEventType(event: Event | undefined, allowedTypes: string[]): boolean {
  return event !== undefined && allowedTypes.includes(event.type);
}

/**
 * Checks if an event type should be processed
 * @param eventType - Event type to check
 * @param skipTypes - Array of event types to skip
 * @param logger - Optional logger
 * @returns true if event should be processed
 *
 * @example
 * if (!shouldProcessEventType(content.xdm?.eventType, ['web.webpagedetails.pageViews'], logger)) {
 *   return content;
 * }
 */
export function shouldProcessEventType(
  eventType: string | undefined,
  skipTypes: string[],
  logger?: Logger
): boolean {
  if (!eventType) {
    return true; // Process if type is unknown
  }

  if (skipTypes.includes(eventType)) {
    logger?.log(`Skipping event type: ${eventType}`);
    return false;
  }

  return true;
}
