/**
 * Config Loader Core Tests
 * Tests for configuration loading and merging functionality
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
      expect(config.shared.version).toBe('0.3.0.0');
      expect(config.daemon.daemon.enabled).toBe(true);
      expect(config.cli.display.maxRows).toBe(20);

      // Check that .cctop directory was created
      expect(fs.existsSync(configPath)).toBe(true);
      expect(fs.existsSync(path.join(configPath, 'config'))).toBe(true);
    });

    it('should load existing configuration without reinitializing', async () => {
      // Pre-create configuration with custom values
      await configLoader.loadConfiguration(testDir); // First call creates config

      // Modify shared config
      const sharedConfigPath = path.join(configPath, 'config', 'shared-config.json');
      const existingSharedConfig = JSON.parse(fs.readFileSync(sharedConfigPath, 'utf8'));
      existingSharedConfig.projectName = 'CustomProject';
      fs.writeFileSync(sharedConfigPath, JSON.stringify(existingSharedConfig, null, 2));

      // Second call should load existing config
      const config = await configLoader.loadConfiguration(testDir);
      expect(config.shared.projectName).toBe('CustomProject');
    });

    it('should use defaults when config files are corrupted', async () => {
      // Create corrupted config file
      const corruptedDir = path.join(testDir, '.cctop', 'config');
      fs.mkdirSync(corruptedDir, { recursive: true });
      fs.writeFileSync(path.join(corruptedDir, 'cli-config.json'), '{ invalid json');

      const config = await configLoader.loadConfiguration(testDir);

      // Should still load with defaults despite corrupted file
      expect(config).toBeDefined();
      expect(config.cli.display.maxRows).toBe(20); // Default value
    });

    it('should merge CLI config with defaults', async () => {
      // Create partial CLI config
      const cliConfigDir = path.join(testDir, '.cctop', 'config');
      fs.mkdirSync(cliConfigDir, { recursive: true });
      
      const partialConfig = {
        display: {
          maxRows: 50, // Override default
          customSetting: 'test' // Add custom setting
        }
      };
      
      fs.writeFileSync(
        path.join(cliConfigDir, 'cli-config.json'),
        JSON.stringify(partialConfig, null, 2)
      );

      const config = await configLoader.loadConfiguration(testDir);

      // Should merge with defaults
      expect(config.cli.display.maxRows).toBe(50); // Overridden value
      expect(config.cli.display.customSetting).toBe('test'); // Custom setting
      expect(config.cli.display.refreshInterval).toBe(100); // Default value should still be present
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
      // Create only CLI config
      const configDir = path.join(testDir, '.cctop', 'config');
      fs.mkdirSync(configDir, { recursive: true });
      
      const cliConfig = {
        display: { maxRows: 30 }
      };
      
      fs.writeFileSync(
        path.join(configDir, 'cli-config.json'),
        JSON.stringify(cliConfig, null, 2)
      );

      const config = await configLoader.loadConfiguration(testDir);

      // Should use defaults for shared config
      expect(config.shared.version).toBe('0.3.0.0');
      expect(config.cli.display.maxRows).toBe(30);
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
        path.join(configDir, 'cli-config.json'),
        JSON.stringify(deepConfig, null, 2)
      );

      const config = await configLoader.loadConfiguration(testDir);

      // Deep nested properties should be preserved
      expect(config.cli.display.theme.colors.primary).toBe('#ff0000');
      expect(config.cli.display.theme.colors.secondary).toBe('#00ff00');
      // Other defaults should still be present
      expect(config.cli.display.maxRows).toBe(20);
    });
  });
});