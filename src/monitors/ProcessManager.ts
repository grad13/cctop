/**
 * Process Manager Facade (FUNC-003 compliant)
 * Maintains backward compatibility while delegating to specialized components
 */

import {
  ProcessManagerConfig,
  ProcessManagerOptions,
  ProcessMonitorStatus,
  IntegratedStatus,
  LogLevel
} from './types/ProcessTypes';
import { PidFileManager } from './managers/PidFileManager';
import { ProcessController } from './controllers/ProcessController';
import { ProcessLogger } from './loggers/ProcessLogger';

class ProcessManager {
  private pidManager: PidFileManager;
  private processController: ProcessController;
  private logger: ProcessLogger;
  private config: ProcessManagerConfig;

  constructor(config: ProcessManagerConfig = {}) {
    this.config = config;
    this.pidManager = new PidFileManager(config);
    this.processController = new ProcessController(config);
    this.logger = new ProcessLogger(config);
  }

  /**
   * Start monitor process (backward compatible API)
   */
  async startMonitor(monitorScriptPath: string, options: ProcessManagerOptions = {}): Promise<number> {
    try {
      // Check if monitor is already running
      const existingPid = await this.getMonitorPid();
      await this.logger.log('debug', `Checking for existing monitor, PID from file: ${existingPid}`);
      
      if (existingPid && await this.processController.isProcessRunning(existingPid)) {
        await this.logger.log('info', `Monitor already running with PID: ${existingPid}`);
        return existingPid;
      }

      // Clean up stale PID file
      if (existingPid) {
        await this.pidManager.removePidFile();
        await this.logger.log('info', `Cleaned up stale PID file: ${existingPid}`);
      }
      
      // Additional check: kill any orphaned monitor processes
      await this.processController.killOrphanedProcesses(monitorScriptPath);
      
      // Double-check after killing orphans
      const recheck = await this.getMonitorPid();
      if (recheck && await this.processController.isProcessRunning(recheck)) {
        await this.logger.log('info', `Monitor already running after orphan cleanup with PID: ${recheck}`);
        return recheck;
      }

      // Create a lock file to prevent race conditions
      let lockFile: string | null = null;
      let pid: number;

      try {
        lockFile = await this.pidManager.createLockFile();
        
        // Check one more time while holding lock
        const finalCheck = await this.getMonitorPid();
        if (finalCheck && await this.processController.isProcessRunning(finalCheck)) {
          await this.logger.log('info', `Monitor started by another process with PID: ${finalCheck}`);
          return finalCheck;
        }

        // Start new process
        pid = await this.processController.startProcess(monitorScriptPath, options);
        
        // Save PID information
        await this.pidManager.savePidInfo(pid, monitorScriptPath, options);
        await this.logger.log('info', `Monitor process started with PID: ${pid} (started_by: ${options.started_by || 'standalone'})`);

      } finally {
        // Always remove lock file
        if (lockFile) {
          await this.pidManager.removeLockFile(lockFile);
        }
      }

      return pid;
    } catch (error: any) {
      await this.logger.log('error', `Failed to start monitor: ${error.message}`);
      throw error;
    }
  }

  /**
   * Stop monitor process (backward compatible API)
   */
  async stopMonitor(): Promise<boolean> {
    try {
      const pid = await this.getMonitorPid();
      
      if (!pid) {
        await this.logger.log('info', 'No monitor process found');
        return false;
      }

      const wasRunning = await this.processController.isProcessRunning(pid);
      const stopped = await this.processController.stopProcess(pid);
      
      if (stopped) {
        await this.pidManager.removePidFile();
        await this.logger.log('info', `Monitor process stopped${wasRunning ? ' gracefully' : ''}: ${pid}`);
      } else {
        await this.logger.log('warn', `Failed to stop monitor process: ${pid}`);
      }

      return stopped;
    } catch (error: any) {
      await this.logger.log('error', `Failed to stop monitor: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get monitor process status (backward compatible API)
   */
  async getMonitorStatus(): Promise<ProcessMonitorStatus> {
    try {
      const pidInfo = await this.pidManager.getPidInfo();
      if (!pidInfo) {
        return { status: 'stopped', pid: null, running: false, startTime: null };
      }

      const isRunning = await this.processController.isProcessRunning(pidInfo.pid);
      
      // Calculate uptime if running
      const uptime = isRunning && pidInfo.started_at 
        ? Math.floor(Date.now() / 1000) - pidInfo.started_at 
        : null;
      
      return {
        status: isRunning ? 'running' : 'stale',
        running: isRunning,
        pid: pidInfo.pid,
        started_by: pidInfo.started_by || 'unknown',
        started_at: pidInfo.started_at || undefined,
        startTime: pidInfo.startTime || null,
        scriptPath: pidInfo.scriptPath || undefined,
        config_path: pidInfo.config_path || undefined,
        uptime: uptime
      };
    } catch (error: any) {
      await this.logger.log('error', `Failed to get monitor status: ${error.message}`);
      return { status: 'error', pid: null, running: false, startTime: null, error: error.message };
    }
  }

  /**
   * Get monitor PID from file (backward compatible API)
   */
  async getMonitorPid(): Promise<number | null> {
    return await this.pidManager.getPid();
  }

  /**
   * Get PID file information (backward compatible API)
   */
  async getPidInfo() {
    return await this.pidManager.getPidInfo();
  }

  /**
   * Check if process is running (backward compatible API)
   */
  async isProcessRunning(pid: number): Promise<boolean> {
    return await this.processController.isProcessRunning(pid);
  }

  /**
   * Write log entry (backward compatible API)
   */
  async log(level: string, message: string): Promise<void> {
    // Convert string level to LogLevel type
    const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const logLevel = validLevels.includes(level as LogLevel) 
      ? level as LogLevel 
      : 'info';
    
    await this.logger.log(logLevel, message);
  }

  /**
   * Get recent log entries (backward compatible API)
   */
  async getRecentLogs(lines: number = 50): Promise<string[]> {
    return await this.logger.getRecentLogs(lines);
  }

  /**
   * Rotate log files (backward compatible API)
   */
  async rotateLogs(maxSizeBytes?: number): Promise<void> {
    // Note: The new implementation uses the config value, 
    // but we keep the parameter for backward compatibility
    await this.logger.rotateLogs();
  }

  /**
   * New method: Get integrated status of all components
   */
  async getIntegratedStatus(): Promise<IntegratedStatus> {
    return {
      process: await this.getMonitorStatus(),
      pidFile: await this.pidManager.getPidFileStats(),
      logger: await this.logger.getLoggerStatus(),
      controller: this.processController.getControllerStatus()
    };
  }

  /**
   * New method: Search logs
   */
  async searchLogs(pattern: string | RegExp, maxResults?: number): Promise<string[]> {
    return await this.logger.searchLogs(pattern, maxResults);
  }

  /**
   * New method: Clear logs
   */
  async clearLogs(): Promise<void> {
    await this.logger.clearLogs();
  }

  /**
   * New method: Update PID file timestamp
   */
  async updateTimestamp(): Promise<void> {
    await this.pidManager.updateTimestamp();
  }

  /**
   * New method: Validate PID file
   */
  async validatePidFile(): Promise<boolean> {
    return await this.pidManager.validatePidFile();
  }

  // Private backward compatible methods that were in original

  /**
   * Wait for process to exit (private method made accessible for tests)
   */
  private async waitForProcessExit(pid: number, timeout: number = 5000): Promise<boolean> {
    return await this.processController.waitForProcessExit(pid, timeout);
  }

  /**
   * Remove PID file (private method made accessible for tests)
   */
  private async removePidFile(): Promise<void> {
    await this.pidManager.removePidFile();
  }

  /**
   * Ensure log directory exists (private method made accessible for tests)
   */
  private async ensureLogDirectory(): Promise<void> {
    // Delegate to logger's internal method through a log write
    await this.logger.log('debug', 'Ensuring log directory exists');
  }

  /**
   * Clean up old log files (private method made accessible for tests)
   */
  private async cleanupOldLogs(): Promise<void> {
    await this.logger.rotateLogs();
  }

  /**
   * Kill orphaned monitor processes (private method made accessible for tests)
   */
  private async killOrphanedMonitors(scriptPath: string): Promise<void> {
    await this.processController.killOrphanedProcesses(scriptPath);
  }
}

export = ProcessManager;