export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void;
}

export class SilentLogger implements Logger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

export class ConsoleLogger implements Logger {
  constructor(private readonly minLevel: LogLevel = 'info') {}

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG] ${message}`, context ?? '');
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      console.info(`[INFO] ${message}`, context ?? '');
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, context ?? '');
    }
  }

  error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, error ?? '', context ?? '');
    }
  }
}
