/**
 * Logger Utility
 * 
 * Standardized logging service for the Quickno application.
 * Provides level-based logging (info, warn, error, debug) with structured context
 * to improve observability and simplify production debugging.
 * 
 * Depends on: import.meta.env
 * Used by: Global application modules for error and event tracking.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDebug: boolean = import.meta.env.VITE_DEBUG_MODE === 'true';

  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();

    if (level === 'error') {
      console.error(`[${timestamp}] [ERROR] ${message}`, context || '');
    } else if (level === 'warn') {
      console.warn(`[${timestamp}] [WARN] ${message}`, context || '');
    } else if (this.isDebug || level === 'info') {
      console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`, context || '');
    }
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext) {
    this.log('error', message, context);
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }
}

export const logger = new Logger();
