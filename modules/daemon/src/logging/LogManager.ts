/**
 * Daemon Logging Management
 */

import * as path from 'path';
import * as fs from 'fs';

export class LogManager {
  private logFilePath: string;

  constructor(logFilePath: string) {
    this.logFilePath = logFilePath;
  }

  log(level: string, message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} [${level.toUpperCase()}] ${message}`;
    console.log(logEntry);
    
    this.writeToLogFileSync(logEntry);
  }

  debugLog(message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} [DEBUG] ${message}${data ? ' ' + JSON.stringify(data, null, 2) : ''}`;
    console.log(logEntry);
    this.writeToLogFileSync(logEntry);
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