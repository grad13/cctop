/**
 * Daemon Process Management for Tests
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

export class TestDaemonManager {
  private daemonProcess: ChildProcess | null = null;
  private testDir: string;

  constructor(testDir: string) {
    this.testDir = testDir;
  }

  async startDaemon(): Promise<ChildProcess> {
    const daemonPath = path.resolve(__dirname, '../../dist/index.js');
    
    this.daemonProcess = spawn('node', [daemonPath, '--standalone'], {
      stdio: 'pipe',
      cwd: this.testDir,
      env: { ...process.env, NODE_ENV: 'test' }
    });

    // Wait for daemon to start
    await new Promise(resolve => setTimeout(resolve, 3000));

    return this.daemonProcess;
  }

  async stopDaemon(): Promise<void> {
    if (this.daemonProcess) {
      return new Promise((resolve) => {
        if (!this.daemonProcess) {
          resolve();
          return;
        }

        this.daemonProcess.on('exit', () => {
          resolve();
        });

        this.daemonProcess.kill('SIGTERM');
        
        // Fallback kill after timeout
        setTimeout(() => {
          if (this.daemonProcess && !this.daemonProcess.killed) {
            this.daemonProcess.kill('SIGKILL');
          }
          resolve();
        }, 2000);
      });
    }
  }

  getCurrentProcess(): ChildProcess | null {
    return this.daemonProcess;
  }
}