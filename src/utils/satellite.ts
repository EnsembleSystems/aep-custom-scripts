/**
 * AEP Launch _satellite interaction utilities
 *
 * Provides safe, consistent access to _satellite.setVar() and _satellite.track()
 * with test-mode-aware warnings. Eliminates duplicated guard-and-call patterns
 * across scripts.
 */

/**
 * Minimal logger interface compatible with both Logger class and console
 */
interface SatelliteLogger {
  log(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
}

/**
 * Safely reads a Launch variable via _satellite.getVar()
 *
 * @param name - Variable name
 * @param logger - Logger instance
 * @param testMode - Whether in test mode (adjusts warning messages)
 * @returns The variable value, or null if _satellite is unavailable
 */
export function getSatelliteVar(
  name: string,
  logger: SatelliteLogger,
  testMode: boolean
): Record<string, unknown> | null {
  if (window._satellite && typeof window._satellite.getVar === 'function') {
    const value = window._satellite.getVar(name);
    if (!value) {
      logger.warn(`Variable "${name}" not found`);
      return null;
    }
    return value;
  }

  const message = testMode
    ? '_satellite.getVar() not available (normal in test mode)'
    : '_satellite.getVar() not available - ensure AEP Launch is loaded';
  logger.warn(message);
  return null;
}

/**
 * Safely sets a Launch variable via _satellite.setVar()
 *
 * @param name - Variable name
 * @param value - Variable value
 * @param logger - Logger instance
 * @param testMode - Whether in test mode (adjusts warning messages)
 * @returns true if variable was set successfully
 */
export function setSatelliteVar(
  name: string,
  value: unknown,
  logger: SatelliteLogger,
  testMode: boolean
): boolean {
  if (window._satellite && typeof window._satellite.setVar === 'function') {
    window._satellite.setVar(name, value);
    return true;
  }

  const message = testMode
    ? '_satellite.setVar() not available (normal in test mode)'
    : '_satellite.setVar() not available - ensure AEP Launch is loaded';
  logger.warn(message);
  return false;
}

/**
 * Safely sets multiple Launch variables via _satellite.setVar()
 *
 * @param variables - Object of variable name/value pairs
 * @param logger - Logger instance
 * @param testMode - Whether in test mode
 * @returns true if all variables were set successfully
 */
export function setSatelliteVars(
  variables: Record<string, unknown>,
  logger: SatelliteLogger,
  testMode: boolean
): boolean {
  if (!window._satellite || typeof window._satellite.setVar !== 'function') {
    const message = testMode
      ? '_satellite.setVar() not available (normal in test mode)'
      : '_satellite.setVar() not available - ensure AEP Launch is loaded';
    logger.warn(message);
    return false;
  }

  Object.entries(variables).forEach(([name, value]) => {
    window._satellite!.setVar(name, value);
  });

  logger.log('Set Launch variables:', variables);
  return true;
}

/**
 * Safely triggers a Launch direct call rule via _satellite.track()
 *
 * @param eventName - Direct call event name
 * @param logger - Logger instance
 * @param testMode - Whether in test mode
 * @returns true if event was triggered successfully
 */
export function fireSatelliteEvent(
  eventName: string,
  logger: SatelliteLogger,
  testMode: boolean
): boolean {
  if (window._satellite && typeof window._satellite.track === 'function') {
    logger.log(`Triggering _satellite.track("${eventName}")`);
    window._satellite.track(eventName);
    return true;
  }

  const message = testMode
    ? '_satellite.track() not available (normal in test mode)'
    : '_satellite.track() not available - ensure AEP Launch is loaded';
  logger.warn(message);
  return false;
}
