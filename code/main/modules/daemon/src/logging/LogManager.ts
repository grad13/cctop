/**
 * Daemon Logging Management
 */

import * as path from 'path';
import * as fs from 'fs';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

export class LogManager {
  private logFilePath: string;
  private logLevel: LogLevel;

  constructor(logFilePath: string, logLevel: LogLevel = 'error') {
    this.logFilePath = logFilePath;
    this.logLevel = logLevel;
  }

  private shouldWriteToFile(level: string): boolean {
    const levelPriority = LOG_LEVEL_PRIORITY[level as LogLevel] ?? 1;
    const configuredPriority = LOG_LEVEL_PRIORITY[this.logLevel];
    return levelPriority >= configuredPriority;
  }

  log(level: string, message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} [${level.toUpperCase()}] ${message}`;
    console.log(logEntry);

    if (this.shouldWriteToFile(level)) {
      this.writeToLogFileSync(logEntry);
    }
  }

  debugLog(message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} [DEBUG] ${message}${data ? ' ' + JSON.stringify(data, null, 2) : ''}`;
    console.log(logEntry);

    if (this.shouldWriteToFile('debug')) {
      this.writeToLogFileSync(logEntry);
    }
  }

  private writeToLogFileSync(logEntry: string): void {
    try {
      const logDir = path.dirname(this.logFilePath);
      
      // Ensure log directory exists
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      fs.appendFileSync(this.logFilePath, logEntry + '\n', 'utf8');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to write to log file ${this.logFilePath}: ${errorMessage}`);
    }
  }
}