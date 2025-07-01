/**
 * SIGHUP Configuration Reload Tests
 * Tests for TDD-driven SIGHUP config reload functionality
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

describe('SIGHUP Configuration Reload', () => {
  const testDir = '/tmp/cctop-sighup-test';
  const testConfigPath = path.join(testDir, '.cctop/config/daemon.json');
  const testLogPath = path.join(testDir, '.cctop/logs/daemon.log');
  let daemonProcess: ChildProcess | null = null;

  beforeEach(async () => {
    // Setup test environment
    await fs.mkdir(path.dirname(testConfigPath), { recursive: true });
    await fs.mkdir(path.dirname(testLogPath), { recursive: true });
    process.chdir(testDir);
  });

  afterEach(async () => {
    // Clean up daemon process
    if (daemonProcess) {
      daemonProcess.kill('SIGTERM');
      daemonProcess = null;
    }

    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 200));

    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean test directory:', error);
    }
  });

  test('should reload config on SIGHUP signal', async () => {
    // Phase 1: Create initial config
    const initialConfig = {
      version: '0.3.0.0',
      monitoring: {
        watchPaths: [testDir],
        excludePatterns: ['**/node_modules/**'],
        debounceMs: 100
      },
      logging: {
        level: 'info',
        file: testLogPath
      }
    };
    
    await fs.writeFile(testConfigPath, JSON.stringify(initialConfig, null, 2));

    // Phase 2: Start daemon
    const daemonPath = path.resolve(__dirname, '../dist/index.js');
    daemonProcess = spawn('node', [daemonPath, '--standalone'], {
      stdio: 'pipe',
      cwd: testDir
    });

    // Wait for startup
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Phase 3: Modify config file
    const updatedConfig = {
      ...initialConfig,
      monitoring: {
        ...initialConfig.monitoring,
        debounceMs: 200, // Changed from 100 to 200
      }
    };
    
    await fs.writeFile(testConfigPath, JSON.stringify(updatedConfig, null, 2));

    // Phase 4: Send SIGHUP signal
    if (daemonProcess.pid) {
      process.kill(daemonProcess.pid, 'SIGHUP');
    }

    // Wait for config reload
    await new Promise(resolve => setTimeout(resolve, 500));

    // Phase 5: Verify config reload in logs
    const logContent = await fs.readFile(testLogPath, 'utf-8');
    expect(logContent).toContain('Received SIGHUP, reloading configuration...');
    expect(logContent).toContain('Configuration reloaded successfully');
  });

  test('should handle SIGHUP when config file does not exist', async () => {
    // Phase 1: Start daemon without config file
    const daemonPath = path.resolve(__dirname, '../dist/index.js');
    daemonProcess = spawn('node', [daemonPath, '--standalone'], {
      stdio: 'pipe',
      cwd: testDir
    });

    // Wait for startup
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Phase 2: Send SIGHUP signal
    if (daemonProcess.pid) {
      process.kill(daemonProcess.pid, 'SIGHUP');
    }

    // Wait for reload attempt
    await new Promise(resolve => setTimeout(resolve, 500));

    // Phase 3: Verify fallback to default config
    const logContent = await fs.readFile(testLogPath, 'utf-8');
    expect(logContent).toContain('Received SIGHUP, reloading configuration...');
    expect(logContent).toContain('Config file not found, using default configuration');
  });

  test('should handle SIGHUP with invalid config file', async () => {
    // Phase 1: Create invalid config
    await fs.writeFile(testConfigPath, 'invalid json content');

    // Phase 2: Start daemon
    const daemonPath = path.resolve(__dirname, '../dist/index.js');
    daemonProcess = spawn('node', [daemonPath, '--standalone'], {
      stdio: 'pipe',
      cwd: testDir
    });

    // Wait for startup
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Phase 3: Send SIGHUP signal
    if (daemonProcess.pid) {
      process.kill(daemonProcess.pid, 'SIGHUP');
    }

    // Wait for reload attempt
    await new Promise(resolve => setTimeout(resolve, 500));

    // Phase 4: Verify error handling
    const logContent = await fs.readFile(testLogPath, 'utf-8');
    expect(logContent).toContain('Received SIGHUP, reloading configuration...');
    expect(logContent).toContain('Failed to reload configuration');
    expect(logContent).toContain('Continuing with current configuration');
  });
});