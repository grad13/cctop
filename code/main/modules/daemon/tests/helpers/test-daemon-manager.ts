/**
 * Test-specific Daemon Manager
 * Simplified daemon management for specific test scenarios
 */

import * as path from 'path';
import { ChildProcess } from 'child_process';
import { DaemonTestManager } from './daemon-manager';

export class TestDaemonManager {
  private testDir: string;
  private daemon: ChildProcess | null = null;

  constructor(testDir: string) {
    this.testDir = testDir;
  }

  async startDaemon(): Promise<ChildProcess> {
    const daemonPath = path.join(__dirname, '../../dist/index.js');
    this.daemon = await DaemonTestManager.startDaemon(daemonPath, this.testDir);
    return this.daemon;
  }

  async stopDaemon(): Promise<void> {
    if (this.daemon) {
      await DaemonTestManager.stopDaemon(this.daemon);
      this.daemon = null;
    }
  }
}