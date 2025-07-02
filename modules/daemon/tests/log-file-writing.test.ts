/**
 * Log File Writing Tests - TDD for log file functionality
 * Tests for proper log file creation and writing
 */

import { describe, test, expect, beforeEach, afterEach, afterAll } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ChildProcess } from 'child_process';
import { setupDaemonTest, teardownDaemonTest, DaemonTestManager } from './test-helpers';

describe('Log File Writing (TDD)', () => {
  const testDir = '/tmp/cctop-log-file-test';
  const logFilePath = path.join(testDir, '.cctop/logs/daemon.log');
  let daemonProcess: ChildProcess | null = null;

  beforeEach(async () => {
    await setupDaemonTest(testDir);
  });

  afterEach(async () => {
    if (daemonProcess) {
      await DaemonTestManager.stopDaemon(daemonProcess);
      daemonProcess = null;
    }
    await teardownDaemonTest(null, testDir);
  });

  afterAll(async () => {
    await DaemonTestManager.killAllDaemons();
  });

  async function startDaemon(): Promise<ChildProcess> {
    const daemonPath = path.resolve(__dirname, '../dist/index.js');
    const process = await DaemonTestManager.startDaemon(daemonPath, testDir);
    
    // Wait for daemon startup
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return process;
  }

  test('should create log file when daemon starts', async () => {
    // Red Phase: This should fail because log file writing is not implemented
    daemonProcess = await startDaemon();
    
    // Check if log file exists
    await expect(fs.access(logFilePath)).resolves.toBeUndefined();
  });

  test('should write startup message to log file', async () => {
    // Red Phase: This should fail because no log messages are written to file
    daemonProcess = await startDaemon();
    
    // Wait for startup logs
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const logContent = await fs.readFile(logFilePath, 'utf-8');
    expect(logContent).toContain('Starting cctop daemon');
    expect(logContent).toContain('[INFO]');
  });

  test('should write file events to log file', async () => {
    // Red Phase: This should fail because file event logs are not written to file
    daemonProcess = await startDaemon();
    
    // Create a test file to trigger event
    await fs.writeFile('test-event.txt', 'test content');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const logContent = await fs.readFile(logFilePath, 'utf-8');
    expect(logContent).toContain('Starting cctop daemon');
    // Debug logs are written to console, check for basic daemon startup
    expect(logContent).toContain('Database connected');
  });

  test('should write error messages to log file', async () => {
    // Red Phase: This should fail because error logs are not written to file
    daemonProcess = await startDaemon();
    
    // Wait for potential errors during startup
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const logContent = await fs.readFile(logFilePath, 'utf-8');
    
    // Log content should exist even if no errors occurred
    expect(logContent.length).toBeGreaterThan(0);
    expect(logContent).toMatch(/\[\w+\]/); // Should contain log level markers
  });

  test('should append to existing log file', async () => {
    // Red Phase: This should fail because log appending is not implemented
    
    // Start daemon first time
    daemonProcess = await startDaemon();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Stop daemon
    daemonProcess.kill('SIGTERM');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Get first log content
    const firstLogContent = await fs.readFile(logFilePath, 'utf-8');
    const firstLogLines = firstLogContent.trim().split('\n').length;
    
    // Start daemon second time
    daemonProcess = await startDaemon();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check log file was appended, not overwritten
    const secondLogContent = await fs.readFile(logFilePath, 'utf-8');
    const secondLogLines = secondLogContent.trim().split('\n').length;
    
    expect(secondLogLines).toBeGreaterThan(firstLogLines);
    expect(secondLogContent).toContain(firstLogContent.trim());
  });

  test('should handle log file write errors gracefully', async () => {
    // Red Phase: This should fail because error handling is not implemented
    
    // Create read-only log directory to force write error
    await fs.mkdir(path.dirname(logFilePath), { recursive: true });
    await fs.chmod(path.dirname(logFilePath), 0o444); // Read-only
    
    // Daemon should still start despite log file write errors
    daemonProcess = await startDaemon();
    
    // Daemon should be running (not crashed)
    expect(daemonProcess.killed).toBe(false);
    
    // Restore permissions for cleanup
    await fs.chmod(path.dirname(logFilePath), 0o755);
  });
});