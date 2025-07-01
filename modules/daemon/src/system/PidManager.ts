/**
 * PID File Management
 */

import { DaemonState } from '@cctop/shared';
import * as path from 'path';
import * as fs from 'fs/promises';
import { LogManager } from '../logging/LogManager';

export class PidManager {
  private pidFilePath: string;
  private logger: LogManager;
  private startedBy: 'cli' | 'standalone';

  constructor(pidFilePath: string, logger: LogManager, startedBy: 'cli' | 'standalone' = 'standalone') {
    this.pidFilePath = pidFilePath;
    this.logger = logger;
    this.startedBy = startedBy;
  }

  async writePidFile(): Promise<void> {
    const state: DaemonState = {
      pid: process.pid,
      started_by: this.startedBy,
      started_at: Date.now(),
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
}