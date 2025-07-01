/**
 * Process Controller
 * Handles process lifecycle management including start, stop, and monitoring
 */

import { spawn, ChildProcess, execSync } from 'child_process';
import { promises as fs } from 'fs';
import {
  ProcessManagerConfig,
  ProcessManagerOptions,
  ProcessSignal,
  ProcessErrorType,
  ProcessError,
  ControllerStatus
} from '../types/ProcessTypes';

export class ProcessController {
  private config: ProcessManagerConfig;
  private timeout: number;

  constructor(config: ProcessManagerConfig = {}) {
    this.config = config;
    this.timeout = config.processTimeout || 5000;
  }

  /**
   * Start a new process
   */
  async startProcess(scriptPath: string, options: ProcessManagerOptions = {}): Promise<number> {
    try {
      // Validate script path
      if (!await this.validateScriptPath(scriptPath)) {
        const error: ProcessError = new Error(`Invalid script path: ${scriptPath}`) as ProcessError;
        error.type = ProcessErrorType.VALIDATION_ERROR;
        throw error;
      }

      // Kill any orphaned processes first
      await this.killOrphanedProcesses(scriptPath);

      // Create lock to prevent race conditions
      const lockFile = `${scriptPath}.lock`;
      
      let lockAcquired = false;
      let pid: number;

      try {
        // Try to create lock file
        await this.createLock(lockFile);
        lockAcquired = true;

        // Spawn process
        const child = spawn('node', [scriptPath], {
          detached: true,
          stdio: ['ignore', 'ignore', 'ignore'],
          cwd: process.cwd(),
          env: { ...process.env, ...options.env }
        });

        child.unref();
        pid = child.pid!;

        if (!pid) {
          throw new Error('Failed to get PID from spawned process');
        }

        // Wait briefly to ensure process started successfully
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verify process is still running
        if (!await this.isProcessRunning(pid)) {
          const error: ProcessError = new Error('Process failed to start or exited immediately') as ProcessError;
          error.type = ProcessErrorType.START_FAILED;
          error.pid = pid;
          throw error;
        }

        return pid;

      } finally {
        // Always remove lock if we acquired it
        if (lockAcquired) {
          await this.removeLock(lockFile);
        }
      }

    } catch (error: any) {
      if (error.type) {
        throw error; // Already a ProcessError
      }
      const processError: ProcessError = new Error(`Process start failed: ${error.message}`) as ProcessError;
      processError.type = ProcessErrorType.START_FAILED;
      throw processError;
    }
  }

  /**
   * Stop a process
   */
  async stopProcess(pid: number, graceful: boolean = true): Promise<boolean> {
    if (!await this.isProcessRunning(pid)) {
      return true; // Already stopped
    }

    try {
      if (graceful) {
        // Send SIGTERM for graceful shutdown
        process.kill(pid, 'SIGTERM');
        
        // Wait for graceful shutdown
        const exited = await this.waitForProcessExit(pid, this.timeout);
        
        if (exited) {
          return true;
        }
      }

      // Force kill if still running
      if (await this.isProcessRunning(pid)) {
        process.kill(pid, 'SIGKILL');
        
        // Brief wait for force kill
        await this.waitForProcessExit(pid, 1000);
        
        return !await this.isProcessRunning(pid);
      }

      return true;

    } catch (error: any) {
      if (error.code === 'ESRCH') {
        return true; // Process doesn't exist
      }
      if (error.code === 'EPERM') {
        const processError: ProcessError = new Error(`Permission denied stopping process ${pid}`) as ProcessError;
        processError.type = ProcessErrorType.PERMISSION_ERROR;
        processError.pid = pid;
        throw processError;
      }
      const processError: ProcessError = new Error(`Process stop failed: ${error.message}`) as ProcessError;
      processError.type = ProcessErrorType.STOP_FAILED;
      processError.pid = pid;
      throw processError;
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
      if (error.code === 'ESRCH') {
        return false; // Process doesn't exist
      }
      
      // Permission error - try alternative check
      if (error.code === 'EPERM') {
        return await this.checkProcessAlternative(pid);
      }
      
      return false;
    }
  }

  /**
   * Wait for process to exit
   */
  async waitForProcessExit(pid: number, timeout: number = 5000): Promise<boolean> {
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
   * Kill orphaned processes running the same script
   */
  async killOrphanedProcesses(scriptPath: string): Promise<void> {
    try {
      // Find processes running the same script
      const psCommand = process.platform === 'win32'
        ? `wmic process where "CommandLine like '%${scriptPath}%'" get ProcessId`
        : `ps aux | grep "${scriptPath}" | grep -v grep | awk '{print $2}'`;
      
      const output = execSync(psCommand, { encoding: 'utf8' }).trim();
      
      if (!output) {
        return; // No processes found
      }

      // Parse PIDs based on platform
      let pids: number[];
      if (process.platform === 'win32') {
        // Windows WMIC output parsing
        pids = output
          .split('\n')
          .slice(1) // Skip header
          .map(line => parseInt(line.trim()))
          .filter(pid => !isNaN(pid) && pid > 0);
      } else {
        // Unix ps output parsing
        pids = output
          .split('\n')
          .map(pid => parseInt(pid.trim()))
          .filter(pid => !isNaN(pid) && pid > 0);
      }

      // Kill each orphaned process
      for (const pid of pids) {
        if (pid !== process.pid) { // Don't kill current process
          try {
            await this.stopProcess(pid, false); // Force kill orphans
          } catch (error) {
            // Ignore errors for orphan cleanup
            // Process might have exited between detection and kill
          }
        }
      }
    } catch (error: any) {
      // Platform-specific command may fail, log but continue
      if (process.env.CCTOP_DEBUG) {
        console.error(`Orphan cleanup error: ${error.message}`);
      }
    }
  }

  /**
   * Send signal to process
   */
  async sendSignal(pid: number, signal: ProcessSignal): Promise<boolean> {
    try {
      process.kill(pid, signal);
      return true;
    } catch (error: any) {
      if (error.code === 'ESRCH') {
        return false; // Process doesn't exist
      }
      throw error;
    }
  }

  /**
   * Get controller status
   */
  getControllerStatus(): ControllerStatus {
    return {
      timeout: this.timeout,
      config: this.config
    };
  }

  // Private helper methods

  /**
   * Validate script path exists and is executable
   */
  private async validateScriptPath(scriptPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(scriptPath);
      return stats.isFile();
    } catch (error) {
      return false;
    }
  }

  /**
   * Create lock file
   */
  private async createLock(lockFile: string): Promise<void> {
    try {
      await fs.writeFile(lockFile, process.pid.toString(), { flag: 'wx' });
    } catch (error: any) {
      if (error.code === 'EEXIST') {
        // Check if lock is stale
        try {
          const lockPid = parseInt(await fs.readFile(lockFile, 'utf8'));
          if (!isNaN(lockPid) && !await this.isProcessRunning(lockPid)) {
            // Stale lock, remove and retry
            await fs.unlink(lockFile);
            await fs.writeFile(lockFile, process.pid.toString(), { flag: 'wx' });
            return;
          }
        } catch {
          // Unable to check/remove stale lock
        }
        const processError: ProcessError = new Error('Another process is already starting') as ProcessError;
        processError.type = ProcessErrorType.LOCK_ERROR;
        throw processError;
      }
      throw error;
    }
  }

  /**
   * Remove lock file
   */
  private async removeLock(lockFile: string): Promise<void> {
    try {
      await fs.unlink(lockFile);
    } catch (error) {
      // Ignore lock removal errors - best effort
    }
  }

  /**
   * Alternative process check using ps command
   */
  private async checkProcessAlternative(pid: number): Promise<boolean> {
    try {
      const command = process.platform === 'win32'
        ? `tasklist /FI "PID eq ${pid}" | findstr ${pid}`
        : `ps -p ${pid} -o pid=`;
      
      const result = execSync(command, { encoding: 'utf8' }).trim();
      
      if (process.platform === 'win32') {
        return result.includes(pid.toString());
      } else {
        return result === pid.toString();
      }
    } catch (error) {
      return false;
    }
  }
}