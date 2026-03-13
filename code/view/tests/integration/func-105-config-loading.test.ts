/**
 * FUNC-105 Configuration Loading Integration Tests
 * Tests for configuration hierarchy and loading mechanisms
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { Func105TestSetup, TestContext } from './test-helpers/func-105-test-setup';
import * as fs from 'fs';

describe('FUNC-105 Configuration Loading Integration', () => {
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

  beforeEach(async () => {
    context = testSetup.setupTestContext(testDir);
    await context.initializer.initialize();
  });

  afterEach(() => {
    testSetup.resetWorkingDirectory();
  });

  it('should load complete configuration hierarchy', async () => {
    const config = await context.configLoader.loadConfiguration();

    // Verify 3-layer configuration structure
    expect(config).toHaveProperty('shared');
    expect(config).toHaveProperty('daemon');
    expect(config).toHaveProperty('cli');

    // Verify CLI config structure
    expect(config.cli).toHaveProperty('display');
    expect(config.cli).toHaveProperty('interaction');
    expect(config.cli).toHaveProperty('logFile');
  });

  it('should handle configuration override priority correctly', async () => {
    // Modify shared config
    const sharedPath = '.cctop/config/shared-config.json';
    const sharedConfig = testSetup.readConfigFile(sharedPath);
    sharedConfig.database = { path: 'custom-shared.db' };
    testSetup.createExistingConfig(sharedPath, sharedConfig);

    // Modify CLI config with override
    const cliPath = '.cctop/config/cli-config.json';
    const cliConfig = testSetup.readConfigFile(cliPath);
    cliConfig.database = { path: 'custom-cli.db' };
    testSetup.createExistingConfig(cliPath, cliConfig);

    const config = await context.configLoader.loadConfiguration();

    // CLI config should override shared config
    expect(config.cli.database.path).toBe('custom-cli.db');
    expect(config.shared.database.path).toBe('custom-shared.db');
  });

  it('should validate configuration file format and structure', async () => {
    const config = await context.configLoader.loadConfiguration();

    // Validate required CLI configuration sections
    expect(config.cli.display).toHaveProperty('refreshInterval');
    expect(config.cli.display).toHaveProperty('maxRows');
    expect(config.cli.display).toHaveProperty('showTimestamps');

    expect(config.cli.interaction).toHaveProperty('enableMouse');
    expect(config.cli.interaction).toHaveProperty('scrollSpeed');
  });

  it('should handle missing configuration files gracefully', async () => {
    // Remove a config file
    const cliPath = '.cctop/config/cli-config.json';
    if (fs.existsSync(cliPath)) {
      fs.unlinkSync(cliPath);
    }

    // Should still load with defaults
    const config = await context.configLoader.loadConfiguration();
    expect(config).toHaveProperty('cli');
    expect(config.cli).toHaveProperty('display');
  });

  it('should merge configuration layers correctly', async () => {
    // Set a value in shared config
    const sharedPath = '.cctop/config/shared-config.json';
    const sharedConfig = testSetup.readConfigFile(sharedPath);
    sharedConfig.testValue = 'from-shared';
    sharedConfig.overrideTest = 'shared-value';
    testSetup.createExistingConfig(sharedPath, sharedConfig);

    // Override in CLI config
    const cliPath = '.cctop/config/cli-config.json';
    const cliConfig = testSetup.readConfigFile(cliPath);
    cliConfig.overrideTest = 'cli-value';
    testSetup.createExistingConfig(cliPath, cliConfig);

    const config = await context.configLoader.loadConfiguration();

    // Shared value should be accessible
    expect(config.shared.testValue).toBe('from-shared');
    
    // CLI should override shared
    expect(config.cli.overrideTest).toBe('cli-value');
    expect(config.shared.overrideTest).toBe('shared-value');
  });

  it('should validate configuration data types', async () => {
    const config = await context.configLoader.loadConfiguration();

    // Type validations
    expect(typeof config.cli.display.refreshInterval).toBe('number');
    expect(typeof config.cli.display.maxRows).toBe('number');
    expect(typeof config.cli.display.showTimestamps).toBe('boolean');
    expect(typeof config.cli.interaction.enableMouse).toBe('boolean');
    expect(typeof config.cli.interaction.scrollSpeed).toBe('number');
  });

  it('should handle corrupted configuration files', async () => {
    // Corrupt a config file
    const cliPath = '.cctop/config/cli-config.json';
    testSetup.corruptFile(cliPath);

    // Should handle gracefully and use defaults
    const config = await context.configLoader.loadConfiguration();
    expect(config).toHaveProperty('cli');
    expect(config.cli).toHaveProperty('display');
  });

  it('should preserve custom configuration sections', async () => {
    // Add custom sections to config
    const cliPath = '.cctop/config/cli-config.json';
    const cliConfig = testSetup.readConfigFile(cliPath);
    cliConfig.customSection = {
      customKey: 'customValue',
      nested: {
        value: 42
      }
    };
    testSetup.createExistingConfig(cliPath, cliConfig);

    const config = await context.configLoader.loadConfiguration();

    // Custom sections should be preserved
    expect(config.cli.customSection).toBeDefined();
    expect(config.cli.customSection.customKey).toBe('customValue');
    expect(config.cli.customSection.nested.value).toBe(42);
  });

});