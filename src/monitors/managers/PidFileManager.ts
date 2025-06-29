/**
 * PID File Manager
 * Handles all PID file operations including reading, writing, and validation
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import {
  PidInfo,
  ProcessManagerConfig,
  ProcessManagerOptions,
  PidFileStats,
  ProcessErrorType,
  ProcessError
} from '../types/ProcessTypes';

export class PidFileManager {
  private pidFile: string;
  private processName: string;
  private baseDir: string;

  constructor(config: ProcessManagerConfig = {}) {
    this.baseDir = config.baseDir || './.cctop';
    this.pidFile = path.join(this.baseDir, 'monitor.pid');
    this.processName = config.processName || 'cctop-monitor';
  }

  /**
   * Save PID information to file
   */
  async savePidInfo(pid: number, scriptPath: string, options: ProcessManagerOptions = {}): Promise<void> {
    const pidInfo: PidInfo = {
      pid: pid,
      started_by: options.started_by || 'standalone',
      started_at: Math.floor(Date.now() / 1000),
      startTime: new Date().toISOString(),
      scriptPath: scriptPath,
      processName: this.processName,
      parentPid: process.pid,
      config_path: options.configFile || '.cctop/config.json'
    };

    try {
      // Ensure directory exists
      await this.ensureDirectory();
      
      // Write PID file atomically
      const tempFile = `${this.pidFile}.tmp`;
      await fs.writeFile(tempFile, JSON.stringify(pidInfo, null, 2), 'utf8');
      await fs.rename(tempFile, this.pidFile);
    } catch (error: any) {
      const processError: ProcessError = new Error(`Failed to save PID file: ${error.message}`) as ProcessError;
      processError.type = ProcessErrorType.PID_FILE_ERROR;
      processError.pid = pid;
      throw processError;
    }
  }

  /**
   * Get PID information from file
   */
  async getPidInfo(): Promise<PidInfo | null> {
    try {
      const content = await fs.readFile(this.pidFile, 'utf8');
      
      // Handle JSON format (new)
      if (content.trim().startsWith('{')) {
        const pidInfo = JSON.parse(content) as PidInfo;
        
        // Validate parsed data
        if (this.validatePidInfo(pidInfo)) {
          return pidInfo;
        }
        return null;
      }
      
      // Handle legacy format (just PID number)
      const pid = parseInt(content.trim());
      if (!isNaN(pid) && pid > 0) {
        return {
          pid: pid,
          started_by: 'unknown',
          started_at: null,
          startTime: null,
          scriptPath: null,
          config_path: null
        };
      }
      
      return null;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null; // File doesn't exist
      }
      if (error.name === 'SyntaxError') {
        // Corrupted file
        await this.removePidFile();
        return null;
      }
      throw new Error(`Failed to read PID file: ${error.message}`);
    }
  }

  /**
   * Get just the PID number
   */
  async getPid(): Promise<number | null> {
    const pidInfo = await this.getPidInfo();
    return pidInfo ? pidInfo.pid : null;
  }

  /**
   * Remove PID file
   */
  async removePidFile(): Promise<void> {
    try {
      await fs.unlink(this.pidFile);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw new Error(`Failed to remove PID file: ${error.message}`);
      }
      // Ignore ENOENT - file doesn't exist
    }
  }

  /**
   * Validate PID file and its contents
   */
  async validatePidFile(): Promise<boolean> {
    const pidInfo = await this.getPidInfo();
    if (!pidInfo) {
      return false;
    }

    return this.validatePidInfo(pidInfo);
  }

  /**
   * Get PID file path
   */
  getPidFilePath(): string {
    return this.pidFile;
  }

  /**
   * Get PID file statistics
   */
  async getPidFileStats(): Promise<PidFileStats> {
    try {
      const stats = await fs.stat(this.pidFile);
      const pidInfo = await this.getPidInfo();
      
      return {
        exists: true,
        size: stats.size,
        modified: stats.mtime,
        valid: await this.validatePidFile(),
        pidInfo: pidInfo
      };
    } catch (error: any) {
      return {
        exists: false,
        error: error.message
      };
    }
  }

  /**
   * Create lock file for PID operations
   */
  async createLockFile(): Promise<string> {
    const lockFile = `${this.pidFile}.lock`;
    
    try {
      // Try to create lock file exclusively
      await fs.writeFile(lockFile, process.pid.toString(), { flag: 'wx' });
      return lockFile;
    } catch (error: any) {
      if (error.code === 'EEXIST') {
        // Check if lock is stale
        try {
          const lockContent = await fs.readFile(lockFile, 'utf8');
          const lockPid = parseInt(lockContent);
          
          if (!isNaN(lockPid) && lockPid !== process.pid) {
            // Check if process is still running
            try {
              process.kill(lockPid, 0);
              // Process exists, lock is valid
              throw new Error('Another process is holding the lock');
            } catch {
              // Process doesn't exist, remove stale lock
              await fs.unlink(lockFile);
              // Retry lock creation
              await fs.writeFile(lockFile, process.pid.toString(), { flag: 'wx' });
              return lockFile;
            }
          }
        } catch (retryError: any) {
          if (retryError.code === 'EEXIST') {
            throw new Error('Failed to acquire lock after removing stale lock');
          }
          throw retryError;
        }
      }
      throw error;
    }
  }

  /**
   * Remove lock file
   */
  async removeLockFile(lockFile: string): Promise<void> {
    try {
      await fs.unlink(lockFile);
    } catch (error: any) {
      // Ignore errors - lock file might have been removed already
      if (error.code !== 'ENOENT') {
        // Log but don't throw - cleanup should be best effort
        console.error(`Failed to remove lock file: ${error.message}`);
      }
    }
  }

  /**
   * Update PID file timestamp (for heartbeat)
   */
  async updateTimestamp(): Promise<void> {
    const pidInfo = await this.getPidInfo();
    if (!pidInfo) {
      throw new Error('No PID file to update');
    }

    // Touch the file to update mtime
    const now = new Date();
    await fs.utimes(this.pidFile, now, now);
  }

  // Private helpers

  /**
   * Ensure PID directory exists
   */
  private async ensureDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Validate PID info structure
   */
  private validatePidInfo(pidInfo: PidInfo): boolean {
    // Validate required fields
    if (!Number.isInteger(pidInfo.pid) || pidInfo.pid <= 0) {
      return false;
    }

    // Validate timestamp if present
    if (pidInfo.started_at !== null) {
      if (!Number.isInteger(pidInfo.started_at) || pidInfo.started_at <= 0) {
        return false;
      }
      
      // Check for future timestamp
      if (pidInfo.started_at > Math.floor(Date.now() / 1000)) {
        return false;
      }
    }

    // Validate string fields
    if (pidInfo.started_by && typeof pidInfo.started_by !== 'string') {
      return false;
    }

    return true;
  }
}