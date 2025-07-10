/**
 * PID File Management
 */

import { DaemonState } from '../../../shared/dist/types';
import * as path from 'path';
import * as fs from 'fs/promises';
import { LogManager } from '../logging/LogManager';
import { DaemonConfigManager } from '../config/DaemonConfig';

export class PidManager {
  private pidFilePath: string;
  private logger: LogManager;
  private configManager: DaemonConfigManager;

  constructor(pidFilePath: string, logger: LogManager, configManager: DaemonConfigManager) {
    this.pidFilePath = pidFilePath;
    this.logger = logger;
    this.configManager = configManager;
  }

  async writePidFile(): Promise<void> {
    const config = this.configManager.getConfig();
    const state: DaemonState = {
      pid: process.pid,
      started_at: Date.now(),
      working_directory: process.cwd(),
      watch_paths: config.monitoring.watchPaths.map(p => path.resolve(p)),
      config_path: path.resolve('.cctop/daemon-config.json')
    };

    await fs.writeFile(this.pidFilePath, JSON.stringify(state, null, 2));
    this.logger.log('info', `PID file written: ${this.pidFilePath}`);
  }

  async removePidFile(): Promise<void> {
    try {
      await fs.unlink(this.pidFilePath);
      this.logger.log('info', 'PID file removed');
    } catch (error) {
      this.logger.log('warn', `Failed to remove PID file: ${error}`);
    }
  }

  async getPidState(): Promise<DaemonState | null> {
    try {
      const content = await fs.readFile(this.pidFilePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  async checkExistingDaemon(): Promise<{ exists: boolean; pid?: number; message?: string }> {
    const state = await this.getPidState();
    
    if (!state) {
      return { exists: false };
    }

    // Check if process is still running
    try {
      // Send signal 0 to check if process exists
      process.kill(state.pid, 0);
      return { 
        exists: true, 
        pid: state.pid,
        message: `Daemon already running with PID ${state.pid} in ${state.working_directory}`
      };
    } catch (error) {
      // Process doesn't exist, clean up stale PID file
      this.logger.log('warn', `Stale PID file found (PID: ${state.pid}), removing...`);
      await this.removePidFile();
      return { exists: false };
    }
  }
}