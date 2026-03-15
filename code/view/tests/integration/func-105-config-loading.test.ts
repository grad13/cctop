/**
 * FUNC-105 Configuration Loading Integration Tests
 * Tests for configuration hierarchy and loading mechanisms
 * @created 2026-03-13
 * @checked -
 * @updated 2026-03-13
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
    // Load configuration to auto-generate view-config.json
    await context.configLoader.loadConfiguration();
  });

  afterEach(() => {
    testSetup.resetWorkingDirectory();
  });

  it('should load complete configuration hierarchy', async () => {
    const config = await context.configLoader.loadConfiguration();

    // Verify 3-layer configuration structure
    expect(config).toHaveProperty('shared');
    expect(config).toHaveProperty('daemon');
    expect(config).toHaveProperty('view');

    // Verify view config structure
    expect(config.view).toHaveProperty('display');
    expect(config.view).toHaveProperty('interactive');
    expect(config.view).toHaveProperty('locale');
  });

  it('should handle configuration override priority correctly', async () => {
    // Modify shared config
    const sharedPath = '.cctop/config/shared-config.json';
    const sharedConfig = testSetup.readConfigFile(sharedPath);
    sharedConfig.database = { path: 'custom-shared.db' };
    testSetup.createExistingConfig(sharedPath, sharedConfig);

    // Modify view config with override
    const viewPath = '.cctop/config/view-config.json';
    const viewConfig = testSetup.readConfigFile(viewPath);
    viewConfig.database = { path: 'custom-view.db' };
    testSetup.createExistingConfig(viewPath, viewConfig);

    const config = await context.configLoader.loadConfiguration();

    // View config should override shared config
    expect(config.view.database.path).toBe('custom-view.db');
    expect(config.shared.database.path).toBe('custom-shared.db');
  });

  it('should validate configuration file format and structure', async () => {
    const config = await context.configLoader.loadConfiguration();

    // Validate required view configuration sections
    expect(config.view.display).toHaveProperty('refreshRateMs');
    expect(config.view.display).toHaveProperty('maxEvents');
    expect(config.view.display).toHaveProperty('dateFormat');

    expect(config.view.interactive).toHaveProperty('keyRepeatDelay');
    expect(config.view.interactive).toHaveProperty('keyRepeatInterval');
  });

  it('should handle missing configuration files gracefully', async () => {
    // Remove a config file
    const viewPath = '.cctop/config/view-config.json';
    if (fs.existsSync(viewPath)) {
      fs.unlinkSync(viewPath);
    }

    // Should still load with defaults
    const config = await context.configLoader.loadConfiguration();
    expect(config).toHaveProperty('view');
    expect(config.view).toHaveProperty('display');
  });

  it('should merge configuration layers correctly', async () => {
    // Set a value in shared config
    const sharedPath = '.cctop/config/shared-config.json';
    const sharedConfig = testSetup.readConfigFile(sharedPath);
    sharedConfig.testValue = 'from-shared';
    sharedConfig.overrideTest = 'shared-value';
    testSetup.createExistingConfig(sharedPath, sharedConfig);

    // Override in view config
    const viewPath = '.cctop/config/view-config.json';
    const viewConfig = testSetup.readConfigFile(viewPath);
    viewConfig.overrideTest = 'view-value';
    testSetup.createExistingConfig(viewPath, viewConfig);

    const config = await context.configLoader.loadConfiguration();

    // Shared value should be accessible
    expect(config.shared.testValue).toBe('from-shared');
    
    // View should override shared
    expect(config.view.overrideTest).toBe('view-value');
    expect(config.shared.overrideTest).toBe('shared-value');
  });

  it('should validate configuration data types', async () => {
    const config = await context.configLoader.loadConfiguration();

    // Type validations
    expect(typeof config.view.display.refreshRateMs).toBe('number');
    expect(typeof config.view.display.maxEvents).toBe('number');
    expect(typeof config.view.display.dateFormat).toBe('string');
    expect(typeof config.view.interactive.keyRepeatDelay).toBe('number');
    expect(typeof config.view.interactive.keyRepeatInterval).toBe('number');
  });

  it('should handle corrupted configuration files', async () => {
    // Corrupt a config file
    const viewPath = '.cctop/config/view-config.json';
    testSetup.corruptFile(viewPath);

    // Should handle gracefully and use defaults
    const config = await context.configLoader.loadConfiguration();
    expect(config).toHaveProperty('view');
    expect(config.view).toHaveProperty('display');
  });

  it('should preserve custom configuration sections', async () => {
    // Add custom sections to config
    const viewPath = '.cctop/config/view-config.json';
    const viewConfig = testSetup.readConfigFile(viewPath);
    viewConfig.customSection = {
      customKey: 'customValue',
      nested: {
        value: 42
      }
    };
    testSetup.createExistingConfig(viewPath, viewConfig);

    const config = await context.configLoader.loadConfiguration();

    // Custom sections should be preserved
    expect(config.view.customSection).toBeDefined();
    expect(config.view.customSection.customKey).toBe('customValue');
    expect(config.view.customSection.nested.value).toBe(42);
  });

});