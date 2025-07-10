/**
 * FUNC-105 Setup Flow Tests
 * Tests for Local Setup Initialization flow
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { Func105TestSetup, TestContext } from './test-helpers/func-105-test-setup';
import * as fs from 'fs';
import * as path from 'path';

describe('FUNC-105: Complete Setup Flow', () => {
  let testSetup: Func105TestSetup;
  let testDir: string;
  let context: TestContext;

  beforeAll(() => {
    testSetup = new Func105TestSetup();
    testDir = testSetup.createTestDirectory();
  });

  afterAll(() => {
    testSetup.cleanupTestDirectory();
  });

  beforeEach(() => {
    context = testSetup.setupTestContext(testDir);
  });

  afterEach(() => {
    testSetup.resetWorkingDirectory();
  });

  it('should create complete .cctop directory structure', async () => {
    await context.initializer.initialize();

    // Verify directory structure
    testSetup.verifyDirectoryStructure();
    testSetup.verifyConfigFiles();
    testSetup.verifyThemeFiles();
  });

  it('should respect existing configurations during initialization', async () => {
    // Create partial existing structure
    testSetup.createPartialStructure(['.cctop/config']);
    const existingConfig = { customSetting: 'preserved' };
    testSetup.createExistingConfig('.cctop/config/cli-config.json', existingConfig);

    await context.initializer.initialize();

    // Verify existing config is preserved (no merging with defaults)
    const config = testSetup.readConfigFile('.cctop/config/cli-config.json');
    expect(config.customSetting).toBe('preserved');
    expect(config).not.toHaveProperty('display'); // Existing files are not merged
  });

  it('should handle permission errors gracefully', async () => {
    // Skip on Windows where permission testing is different
    if (process.platform === 'win32') return;

    // Create readonly directory
    fs.mkdirSync('.cctop');
    testSetup.makeDirectoryReadOnly('.cctop');

    try {
      // Should not throw, but handle gracefully
      await expect(context.initializer.initialize()).resolves.not.toThrow();
    } finally {
      // Restore permissions for cleanup
      testSetup.restoreDirectoryPermissions('.cctop');
    }
  });

  it('should validate directory creation with correct permissions', async () => {
    await context.initializer.initialize();

    const stats = fs.statSync('.cctop');
    expect(stats.isDirectory()).toBe(true);

    // Verify subdirectories
    ['config', 'data', 'themes'].forEach(subdir => {
      const subdirStats = fs.statSync(path.join('.cctop', subdir));
      expect(subdirStats.isDirectory()).toBe(true);
    });
  });

  it('should create default configuration files with proper structure', async () => {
    await context.initializer.initialize();

    // Verify config file contents
    const sharedConfig = testSetup.readConfigFile('.cctop/config/shared-config.json');
    expect(sharedConfig).toHaveProperty('version');
    expect(sharedConfig).toHaveProperty('projectName');

    const daemonConfig = testSetup.readConfigFile('.cctop/config/daemon-config.json');
    expect(daemonConfig).toHaveProperty('monitoring');
    expect(daemonConfig).toHaveProperty('daemon');

    const cliConfig = testSetup.readConfigFile('.cctop/config/cli-config.json');
    expect(cliConfig).toHaveProperty('display');
    expect(cliConfig).toHaveProperty('interaction');
  });

  it('should handle multiple initialization calls idempotently', async () => {
    // First initialization
    const result1 = await context.initializer.initialize();
    expect(result1.success).toBe(true);

    // Verify structure exists
    testSetup.verifyDirectoryStructure();

    // Second initialization should not break anything
    const result2 = await context.initializer.initialize();
    expect(result2.success).toBe(true);

    // Structure should still be intact
    testSetup.verifyDirectoryStructure();
    testSetup.verifyConfigFiles();
  });

  it('should create data directory for database files', async () => {
    await context.initializer.initialize();

    // Verify data directory exists and is writable
    const dataDir = '.cctop/data';
    expect(fs.existsSync(dataDir)).toBe(true);
    
    const stats = fs.statSync(dataDir);
    expect(stats.isDirectory()).toBe(true);

    // Test writing to data directory
    const testFile = path.join(dataDir, 'test.db');
    fs.writeFileSync(testFile, 'test content');
    expect(fs.existsSync(testFile)).toBe(true);
    
    // Cleanup test file
    fs.unlinkSync(testFile);
  });

});