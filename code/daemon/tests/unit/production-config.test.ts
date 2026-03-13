/**
 * Production Configuration Test - TDD for Real Environment
 * Tests that production config files match test expectations
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DaemonConfigManager } from '../../src/config/DaemonConfig';

describe('Production Configuration (TDD)', () => {
  const productionDir = path.resolve(__dirname, '../../../..');
  const configPath = path.join(productionDir, '.cctop/config/daemon-config.json');
  
  test('should use default config when production config file does not exist', async () => {
    // Test default behavior when config file doesn't exist
    const configManager = new DaemonConfigManager(productionDir);
    await configManager.loadConfig();
    const config = configManager.getConfig();
    
    // Should use default config values
    expect(config.monitoring.watchPaths).toEqual(['.']);
    expect(config.monitoring.watchPaths).not.toContain('./test-data');
    expect(config.database.path).toBe('.cctop/data/activity.db');
  });
  
  test('should load config correctly in DaemonConfigManager', async () => {
    // Test using basePath parameter instead of process.chdir
    const configManager = new DaemonConfigManager(productionDir);
    await configManager.loadConfig();
    const config = configManager.getConfig();
    
    // Verify the config loaded correctly
    expect(config.monitoring.watchPaths).toEqual(['.']);
    expect(config.monitoring.watchPaths).not.toContain('./test-data');
  });
  
  test('should resolve paths relative to basePath', async () => {
    // Test that paths are resolved relative to the basePath
    const configManager = new DaemonConfigManager(productionDir);
    await configManager.loadConfig();
    const config = configManager.getConfig();
    
    // Database path should be relative to basePath
    expect(config.database.path).toBe('.cctop/data/activity.db');
    expect(config.daemon.pidFile).toBe('.cctop/runtime/daemon.pid');
    expect(config.daemon.logFile).toBe('.cctop/logs/daemon.log');
  });
});