/**
 * Logger utility for consistent logging across scripts
 */

export class Logger {
  private readonly debug: boolean;

  private readonly prefix: string;

  private readonly isTestMode: boolean;

  constructor(debug: boolean, prefix: string, isTestMode: boolean) {
    this.debug = debug;
    this.prefix = prefix;
    this.isTestMode = isTestMode;
  }

  log(message: string, data?: unknown): void {
    if (this.debug) {
      console.log(`${this.prefix} ${message}`, data ?? '');
    }
  }

  error(message: string, data?: unknown): void {
    console.error(`${this.prefix} ${message}`, data ?? '');
  }

  warn(message: string, data?: unknown): void {
    console.warn(`${this.prefix} ${message}`, data ?? '');
  }

  /**
   * Prints a test mode header with separator lines
   * Only outputs if testMode is enabled
   */
  testHeader(title: string, extraInfo?: unknown): void {
    if (!this.isTestMode) {
      return;
    }

    const separator = '='.repeat(80);
    console.debug(separator);
    console.debug(title);
    console.debug(separator);

    if (extraInfo !== undefined) {
      console.debug(extraInfo);
      console.debug(separator);
    }
  }

  /**
   * Prints test mode result output with separator lines
   * Only outputs if testMode is enabled
   */
  testResult(result: unknown): void {
    if (!this.isTestMode) {
      return;
    }

    const separator = '='.repeat(80);
    console.debug(separator);
    console.debug('RESULT:');
    console.debug(separator);

    if (typeof result === 'string') {
      console.debug(result);
    } else {
      console.debug(JSON.stringify(result, null, 2));
    }

    console.debug(separator);
  }

  /**
   * Prints additional test mode info
   * Only outputs if testMode is enabled
   */
  testInfo(message: string, data?: unknown): void {
    if (!this.isTestMode) {
      return;
    }

    if (data !== undefined) {
      console.debug(message, data);
    } else {
      console.debug(message);
    }
  }
}

export function createLogger(
  debug: boolean,
  scriptName: string,
  isTestMode: boolean
): Logger {
  const prefix = isTestMode ? `[${scriptName} Test]` : `[AEP ${scriptName}]`;
  return new Logger(debug, prefix, isTestMode);
}
