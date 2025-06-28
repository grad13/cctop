/**
 * Process Manager (FUNC-003 compliant)
 * Handles PID file management, logging, and process state
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { execSync } from 'child_process';
import {
  ProcessManagerConfig,
  ProcessManagerOptions,
  PidInfo,
  ProcessMonitorStatus,
  LogBackupFile
} from '../types/common';

class ProcessManager {
  private config: ProcessManagerConfig;
  private baseDir: string;
  private pidFile: string;
  private logDir: string;
  private logFile: string;
  private processName: string;

  constructor(config: ProcessManagerConfig = {}) {
    this.config = config;
    this.baseDir = config.baseDir || './.cctop';
    this.pidFile = path.join(this.baseDir, 'monitor.pid');
    this.logDir = path.join(this.baseDir, 'logs');
    this.logFile = path.join(this.logDir, 'monitor.log');
    this.processName = 'cctop-monitor';
  }

  /**
   * Start monitor process
   */
  async startMonitor(monitorScriptPath: string, options: ProcessManagerOptions = {}): Promise<number> {
    try {
      // Check if monitor is already running
      const existingPid = await this.getMonitorPid();
      await this.log('debug', `Checking for existing monitor, PID from file: ${existingPid}`);
      
      if (existingPid && await this.isProcessRunning(existingPid)) {
        await this.log('info', `Monitor already running with PID: ${existingPid}`);
        return existingPid;
      }

      // Clean up stale PID file
      if (existingPid) {
        await this.removePidFile();
        await this.log('info', `Cleaned up stale PID file: ${existingPid}`);
      }
      
      // Additional check: kill any orphaned monitor processes
      await this.killOrphanedMonitors(monitorScriptPath);
      
      // Double-check after killing orphans
      const recheck = await this.getMonitorPid();
      if (recheck && await this.isProcessRunning(recheck)) {
        await this.log('info', `Monitor already running after orphan cleanup with PID: ${recheck}`);
        return recheck;
      }

      // Ensure log directory exists
      await this.ensureLogDirectory();

      // Create a lock file to prevent race conditions
      const lockFile = `${this.pidFile}.lock`;
      try {
        // Try to create lock file exclusively
        await fs.writeFile(lockFile, process.pid.toString(), { flag: 'wx' });
      } catch (error: any) {
        if (error.code === 'EEXIST') {
          // Lock file exists, another process is starting monitor
          await this.log('info', 'Another process is starting monitor, waiting...');
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Re-check if monitor is now running
          const newPid = await this.getMonitorPid();
          if (newPid && await this.isProcessRunning(newPid)) {
            await this.log('info', `Monitor started by another process with PID: ${newPid}`);
            return newPid;
          }
        }
        throw error;
      }

      let pid: number;
      try {
        // Spawn monitor process
        const child = spawn('node', [monitorScriptPath], {
          detached: true,
          stdio: ['ignore', 'ignore', 'ignore'],
          cwd: process.cwd()
        });

        // Detach from parent process
        child.unref();

        pid = child.pid!;
        
        // Save PID information
        await this.savePidFile(pid, monitorScriptPath, options);
        await this.log('info', `Monitor process started with PID: ${pid} (started_by: ${options.started_by || 'standalone'})`);
      } finally {
        // Always remove lock file
        try {
          await fs.unlink(lockFile);
        } catch (error) {
          // Ignore error if lock file already removed
        }
      }

      return pid;
    } catch (error: any) {
      await this.log('error', `Failed to start monitor: ${error.message}`);
      throw error;
    }
  }

  /**
   * Stop monitor process
   */
  async stopMonitor(): Promise<boolean> {
    try {
      const pid = await this.getMonitorPid();
      
      if (!pid) {
        await this.log('info', 'No monitor process found');
        return false;
      }

      if (await this.isProcessRunning(pid)) {
        // Send SIGTERM for graceful shutdown
        process.kill(pid, 'SIGTERM');
        
        // Wait for process to exit
        const exited = await this.waitForProcessExit(pid, 5000);
        
        if (await this.isProcessRunning(pid)) {
          // Force kill if still running
          process.kill(pid, 'SIGKILL');
          await this.log('warn', `Force killed monitor process: ${pid}`);
        } else {
          await this.log('info', `Monitor process stopped gracefully: ${pid}`);
        }
      }

      // Clean up PID file
      await this.removePidFile();
      return true;
    } catch (error: any) {
      await this.log('error', `Failed to stop monitor: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get monitor process status
   */
  async getMonitorStatus(): Promise<ProcessMonitorStatus> {
    try {
      const pidInfo = await this.getPidInfo();
      if (!pidInfo) {
        return { status: 'stopped', pid: null, running: false };
      }

      const isRunning = await this.isProcessRunning(pidInfo.pid);
      
      // Calculate uptime if running
      const uptime = isRunning && pidInfo.started_at 
        ? Math.floor(Date.now() / 1000) - pidInfo.started_at 
        : null;
      
      return {
        status: isRunning ? 'running' : 'stale',
        running: isRunning,
        pid: pidInfo.pid,
        started_by: pidInfo.started_by || 'unknown',
        started_at: pidInfo.started_at,
        startTime: pidInfo.startTime,
        scriptPath: pidInfo.scriptPath,
        config_path: pidInfo.config_path,
        uptime: uptime
      };
    } catch (error: any) {
      await this.log('error', `Failed to get monitor status: ${error.message}`);
      return { status: 'error', pid: null, running: false, error: error.message };
    }
  }

  /**
   * Save PID file with metadata
   */
  private async savePidFile(pid: number, scriptPath: string, options: ProcessManagerOptions = {}): Promise<void> {
    const pidInfo: PidInfo = {
      pid: pid,
      started_by: options.started_by || 'standalone',
      started_at: Math.floor(Date.now() / 1000),
      startTime: new Date().toISOString(),
      scriptPath: scriptPath,
      processName: this.processName,
      parentPid: process.pid,
      config_path: this.config?.configFile || '.cctop/config.json'
    };

    await fs.writeFile(this.pidFile, JSON.stringify(pidInfo, null, 2), 'utf8');
  }

  /**
   * Get monitor PID from file
   */
  async getMonitorPid(): Promise<number | null> {
    try {
      const pidInfo = await this.getPidInfo();
      return pidInfo ? pidInfo.pid : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get PID file information with backward compatibility
   */
  async getPidInfo(): Promise<PidInfo | null> {
    try {
      const content = await fs.readFile(this.pidFile, 'utf8');
      
      // New format (JSON)
      if (content.trim().startsWith('{')) {
        return JSON.parse(content) as PidInfo;
      }
      
      // Legacy format (just PID number)
      const pid = parseInt(content.trim());
      if (!isNaN(pid)) {
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
    } catch (error) {
      return null;
    }
  }

  /**
   * Remove PID file
   */
  private async removePidFile(): Promise<void> {
    try {
      await fs.unlink(this.pidFile);
    } catch (error: any) {
      // Ignore error if file doesn't exist
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Check if process is running
   */
  async isProcessRunning(pid: number): Promise<boolean> {
    try {
      // Send signal 0 to check if process exists
      process.kill(pid, 0);
      return true;
    } catch (error: any) {
      // ESRCH means process doesn't exist, other errors might be permission issues
      if (error.code === 'ESRCH') {
        return false;
      }
      // For permission errors, try alternative check
      if (error.code === 'EPERM') {
        await this.log('warn', `Permission denied checking PID ${pid}, trying ps command`);
        try {
          const result = execSync(`ps -p ${pid} -o pid=`, { encoding: 'utf8' });
          return result.trim() === pid.toString();
        } catch {
          return false;
        }
      }
      return false;
    }
  }

  /**
   * Wait for process to exit
   */
  private async waitForProcessExit(pid: number, timeout: number = 5000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (!await this.isProcessRunning(pid)) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return false;
  }

  /**
   * Ensure log directory exists
   */
  private async ensureLogDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error: any) {
      // Ignore error if directory already exists
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Write log entry
   */
  async log(level: string, message: string): Promise<void> {
    try {
      await this.ensureLogDirectory();
      
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
      
      await fs.appendFile(this.logFile, logEntry, 'utf8');
      
      // Also log to console in verbose mode
      if (process.env.CCTOP_VERBOSE || process.env.NODE_ENV === 'test') {
        console.log(`[ProcessManager] ${logEntry.trim()}`);
      }
    } catch (error: any) {
      // Fallback to console if file logging fails
      console.error(`[ProcessManager] Failed to write log: ${error.message}`);
      console.log(`[ProcessManager] [${level.toUpperCase()}] ${message}`);
    }
  }

  /**
   * Get recent log entries
   */
  async getRecentLogs(lines: number = 50): Promise<string[]> {
    try {
      const logData = await fs.readFile(this.logFile, 'utf8');
      const logLines = logData.trim().split('\n');
      return logLines.slice(-lines);
    } catch (error) {
      return [];
    }
  }

  /**
   * Clear old log files (log rotation)
   */
  async rotateLogs(maxSizeBytes: number = 10 * 1024 * 1024): Promise<void> { // 10MB default
    try {
      const stats = await fs.stat(this.logFile);
      if (stats.size > maxSizeBytes) {
        const backupFile = `${this.logFile}.${Date.now()}.bak`;
        await fs.rename(this.logFile, backupFile);
        await this.log('info', `Log rotated to: ${backupFile}`);
        
        // Keep only last 3 backup files
        await this.cleanupOldLogs();
      }
    } catch (error: any) {
      // Ignore error if log file doesn't exist
      if (error.code !== 'ENOENT') {
        await this.log('error', `Log rotation failed: ${error.message}`);
      }
    }
  }

  /**
   * Clean up old log backup files
   */
  private async cleanupOldLogs(): Promise<void> {
    try {
      const files = await fs.readdir(this.logDir);
      const backupFiles: LogBackupFile[] = files
        .filter(file => file.startsWith('monitor.log.') && file.endsWith('.bak'))
        .map(file => ({
          name: file,
          path: path.join(this.logDir, file),
          timestamp: parseInt(file.split('.')[2])
        }))
        .sort((a, b) => b.timestamp - a.timestamp);

      // Keep only the 3 most recent backup files
      const filesToDelete = backupFiles.slice(3);
      
      for (const file of filesToDelete) {
        await fs.unlink(file.path);
        await this.log('info', `Deleted old log backup: ${file.name}`);
      }
    } catch (error: any) {
      await this.log('error', `Failed to cleanup old logs: ${error.message}`);
    }
  }
  
  /**
   * Kill orphaned monitor processes
   */
  private async killOrphanedMonitors(scriptPath: string): Promise<void> {
    try {
      // Find all monitor processes with the same script path
      const psCommand = `ps aux | grep "${scriptPath}" | grep -v grep | awk '{print $2}'`;
      const output = execSync(psCommand, { encoding: 'utf8' }).trim();
      
      await this.log('debug', `killOrphanedMonitors: ps output = "${output}"`);
      
      const pids = output
        .split('\n')
        .filter(pid => pid && !isNaN(parseInt(pid)));
      
      await this.log('debug', `killOrphanedMonitors: found PIDs = ${JSON.stringify(pids)}`);
      
      for (const pid of pids) {
        const pidNum = parseInt(pid);
        if (pidNum !== process.pid) { // Don't kill current process
          try {
            process.kill(pidNum, 'SIGTERM');
            await this.log('info', `Killed orphaned monitor process: ${pidNum}`);
            
            // Wait a bit and force kill if still running
            await new Promise(resolve => setTimeout(resolve, 100));
            if (await this.isProcessRunning(pidNum)) {
              process.kill(pidNum, 'SIGKILL');
              await this.log('warn', `Force killed orphaned monitor process: ${pidNum}`);
            }
          } catch (error: any) {
            await this.log('debug', `Error killing PID ${pidNum}: ${error.message}`);
          }
        }
      }
    } catch (error: any) {
      await this.log('debug', `Orphan cleanup error: ${error.message}`);
    }
  }
}

export = ProcessManager;