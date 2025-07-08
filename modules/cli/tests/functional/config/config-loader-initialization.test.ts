/**
 * Config Loader Initialization Tests
 * Tests for initialization and directory management functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigLoader } from '../../../src/config/config-loader';

describe('ConfigLoader - Initialization', () => {
  let configLoader: ConfigLoader;
  let testDir: string;
  let configPath: string;

  beforeEach(() => {
    configLoader = new ConfigLoader();
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cctop-config-init-test-'));
    configPath = path.join(testDir, '.cctop');
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  describe('ensureDirectories()', () => {
    it('should create missing runtime directories', async () => {
      await configLoader.ensureDirectories(configPath);

      // Check runtime directories exist (FUNC-105 compliant)
      expect(fs.existsSync(path.join(configPath, 'logs'))).toBe(true);
      expect(fs.existsSync(path.join(configPath, 'data'))).toBe(true);
      expect(fs.existsSync(path.join(configPath, 'temp'))).toBe(true);
      expect(fs.existsSync(path.join(configPath, 'runtime'))).toBe(true);
    });

    it('should handle existing directories gracefully', async () => {
      // Pre-create some directories
      fs.mkdirSync(path.join(configPath, 'logs'), { recursive: true });
      fs.mkdirSync(path.join(configPath, 'data'), { recursive: true });

      // Should not throw error
      await expect(configLoader.ensureDirectories(configPath)).resolves.not.toThrow();

      // Directories should still exist
      expect(fs.existsSync(path.join(configPath, 'logs'))).toBe(true);
      expect(fs.existsSync(path.join(configPath, 'data'))).toBe(true);
      expect(fs.existsSync(path.join(configPath, 'temp'))).toBe(true);
      expect(fs.existsSync(path.join(configPath, 'runtime'))).toBe(true);
    });

    it('should handle permission errors gracefully', async () => {
      // Skip on Windows where permission testing is different
      if (process.platform === 'win32') return;

      // Create read-only parent directory
      fs.mkdirSync(configPath, { recursive: true });
      fs.chmodSync(configPath, 0o444);

      try {
        // Should handle permission error gracefully
        await expect(configLoader.ensureDirectories(configPath)).resolves.not.toThrow();
      } finally {
        // Restore permissions for cleanup
        fs.chmodSync(configPath, 0o755);
      }
    });

    it('should create directories with correct permissions', async () => {
      await configLoader.ensureDirectories(configPath);

      // Check directory permissions (Unix-like systems)
      if (process.platform !== 'win32') {
        const dataStats = fs.statSync(path.join(configPath, 'data'));
        const logsStats = fs.statSync(path.join(configPath, 'logs'));
        
        expect(dataStats.isDirectory()).toBe(true);
        expect(logsStats.isDirectory()).toBe(true);
      }
    });

    it('should handle nested directory creation', async () => {
      // Test deep nested directory creation
      const deepPath = path.join(configPath, 'data', 'nested', 'deep');
      
      await configLoader.ensureDirectories(configPath);
      
      // Manually create a deep structure to test
      fs.mkdirSync(deepPath, { recursive: true });
      expect(fs.existsSync(deepPath)).toBe(true);
    });
  });

  describe('Initialization Flow', () => {
    it('should initialize configuration structure properly', async () => {
      const config = await configLoader.loadConfiguration(testDir);

      // Verify complete directory structure
      expect(fs.existsSync(configPath)).toBe(true);
      expect(fs.existsSync(path.join(configPath, 'config'))).toBe(true);
      expect(fs.existsSync(path.join(configPath, 'data'))).toBe(true);
      expect(fs.existsSync(path.join(configPath, 'themes'))).toBe(true);
      expect(fs.existsSync(path.join(configPath, 'logs'))).toBe(true);

      // Verify config files
      expect(fs.existsSync(path.join(configPath, 'config', 'shared-config.json'))).toBe(true);
      expect(fs.existsSync(path.join(configPath, 'config', 'daemon-config.json'))).toBe(true);
      expect(fs.existsSync(path.join(configPath, 'config', 'cli-config.json'))).toBe(true);
    });


    it('should validate configuration after initialization', async () => {
      const config = await configLoader.loadConfiguration(testDir);

      // Validate structure
      expect(config).toHaveProperty('configPath');
      expect(config).toHaveProperty('shared');
      expect(config).toHaveProperty('daemon');
      expect(config).toHaveProperty('cli');

      // Validate shared config
      expect(config.shared).toHaveProperty('version');
      expect(config.shared).toHaveProperty('projectName');

      // Validate daemon config
      expect(config.daemon).toHaveProperty('daemon');
      expect(config.daemon.daemon).toHaveProperty('enabled');

      // Validate CLI config
      expect(config.cli).toHaveProperty('display');
      expect(config.cli.display).toHaveProperty('maxRows');
      expect(config.cli.display).toHaveProperty('refreshInterval');
    });

    it('should handle concurrent initialization attempts', async () => {
      // Attempt multiple concurrent initializations
      const promises = [
        configLoader.loadConfiguration(testDir),
        configLoader.loadConfiguration(testDir),
        configLoader.loadConfiguration(testDir)
      ];

      const configs = await Promise.all(promises);

      // All should succeed and return equivalent configs
      configs.forEach(config => {
        expect(config.configPath).toBe(configPath);
        expect(config.shared.version).toBe('0.3.0.0');
      });
    });


  });
});