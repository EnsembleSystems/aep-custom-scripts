/**
 * Logger utility for consistent logging across scripts
 */

export class Logger {
  private readonly debug: boolean;
  private readonly prefix: string;

  constructor(debug: boolean, prefix: string) {
    this.debug = debug;
    this.prefix = prefix;
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
}

export function createLogger(debug: boolean, scriptName: string, isTestMode: boolean): Logger {
  const prefix = isTestMode ? `[${scriptName} Test]` : `[AEP ${scriptName}]`;
  return new Logger(debug, prefix);
}
