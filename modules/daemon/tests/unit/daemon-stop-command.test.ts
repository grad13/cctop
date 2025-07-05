/**
 * Daemon Stop Command Tests
 * Tests for cctop daemon stop functionality
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn, ChildProcess, execSync } from 'child_process';
import { getUniqueTestDir } from '../helpers';

describe('Daemon Stop Command', () => {
  let testDir: string;
  let daemonPath: string;
  let cctopPath: string;
  let daemon: ChildProcess | null = null;

  beforeEach(async () => {
    testDir = getUniqueTestDir('cctop-stop-command-test');
    daemonPath = path.resolve(__dirname, '../../dist/index.js');
    cctopPath = path.resolve(__dirname, '../../../../bin/cctop');
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Kill any running daemon
    if (daemon && !daemon.killed) {
      daemon.kill('SIGTERM');
    }
    
    // Wait for process to exit
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean test directory:', error);
    }
  });

  test('should stop running daemon with cctop daemon stop', async () => {
    // Start daemon directly
    daemon = spawn('node', [daemonPath, '--standalone'], {
      stdio: 'pipe',
      cwd: testDir
    });

    // Wait for daemon to start
    await new Promise<void>((resolve) => {
      daemon!.stdout!.on('data', (data) => {
        if (data.toString().includes('Daemon started successfully')) {
          resolve();
        }
      });
    });

    // Verify .cctop directory structure was created
    const cctopDirPath = path.join(testDir, '.cctop');
    await expect(fs.access(cctopDirPath)).resolves.toBeUndefined();
    await expect(fs.access(path.join(cctopDirPath, 'config'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(cctopDirPath, 'data'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(cctopDirPath, 'logs'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(cctopDirPath, 'runtime'))).resolves.toBeUndefined();

    // Verify PID file exists
    const pidFilePath = path.join(testDir, '.cctop/runtime/daemon.pid');
    await expect(fs.access(pidFilePath)).resolves.toBeUndefined();

    // Get the PID
    const pidData = JSON.parse(await fs.readFile(pidFilePath, 'utf8'));
    const pid = pidData.pid;

    // Run cctop daemon stop
    const stopResult = execSync(`node ${cctopPath} daemon stop`, {
      cwd: testDir,
      encoding: 'utf8'
    });

    expect(stopResult).toContain('Stopping daemon');
    // The daemon might stop with SIGTERM or SIGKILL depending on timing
    expect(
      stopResult.includes('Daemon stopped successfully') ||
      stopResult.includes('Daemon did not stop gracefully')
    ).toBe(true);

    // Wait a bit for process to fully exit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify process is not running
    expect(() => {
      process.kill(pid, 0);
    }).toThrow();

    // Verify PID file was removed
    await expect(fs.access(pidFilePath)).rejects.toThrow();
  });

  test('should handle stop when no daemon is running', async () => {
    // Run cctop daemon stop without any daemon
    const stopResult = execSync(`node ${cctopPath} daemon stop`, {
      cwd: testDir,
      encoding: 'utf8'
    });

    expect(stopResult).toContain('No daemon is currently running');
  });

  test('should clean up stale PID file', async () => {
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

    // Run cctop daemon stop
    const stopResult = execSync(`node ${cctopPath} daemon stop`, {
      cwd: testDir,
      encoding: 'utf8'
    });

    expect(stopResult).toContain('Daemon is not running');
    expect(stopResult).toContain('Cleaned up stale PID file');

    // Verify PID file was removed
    await expect(fs.access(pidFilePath)).rejects.toThrow();
  });

  test('should check daemon status', async () => {
    // Start daemon
    daemon = spawn('node', [daemonPath, '--standalone'], {
      stdio: 'pipe',
      cwd: testDir
    });

    // Wait for daemon to start
    await new Promise<void>((resolve) => {
      daemon!.stdout!.on('data', (data) => {
        if (data.toString().includes('Daemon started successfully')) {
          resolve();
        }
      });
    });

    // Check status
    const statusResult = execSync(`node ${cctopPath} daemon status`, {
      cwd: testDir,
      encoding: 'utf8'
    });

    expect(statusResult).toContain('Daemon is running');
    expect(statusResult).toContain('Working directory:');
    expect(statusResult).toContain('Monitoring:');
    expect(statusResult).toContain('Started at:');

    // Stop daemon
    daemon.kill('SIGTERM');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check status again
    const statusResult2 = execSync(`node ${cctopPath} daemon status`, {
      cwd: testDir,
      encoding: 'utf8'
    });

    expect(statusResult2).toContain('No daemon is currently running');
  });

  test('should create .cctop directory with cctop daemon start', async () => {
    // Run cctop daemon start
    const startResult = execSync(`node ${cctopPath} daemon start`, {
      cwd: testDir,
      encoding: 'utf8'
    });

    expect(startResult).toContain('Starting daemon');
    
    // Wait for daemon to fully start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify .cctop directory structure
    const cctopDirPath = path.join(testDir, '.cctop');
    await expect(fs.access(cctopDirPath)).resolves.toBeUndefined();
    await expect(fs.access(path.join(cctopDirPath, 'config'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(cctopDirPath, 'data'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(cctopDirPath, 'logs'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(cctopDirPath, 'runtime'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(cctopDirPath, 'temp'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(cctopDirPath, 'themes'))).resolves.toBeUndefined();

    // Stop daemon
    execSync(`node ${cctopPath} daemon stop`, {
      cwd: testDir,
      encoding: 'utf8'
    });
  });
});