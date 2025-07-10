/**
 * Daemon Status Monitor
 * Monitors daemon process status using .cctop/runtime/daemon.pid
 */

import * as fs from 'fs';
import * as path from 'path';

export interface DaemonStatus {
  isRunning: boolean;
  pid?: number;
  status: 'running' | 'stopped' | 'unknown';
}

export class DaemonStatusMonitor {
  private pidFilePath: string;

  constructor(cctopDir: string = path.join(process.cwd(), '.cctop')) {
    this.pidFilePath = path.join(cctopDir, 'runtime', 'daemon.pid');
  }

  /**
   * Check daemon status by examining PID file and process existence
   */
  async checkStatus(): Promise<DaemonStatus> {
    try {
      // Check if PID file exists
      if (!fs.existsSync(this.pidFilePath)) {
        return {
          isRunning: false,
          status: 'stopped'
        };
      }

      // Read PID from file - handle both plain text and JSON format
      const pidContent = fs.readFileSync(this.pidFilePath, 'utf8').trim();
      let pid: number;

      // Try parsing as plain text first (most common format)
      pid = parseInt(pidContent, 10);
      
      if (isNaN(pid)) {
        try {
          // Try parsing as JSON format if plain text fails
          const pidData = JSON.parse(pidContent);
          pid = pidData.pid;
        } catch {
          // Both parsing methods failed
        }
      }

      if (isNaN(pid)) {
        return {
          isRunning: false,
          status: 'unknown'
        };
      }

      // Check if process is actually running
      const isProcessRunning = await this.isProcessRunning(pid);

      return {
        isRunning: isProcessRunning,
        pid: isProcessRunning ? pid : undefined,
        status: isProcessRunning ? 'running' : 'stopped'
      };

    } catch (error) {
      return {
        isRunning: false,
        status: 'unknown'
      };
    }
  }

  /**
   * Check if a process with given PID is running
   */
  private async isProcessRunning(pid: number): Promise<boolean> {
    try {
      // On Unix systems, kill with signal 0 checks if process exists
      process.kill(pid, 0);
      return true;
    } catch (error) {
      // If process doesn't exist, kill throws ESRCH error
      return false;
    }
  }

  /**
   * Get daemon status as human-readable string
   */
  async getStatusString(): Promise<string> {
    const status = await this.checkStatus();
    
    switch (status.status) {
      case 'running':
        return `running (PID: ${status.pid})`;
      case 'stopped':
        return 'stopped';
      case 'unknown':
        return 'unknown';
      default:
        return 'unknown';
    }
  }
}