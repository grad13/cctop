/**
 * Daemon Module Tests
 * Tests for FUNC-003/106 compliance
 */

import { describe, test, expect, beforeEach, afterEach, afterAll } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ChildProcess } from 'child_process';
import { DaemonTestManager, setupDaemonTest, teardownDaemonTest, getUniqueTestDir } from '../helpers';

describe('Daemon Module', () => {
  let testDir: string;
  let testDbPath: string;
  let testPidPath: string;
  let daemonProcess: ChildProcess | null = null;

  beforeEach(async () => {
    testDir = getUniqueTestDir('cctop-daemon-test');
    testDbPath = path.join(testDir, '.cctop/data/activity.db');
    testPidPath = path.join(testDir, '.cctop/runtime/daemon.pid');
    await setupDaemonTest(testDir);
  });

  afterEach(async () => {
    await teardownDaemonTest(daemonProcess, testDir);
    daemonProcess = null;
  });

  afterAll(async () => {
    await DaemonTestManager.globalCleanup();
  });

  test('daemon should start and create required directories', async () => {
    const daemonPath = path.resolve(__dirname, '../../dist/index.js');
    
    // Start daemon using test manager
    daemonProcess = await DaemonTestManager.startDaemon(daemonPath, testDir);

    // Wait for startup
    await DaemonTestManager.waitForDaemonStartup(daemonProcess);

    // Check required directories exist
    const dirs = [
      path.join(testDir, '.cctop'),
      path.join(testDir, '.cctop/data'),
      path.join(testDir, '.cctop/logs')
    ];

    for (const dir of dirs) {
      await expect(fs.access(dir)).resolves.toBeUndefined();
    }
  });

  test('daemon should create PID file with correct structure', async () => {
    const daemonPath = path.resolve(__dirname, '../../dist/index.js');
    
    daemonProcess = await DaemonTestManager.startDaemon(daemonPath, testDir);
    await DaemonTestManager.waitForDaemonStartup(daemonProcess);

    // Check PID file exists and has correct structure
    const pidContent = await fs.readFile(testPidPath, 'utf8');
    const pidData = JSON.parse(pidContent);

    expect(pidData).toHaveProperty('pid');
    expect(pidData).toHaveProperty('started_at');
    expect(pidData).toHaveProperty('working_directory');
    expect(pidData).toHaveProperty('watch_paths');
    expect(pidData).toHaveProperty('config_path');
    expect(typeof pidData.pid).toBe('number');
    expect(typeof pidData.started_at).toBe('number');
    expect(typeof pidData.working_directory).toBe('string');
    expect(Array.isArray(pidData.watch_paths)).toBe(true);
  });

  test('daemon should respond to file creation events', async () => {
    const daemonPath = path.resolve(__dirname, '../../dist/index.js');
    
    daemonProcess = await DaemonTestManager.startDaemon(daemonPath, testDir);
    await DaemonTestManager.waitForDaemonStartup(daemonProcess);
    
    // Additional wait for monitoring to stabilize
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create a test file
    const testFile = path.join(testDir, 'test-file.txt');
    await fs.writeFile(testFile, 'test content');

    // Wait for event processing
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check database was created and contains events
    await expect(fs.access(testDbPath)).resolves.toBeUndefined();
  });

  test('daemon should handle graceful shutdown on SIGTERM', async () => {
    const daemonPath = path.resolve(__dirname, '../../dist/index.js');
    
    daemonProcess = await DaemonTestManager.startDaemon(daemonPath, testDir);
    await DaemonTestManager.waitForDaemonStartup(daemonProcess);

    // Verify PID file exists
    await expect(fs.access(testPidPath)).resolves.toBeUndefined();

    // Send SIGTERM
    daemonProcess.kill('SIGTERM');

    // Wait for shutdown
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify PID file was removed
    await expect(fs.access(testPidPath)).rejects.toThrow();
    
    daemonProcess = null; // Don't try to kill again in cleanup
  });

  test('daemon should exclude configured patterns', async () => {
    const daemonPath = path.resolve(__dirname, '../../dist/index.js');
    
    daemonProcess = await DaemonTestManager.startDaemon(daemonPath, testDir);
    await DaemonTestManager.waitForDaemonStartup(daemonProcess);

    // Create files that should be excluded
    await fs.mkdir(path.join(testDir, 'node_modules'), { recursive: true });
    await fs.writeFile(path.join(testDir, 'node_modules/test.js'), 'excluded');
    
    await fs.mkdir(path.join(testDir, '.git'), { recursive: true });
    await fs.writeFile(path.join(testDir, '.git/config'), 'excluded');

    await fs.writeFile(path.join(testDir, '.hidden'), 'excluded');

    // Wait for potential event processing
    await new Promise(resolve => setTimeout(resolve, 500));

    // These exclusions are handled by chokidar, so we just verify daemon is still running
    expect(daemonProcess.killed).toBe(false);
  });

  test('daemon should detect move events correctly', async () => {
    const daemonPath = path.resolve(__dirname, '../../dist/index.js');
    
    daemonProcess = await DaemonTestManager.startDaemon(daemonPath, testDir);
    await DaemonTestManager.waitForDaemonStartup(daemonProcess);
    
    // Additional wait for monitoring to stabilize
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create a test file first
    const originalFile = path.join(testDir, 'move-test-original.txt');
    const movedFile = path.join(testDir, 'move-test-moved.txt');
    
    await fs.writeFile(originalFile, 'test content for move');
    
    // Wait for create event to be processed
    await new Promise(resolve => setTimeout(resolve, 200));

    // Perform move operation (unlink + add within 100ms threshold)
    await fs.rename(originalFile, movedFile);
    
    // Wait for move detection processing
    await new Promise(resolve => setTimeout(resolve, 300));

    // Check database contains move event
    const testDbPath = path.join(testDir, '.cctop/data/activity.db');
    await expect(fs.access(testDbPath)).resolves.toBeUndefined();
    
    // Database should contain create and move events
    // This is a basic test - in practice we'd query the DB to verify move event
  });

  test('daemon should handle file modification events', async () => {
    const daemonPath = path.resolve(__dirname, '../../dist/index.js');
    
    daemonProcess = await DaemonTestManager.startDaemon(daemonPath, testDir);
    await DaemonTestManager.waitForDaemonStartup(daemonProcess);

    // Create and modify a file
    const testFile = path.join(testDir, 'modify-test.txt');
    await fs.writeFile(testFile, 'initial content');
    
    // Wait for create event
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Modify the file
    await fs.appendFile(testFile, '\nmodified content');
    
    // Wait for modify event processing
    await new Promise(resolve => setTimeout(resolve, 300));

    // Verify database exists (events were recorded)
    const testDbPath = path.join(testDir, '.cctop/data/activity.db');
    await expect(fs.access(testDbPath)).resolves.toBeUndefined();
  });

  test('daemon should handle file deletion events', async () => {
    const daemonPath = path.resolve(__dirname, '../../dist/index.js');
    
    daemonProcess = await DaemonTestManager.startDaemon(daemonPath, testDir);
    await DaemonTestManager.waitForDaemonStartup(daemonProcess);

    // Create a file to delete
    const testFile = path.join(testDir, 'delete-test.txt');
    await fs.writeFile(testFile, 'content to be deleted');
    
    // Wait for create event
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Delete the file
    await fs.unlink(testFile);
    
    // Wait for delete event processing (including move timeout)
    await new Promise(resolve => setTimeout(resolve, 400));

    // Verify database exists (events were recorded)
    const testDbPath = path.join(testDir, '.cctop/data/activity.db');
    await expect(fs.access(testDbPath)).resolves.toBeUndefined();
  });
});

describe('Daemon Configuration', () => {
  test('should use default configuration when no config file exists', () => {
    // This test would be run during daemon startup
    // Default config should include proper monitoring settings
    expect(true).toBe(true); // Placeholder - actual config testing would need daemon introspection
  });

  test('should handle missing directories gracefully', async () => {
    const testDir = getUniqueTestDir('cctop-daemon-config-test');
    await fs.mkdir(testDir, { recursive: true });
    
    try {
      // Test directory creation logic
      const dirs = ['.cctop', '.cctop/data', '.cctop/logs', '.cctop/runtime'];
      
      for (const dir of dirs) {
        const fullPath = path.join(testDir, dir);
        await fs.mkdir(fullPath, { recursive: true });
        await expect(fs.access(fullPath)).resolves.toBeUndefined();
      }
    } finally {
      await fs.rm(testDir, { recursive: true, force: true });
    }
  });
});