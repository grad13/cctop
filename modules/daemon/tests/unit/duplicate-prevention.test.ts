/**
 * Duplicate Daemon Prevention Tests
 * Tests for preventing multiple daemon instances on the same directory
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { getUniqueTestDir } from '../helpers';

describe('Duplicate Daemon Prevention', () => {
  let testDir: string;
  let daemonPath: string;
  let firstDaemon: ChildProcess | null = null;
  let secondDaemon: ChildProcess | null = null;

  beforeEach(async () => {
    testDir = getUniqueTestDir('cctop-duplicate-prevention-test');
    daemonPath = path.resolve(__dirname, '../../dist/index.js');
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Kill any running daemons
    if (firstDaemon && !firstDaemon.killed) {
      firstDaemon.kill('SIGTERM');
    }
    if (secondDaemon && !secondDaemon.killed) {
      secondDaemon.kill('SIGTERM');
    }
    
    // Wait for processes to exit
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean test directory:', error);
    }
  });

  test('should prevent duplicate daemon on same directory', async () => {
    // Start first daemon
    firstDaemon = spawn('node', [daemonPath, '--standalone'], {
      stdio: 'pipe',
      cwd: testDir
    });

    // Wait for first daemon to fully start
    await new Promise<void>((resolve) => {
      firstDaemon!.stdout!.on('data', (data) => {
        if (data.toString().includes('Daemon started successfully')) {
          resolve();
        }
      });
    });

    // Verify PID file exists
    const pidFilePath = path.join(testDir, '.cctop/runtime/daemon.pid');
    await expect(fs.access(pidFilePath)).resolves.toBeUndefined();

    // Try to start second daemon
    secondDaemon = spawn('node', [daemonPath, '--standalone'], {
      stdio: 'pipe',
      cwd: testDir
    });

    // Collect output from second daemon
    let secondDaemonOutput = '';
    let secondDaemonError = '';
    
    secondDaemon.stdout!.on('data', (data) => {
      secondDaemonOutput += data.toString();
    });
    
    secondDaemon.stderr!.on('data', (data) => {
      secondDaemonError += data.toString();
    });

    // Wait for second daemon to exit
    await new Promise<void>((resolve) => {
      secondDaemon!.on('exit', () => {
        resolve();
      });
    });

    // Verify second daemon failed with appropriate error
    expect(secondDaemonOutput).toContain('Daemon already running with PID');
  });

  test('should clean up stale PID file and start successfully', async () => {
    // Create a fake PID file with non-existent process
    const pidFilePath = path.join(testDir, '.cctop/runtime/daemon.pid');
    await fs.mkdir(path.dirname(pidFilePath), { recursive: true });
    
    const stalePidData = {
      pid: 99999999, // Very high PID unlikely to exist
      started_at: Date.now() - 3600000, // 1 hour ago
      working_directory: testDir,
      watch_paths: [testDir],
      config_path: path.join(testDir, '.cctop/daemon-config.json')
    };
    
    await fs.writeFile(pidFilePath, JSON.stringify(stalePidData, null, 2));

    // Start daemon - should succeed after cleaning stale PID
    firstDaemon = spawn('node', [daemonPath, '--standalone'], {
      stdio: 'pipe',
      cwd: testDir
    });

    let daemonOutput = '';
    firstDaemon.stdout!.on('data', (data) => {
      daemonOutput += data.toString();
    });

    // Wait for daemon to start
    await new Promise<void>((resolve) => {
      firstDaemon!.stdout!.on('data', (data) => {
        if (data.toString().includes('Daemon started successfully')) {
          resolve();
        }
      });
    });

    // Verify stale PID warning and successful start
    expect(daemonOutput).toContain('Stale PID file found');
    expect(daemonOutput).toContain('Daemon started successfully');
  });

  test('should handle PID file read errors gracefully', async () => {
    // Create an invalid PID file
    const pidFilePath = path.join(testDir, '.cctop/runtime/daemon.pid');
    await fs.mkdir(path.dirname(pidFilePath), { recursive: true });
    await fs.writeFile(pidFilePath, 'invalid json content');

    // Start daemon - should succeed
    firstDaemon = spawn('node', [daemonPath, '--standalone'], {
      stdio: 'pipe',
      cwd: testDir
    });

    let daemonOutput = '';
    firstDaemon.stdout!.on('data', (data) => {
      daemonOutput += data.toString();
    });

    // Wait for daemon to start
    await new Promise<void>((resolve) => {
      firstDaemon!.stdout!.on('data', (data) => {
        if (data.toString().includes('Daemon started successfully')) {
          resolve();
        }
      });
    });

    // Verify successful start despite invalid PID file
    expect(daemonOutput).toContain('Daemon started successfully');
  });
});