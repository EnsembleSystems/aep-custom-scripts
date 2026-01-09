/**
 * Script execution wrapper utilities for consistent script patterns
 */

import { createLogger, type Logger } from './logger.js';

/**
 * Configuration for script execution wrapper
 */
export interface ScriptConfig<TResult> {
  /** Name of the script for logging */
  scriptName: string;
  /** Enable test mode for verbose logging */
  testMode: boolean;
  /** Title for test header */
  testHeaderTitle: string;
  /** Optional extra info for test header */
  testHeaderExtraInfo?: unknown;
  /** Custom error handler - if not provided, logs error and returns null */
  onError?: (error: unknown, logger: Logger) => TResult;
  /** Custom success handler - called after successful execution (only in non-test mode) */
  onSuccess?: (result: TResult, logger: Logger) => void;
}

/**
 * Wraps script execution with consistent logging and error handling
 * @param config - Script configuration
 * @param execute - Function that executes the script logic
 * @returns Result of script execution
 *
 * @example
 * export function myScript(testMode: boolean = false): string | null {
 *   return executeScript(
 *     {
 *       scriptName: 'My Script',
 *       testMode,
 *       testHeaderTitle: 'MY SCRIPT - TEST MODE',
 *       onError: (error, logger) => {
 *         logger.error('Error:', error);
 *         return null;
 *       },
 *     },
 *     (logger) => {
 *       // Your script logic here
 *       return 'result';
 *     }
 *   );
 * }
 */
export function executeScript<TResult>(
  config: ScriptConfig<TResult>,
  execute: (logger: Logger) => TResult
): TResult {
  const logger = createLogger(config.scriptName, config.testMode);

  try {
    logger.testHeader(config.testHeaderTitle, config.testHeaderExtraInfo);

    const result = execute(logger);

    logger.testResult(result);

    if (!config.testMode) {
      if (config.onSuccess) {
        config.onSuccess(result, logger);
      } else {
        logger.log('Script completed successfully', result);
      }
    }

    return result;
  } catch (error) {
    if (config.onError) {
      return config.onError(error, logger);
    }
    logger.error('Unexpected error in script:', error);
    return null as TResult;
  }
}

/**
 * Configuration for async script execution wrapper
 */
export interface AsyncScriptConfig<TResult> {
  /** Name of the script for logging */
  scriptName: string;
  /** Enable test mode for verbose logging */
  testMode: boolean;
  /** Title for test header */
  testHeaderTitle: string;
  /** Optional extra info for test header */
  testHeaderExtraInfo?: unknown;
  /** Custom error handler - if not provided, logs error and returns null */
  onError?: (error: unknown, logger: Logger) => TResult | Promise<TResult>;
  /** Custom success handler - called after successful execution (only in non-test mode) */
  onSuccess?: (result: TResult, logger: Logger) => void;
}

/**
 * Wraps async script execution with consistent logging and error handling
 * @param config - Script configuration
 * @param execute - Async function that executes the script logic
 * @returns Promise that resolves with the result of script execution
 *
 * @example
 * export async function myAsyncScript(testMode: boolean = false): Promise<string | null> {
 *   return executeAsyncScript(
 *     {
 *       scriptName: 'My Async Script',
 *       testMode,
 *       testHeaderTitle: 'MY ASYNC SCRIPT - TEST MODE',
 *       onError: (error, logger) => {
 *         logger.error('Error:', error);
 *         return Promise.resolve(null);
 *       },
 *     },
 *     async (logger) => {
 *       // Your async script logic here
 *       const data = await fetchData();
 *       return data;
 *     }
 *   );
 * }
 */
export async function executeAsyncScript<TResult>(
  config: AsyncScriptConfig<TResult>,
  execute: (logger: Logger) => Promise<TResult>
): Promise<TResult> {
  const logger = createLogger(config.scriptName, config.testMode);

  try {
    logger.testHeader(config.testHeaderTitle, config.testHeaderExtraInfo);

    const result = await execute(logger);

    logger.testResult(result);

    if (!config.testMode) {
      if (config.onSuccess) {
        config.onSuccess(result, logger);
      } else {
        logger.log('Script completed successfully', result);
      }
    }

    return result;
  } catch (error) {
    if (config.onError) {
      const errorResult = config.onError(error, logger);
      return errorResult instanceof Promise ? errorResult : Promise.resolve(errorResult);
    }
    logger.error('Unexpected error in script:', error);
    return null as TResult;
  }
}
