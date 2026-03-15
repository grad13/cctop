/**
 * Config Loader Core Tests
 * Tests for configuration loading and merging functionality
 * @created 2026-03-13
 * @checked -
 * @updated 2026-03-13
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigLoader } from '../../../src/config/config-loader';

describe('ConfigLoader - Core Functionality', () => {
  let configLoader: ConfigLoader;
  let testDir: string;
  let configPath: string;

  beforeEach(() => {
    configLoader = new ConfigLoader();
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cctop-config-test-'));
    configPath = path.join(testDir, '.cctop');
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  describe('loadConfiguration()', () => {
    it('should auto-initialize and load configuration', async () => {
      const config = await configLoader.loadConfiguration(testDir);

      // Check that configuration was loaded successfully
      expect(config.configPath).toBe(configPath);
      expect(config.shared.version).toBe('0.5.2.6');
      expect(config.daemon.daemon.autoStart).toBe(true);
      expect(config.view.display.maxEvents).toBe(20);

      // Check that .cctop directory was created
      expect(fs.existsSync(configPath)).toBe(true);
      expect(fs.existsSync(path.join(configPath, 'config'))).toBe(true);
    });

    it('should load existing configuration without reinitializing', async () => {
      // Pre-create shared config with custom values
      const sharedConfigDir = path.join(configPath, 'config');
      fs.mkdirSync(sharedConfigDir, { recursive: true });
      const sharedConfigPath = path.join(sharedConfigDir, 'shared-config.json');
      const customSharedConfig = { version: '0.5.2.6', projectName: 'CustomProject' };
      fs.writeFileSync(sharedConfigPath, JSON.stringify(customSharedConfig, null, 2));

      // Should load existing config
      const config = await configLoader.loadConfiguration(testDir);
      expect(config.shared.projectName).toBe('CustomProject');
    });

    it('should use defaults when config files are corrupted', async () => {
      // Create corrupted config file
      const corruptedDir = path.join(testDir, '.cctop', 'config');
      fs.mkdirSync(corruptedDir, { recursive: true });
      fs.writeFileSync(path.join(corruptedDir, 'view-config.json'), '{ invalid json');

      const config = await configLoader.loadConfiguration(testDir);

      // Should still load with defaults despite corrupted file
      expect(config).toBeDefined();
      expect(config.view.display.maxEvents).toBe(20); // Default value
    });

    it('should merge view config with defaults', async () => {
      // Create partial view config
      const configDir = path.join(testDir, '.cctop', 'config');
      fs.mkdirSync(configDir, { recursive: true });

      const partialConfig = {
        display: {
          maxEvents: 50, // Override default
          customSetting: 'test' // Add custom setting
        }
      };

      fs.writeFileSync(
        path.join(configDir, 'view-config.json'),
        JSON.stringify(partialConfig, null, 2)
      );

      const config = await configLoader.loadConfiguration(testDir);

      // Should merge with defaults
      expect(config.view.display.maxEvents).toBe(50); // Overridden value
      expect(config.view.display.customSetting).toBe('test'); // Custom setting
      expect(config.view.display.refreshRateMs).toBe(100); // Default value should still be present
    });

    it('should default to current working directory', async () => {
      // Change to test directory
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const config = await configLoader.loadConfiguration();
        // Normalize paths for comparison (handles /var vs /private/var on macOS)
        const normalizedConfigPath = fs.realpathSync(config.configPath);
        const expectedPath = fs.realpathSync(path.join(testDir, '.cctop'));
        expect(normalizedConfigPath).toBe(expectedPath);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should handle missing shared config gracefully', async () => {
      // Create only view config
      const configDir = path.join(testDir, '.cctop', 'config');
      fs.mkdirSync(configDir, { recursive: true });

      const viewConfig = {
        display: { maxEvents: 30 }
      };

      fs.writeFileSync(
        path.join(configDir, 'view-config.json'),
        JSON.stringify(viewConfig, null, 2)
      );

      const config = await configLoader.loadConfiguration(testDir);

      // Should use defaults for shared config
      expect(config.shared.version).toBe('0.5.2.6');
      expect(config.view.display.maxEvents).toBe(30);
    });


    it('should preserve deep nested configuration merging', async () => {
      // Create config with deep nesting
      const configDir = path.join(testDir, '.cctop', 'config');
      fs.mkdirSync(configDir, { recursive: true });

      const deepConfig = {
        display: {
          theme: {
            colors: {
              primary: '#ff0000',
              secondary: '#00ff00'
            }
          }
        }
      };

      fs.writeFileSync(
        path.join(configDir, 'view-config.json'),
        JSON.stringify(deepConfig, null, 2)
      );

      const config = await configLoader.loadConfiguration(testDir);

      // Deep nested properties should be preserved
      expect(config.view.display.theme.colors.primary).toBe('#ff0000');
      expect(config.view.display.theme.colors.secondary).toBe('#00ff00');
      // Other defaults should still be present
      expect(config.view.display.maxEvents).toBe(20);
    });
  });
});