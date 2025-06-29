/**
 * Process Logger
 * Handles logging, log rotation, and cleanup for process management
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import {
  ProcessManagerConfig,
  LogLevel,
  LogBackupFile,
  LoggerStatus
} from '../types/ProcessTypes';

export class ProcessLogger {
  private logFile: string;
  private logDir: string;
  private maxLogSize: number;
  private retentionCount: number;
  private baseDir: string;

  constructor(config: ProcessManagerConfig = {}) {
    this.baseDir = config.baseDir || './.cctop';
    this.logDir = path.join(this.baseDir, 'logs');
    this.logFile = path.join(this.logDir, 'monitor.log');
    this.maxLogSize = config.maxLogSize || 10 * 1024 * 1024; // 10MB default
    this.retentionCount = config.logRetentionCount || 3;
  }

  /**
   * Write log entry
   */
  async log(level: LogLevel, message: string): Promise<void> {
    try {
      await this.ensureLogDirectory();
      
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
      
      // Append to log file
      await fs.appendFile(this.logFile, logEntry, 'utf8');
      
      // Also log to console in debug/test mode
      if (process.env.CCTOP_DEBUG || process.env.NODE_ENV === 'test') {
        console.log(`[ProcessLogger] ${logEntry.trim()}`);
      }

      // Check if rotation is needed after write
      await this.checkRotation();

    } catch (error: any) {
      // Fallback to console if file logging fails
      console.error(`[ProcessLogger] File logging failed: ${error.message}`);
      console.log(`[ProcessLogger] [${level.toUpperCase()}] ${message}`);
    }
  }

  /**
   * Get recent log entries
   */
  async getRecentLogs(lines: number = 50): Promise<string[]> {
    try {
      const logData = await fs.readFile(this.logFile, 'utf8');
      const logLines = logData.trim().split('\n').filter(line => line.length > 0);
      
      // Return last N lines
      return logLines.slice(-lines);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return []; // No log file yet
      }
      throw new Error(`Failed to read logs: ${error.message}`);
    }
  }

  /**
   * Rotate log files
   */
  async rotateLogs(): Promise<void> {
    try {
      const stats = await fs.stat(this.logFile);
      if (stats.size <= this.maxLogSize) {
        return; // No rotation needed
      }

      // Create backup filename with timestamp
      const timestamp = Date.now();
      const backupFile = `${this.logFile}.${timestamp}.bak`;
      
      // Rename current log to backup
      await fs.rename(this.logFile, backupFile);
      
      // Log rotation event in new file
      await this.log('info', `Log rotated to: ${path.basename(backupFile)}`);
      
      // Clean up old backups
      await this.cleanupOldLogs();

    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        // Log error but don't throw - rotation is best effort
        await this.log('error', `Log rotation failed: ${error.message}`);
      }
    }
  }

  /**
   * Clear log file
   */
  async clearLogs(): Promise<void> {
    try {
      await fs.writeFile(this.logFile, '', 'utf8');
    } catch (error: any) {
      throw new Error(`Failed to clear logs: ${error.message}`);
    }
  }

  /**
   * Get log file path
   */
  getLogPath(): string {
    return this.logFile;
  }

  /**
   * Get logger status
   */
  async getLoggerStatus(): Promise<LoggerStatus> {
    try {
      const stats = await fs.stat(this.logFile);
      const files = await fs.readdir(this.logDir);
      const backupCount = files.filter(f => 
        f.startsWith('monitor.log.') && f.endsWith('.bak')
      ).length;
      
      return {
        logFile: this.logFile,
        size: stats.size,
        maxSize: this.maxLogSize,
        needsRotation: stats.size > this.maxLogSize,
        backupCount: backupCount,
        retentionCount: this.retentionCount
      };
    } catch (error: any) {
      return {
        logFile: this.logFile,
        error: error.code === 'ENOENT' ? 'Log file not found' : error.message
      };
    }
  }

  /**
   * Search logs for pattern
   */
  async searchLogs(pattern: string | RegExp, maxResults: number = 100): Promise<string[]> {
    try {
      const logData = await fs.readFile(this.logFile, 'utf8');
      const logLines = logData.trim().split('\n').filter(line => line.length > 0);
      
      const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
      const matches: string[] = [];
      
      // Search from most recent backwards
      for (let i = logLines.length - 1; i >= 0 && matches.length < maxResults; i--) {
        if (regex.test(logLines[i])) {
          matches.push(logLines[i]);
        }
      }
      
      return matches.reverse(); // Return in chronological order
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw new Error(`Failed to search logs: ${error.message}`);
    }
  }

  // Private helper methods

  /**
   * Ensure log directory exists
   */
  private async ensureLogDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        throw new Error(`Failed to create log directory: ${error.message}`);
      }
    }
  }

  /**
   * Check if log rotation is needed
   */
  private async checkRotation(): Promise<void> {
    try {
      const stats = await fs.stat(this.logFile);
      if (stats.size > this.maxLogSize) {
        await this.rotateLogs();
      }
    } catch (error) {
      // Ignore stat errors - rotation is best effort
    }
  }

  /**
   * Clean up old log backups
   */
  private async cleanupOldLogs(): Promise<void> {
    try {
      const files = await fs.readdir(this.logDir);
      
      // Find all backup files
      const backupFiles: LogBackupFile[] = files
        .filter(file => file.startsWith('monitor.log.') && file.endsWith('.bak'))
        .map(file => {
          const parts = file.split('.');
          const timestamp = parseInt(parts[2]);
          return {
            name: file,
            path: path.join(this.logDir, file),
            timestamp: isNaN(timestamp) ? 0 : timestamp
          };
        })
        .filter(file => file.timestamp > 0)
        .sort((a, b) => b.timestamp - a.timestamp); // Newest first

      // Remove old backups beyond retention count
      const filesToDelete = backupFiles.slice(this.retentionCount);
      
      for (const file of filesToDelete) {
        try {
          await fs.unlink(file.path);
          await this.log('info', `Deleted old log backup: ${file.name}`);
        } catch (error: any) {
          // Log but continue - cleanup is best effort
          await this.log('error', `Failed to delete backup ${file.name}: ${error.message}`);
        }
      }
    } catch (error: any) {
      await this.log('error', `Failed to cleanup old logs: ${error.message}`);
    }
  }

  /**
   * Get log file size
   */
  async getLogSize(): Promise<number> {
    try {
      const stats = await fs.stat(this.logFile);
      return stats.size;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return 0;
      }
      throw error;
    }
  }

  /**
   * Get backup files
   */
  async getBackupFiles(): Promise<LogBackupFile[]> {
    try {
      const files = await fs.readdir(this.logDir);
      
      return files
        .filter(file => file.startsWith('monitor.log.') && file.endsWith('.bak'))
        .map(file => {
          const parts = file.split('.');
          const timestamp = parseInt(parts[2]);
          return {
            name: file,
            path: path.join(this.logDir, file),
            timestamp: isNaN(timestamp) ? 0 : timestamp
          };
        })
        .filter(file => file.timestamp > 0)
        .sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      return [];
    }
  }
}