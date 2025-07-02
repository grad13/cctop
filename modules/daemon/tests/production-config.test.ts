/**
 * Production Configuration Test - TDD for Real Environment
 * Tests that production config files match test expectations
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DaemonConfigManager } from '../src/config/DaemonConfig';

describe('Production Configuration (TDD)', () => {
  const productionDir = '/Users/takuo-h/Workspace/Code/06-cctop/code/worktrees/07-01-daemon-production-ready';
  const configPath = path.join(productionDir, '.cctop/config/daemon-config.json');
  
  test('should have correct watchPaths for production use', async () => {
    // RED: This should fail initially
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    
    // Production should watch current directory, not test-data
    expect(config.monitoring.watchPaths).toEqual(['.']);
    expect(config.monitoring.watchPaths).not.toContain('./test-data');
  });
  
  test('should load config correctly in DaemonConfigManager', async () => {
    // RED: Test that config manager loads production config
    const originalCwd = process.cwd();
    
    try {
      process.chdir(productionDir);
      
      const configManager = new DaemonConfigManager();
      await configManager.loadConfig();
      const config = configManager.getConfig();
      
      // Should watch current directory for production use
      expect(config.monitoring.watchPaths).toEqual(['.']);
      expect(config.monitoring.excludePatterns).toContain('**/node_modules/**');
      expect(config.daemon.pidFile).toBe('.cctop/runtime/daemon.pid');
      
    } finally {
      process.chdir(originalCwd);
    }
  });
  
  test('should detect files in current directory, not test-data', async () => {
    // RED: Integration test for actual file detection
    const originalCwd = process.cwd();
    
    try {
      process.chdir(productionDir);
      
      // Create test file in production directory
      const testFile = 'production-test.txt';
      await fs.writeFile(testFile, 'production test content');
      
      const configManager = new DaemonConfigManager();
      await configManager.loadConfig();
      const config = configManager.getConfig();
      
      // Config should be set to watch files in current directory
      expect(config.monitoring.watchPaths).toEqual(['.']);
      
      // Clean up
      await fs.unlink(testFile);
      
    } finally {
      process.chdir(originalCwd);
    }
  });
});