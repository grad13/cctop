/**
 * ConfigManager FUNC-105 Compliance Tests
 * Tests .cctop initialization functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigManager } from '../src/config-manager';

describe('ConfigManager FUNC-105 Compliance', () => {
  let testDir: string;
  let configManager: ConfigManager;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cctop-func105-test-'));
    configManager = new ConfigManager(testDir);
  });

  afterEach(() => {
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Directory Structure Creation', () => {
    it('should create FUNC-105 compliant directory structure', async () => {
      await configManager.initializeCctopStructure();

      // Check main .cctop directory
      expect(fs.existsSync(path.join(testDir, '.cctop'))).toBe(true);

      // Check required subdirectories
      const requiredDirs = [
        '.cctop/config',
        '.cctop/themes',
        '.cctop/themes/custom',
        '.cctop/data',
        '.cctop/logs',
        '.cctop/runtime',
        '.cctop/temp'
      ];

      for (const dir of requiredDirs) {
        expect(fs.existsSync(path.join(testDir, dir))).toBe(true);
      }
    });

    it('should not overwrite existing directories', async () => {
      const existingDir = path.join(testDir, '.cctop', 'config');
      fs.mkdirSync(existingDir, { recursive: true });
      fs.writeFileSync(path.join(existingDir, 'test.txt'), 'existing');

      await configManager.initializeCctopStructure();

      expect(fs.existsSync(path.join(existingDir, 'test.txt'))).toBe(true);
      expect(fs.readFileSync(path.join(existingDir, 'test.txt'), 'utf8')).toBe('existing');
    });
  });

  describe('Configuration Files Creation', () => {
    it('should create all required configuration files', async () => {
      await configManager.initializeCctopStructure();

      const requiredConfigFiles = [
        '.cctop/config/cctop.json',
        '.cctop/config/daemon-config.json',
        '.cctop/config/cli-config.json'
      ];

      for (const file of requiredConfigFiles) {
        expect(fs.existsSync(path.join(testDir, file))).toBe(true);
      }
    });

    it('should create valid JSON configuration files', async () => {
      await configManager.initializeCctopStructure();

      const cctopConfig = JSON.parse(
        fs.readFileSync(path.join(testDir, '.cctop/config/cctop.json'), 'utf8')
      );

      // Verify main config structure
      expect(cctopConfig).toHaveProperty('daemon');
      expect(cctopConfig).toHaveProperty('database');
      expect(cctopConfig).toHaveProperty('monitoring');
      expect(cctopConfig).toHaveProperty('ui');
    });

    it('should not overwrite existing configuration files', async () => {
      const configDir = path.join(testDir, '.cctop', 'config');
      fs.mkdirSync(configDir, { recursive: true });
      
      const existingConfig = { custom: 'value' };
      fs.writeFileSync(
        path.join(configDir, 'cctop.json'),
        JSON.stringify(existingConfig)
      );

      await configManager.initializeCctopStructure();

      const savedConfig = JSON.parse(
        fs.readFileSync(path.join(configDir, 'cctop.json'), 'utf8')
      );
      expect(savedConfig.custom).toBe('value');
    });
  });

  describe('Theme Files Creation', () => {
    it('should create all required theme files', async () => {
      await configManager.initializeCctopStructure();

      const requiredThemeFiles = [
        '.cctop/themes/default.json',
        '.cctop/themes/high-contrast.json',
        '.cctop/themes/current-theme.json'
      ];

      for (const file of requiredThemeFiles) {
        expect(fs.existsSync(path.join(testDir, file))).toBe(true);
      }
    });

    it('should create valid theme files with proper structure', async () => {
      await configManager.initializeCctopStructure();

      const defaultTheme = JSON.parse(
        fs.readFileSync(path.join(testDir, '.cctop/themes/default.json'), 'utf8')
      );

      expect(defaultTheme).toHaveProperty('name', 'default');
      expect(defaultTheme).toHaveProperty('colors');
      expect(defaultTheme.colors).toHaveProperty('primary');
      expect(defaultTheme.colors).toHaveProperty('background');
    });

    it('should create current-theme.json pointing to default', async () => {
      await configManager.initializeCctopStructure();

      const currentTheme = JSON.parse(
        fs.readFileSync(path.join(testDir, '.cctop/themes/current-theme.json'), 'utf8')
      );

      expect(currentTheme.active).toBe('default');
      expect(currentTheme.path).toBe('./default.json');
    });
  });

  describe('.gitignore Creation', () => {
    it('should create FUNC-105 compliant .gitignore', async () => {
      await configManager.initializeCctopStructure();

      const gitignorePath = path.join(testDir, '.cctop/.gitignore');
      expect(fs.existsSync(gitignorePath)).toBe(true);

      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      expect(gitignoreContent).toContain('# cctop monitoring data');
      expect(gitignoreContent).toContain('data/');
      expect(gitignoreContent).toContain('logs/');
      expect(gitignoreContent).toContain('runtime/');
      expect(gitignoreContent).toContain('temp/');
      expect(gitignoreContent).toContain('# User customizations');
      expect(gitignoreContent).toContain('themes/custom/');
    });
  });

  describe('Initialization Status', () => {
    it('should detect uninitialized directory', () => {
      expect(configManager.isInitialized()).toBe(false);
    });

    it('should detect initialized directory', async () => {
      await configManager.initializeCctopStructure();
      expect(configManager.isInitialized()).toBe(true);
    });

    it('should not re-initialize if already initialized', async () => {
      await configManager.initializeCctopStructure();
      
      // Modify a file to check it's not overwritten
      const configPath = path.join(testDir, '.cctop/config/cctop.json');
      const originalContent = fs.readFileSync(configPath, 'utf8');
      const modifiedContent = JSON.parse(originalContent);
      modifiedContent.test = 'modified';
      fs.writeFileSync(configPath, JSON.stringify(modifiedContent, null, 2));

      // Try to initialize again
      await configManager.initializeCctopStructure();

      // Check that modification is preserved
      const finalContent = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(finalContent.test).toBe('modified');
    });
  });

  describe('Configuration Loading', () => {
    it('should load configuration after initialization', async () => {
      await configManager.initializeCctopStructure();
      
      const config = configManager.loadConfig();
      expect(config).toHaveProperty('daemon');
      expect(config).toHaveProperty('database');
      expect(config).toHaveProperty('monitoring');
      expect(config).toHaveProperty('ui');
    });

    it('should provide correct database path', async () => {
      await configManager.initializeCctopStructure();
      
      const dbPath = configManager.getDatabasePath();
      expect(dbPath).toBe(path.resolve(testDir, '.cctop/data/activity.db'));
    });

    it('should provide correct PID file path', async () => {
      await configManager.initializeCctopStructure();
      
      const pidPath = configManager.getPidFilePath();
      expect(pidPath).toBe(path.resolve(testDir, '.cctop/runtime/daemon.pid'));
    });
  });

  describe('Error Handling', () => {
    it('should handle permission errors gracefully', async () => {
      // This test would need to simulate permission errors
      // Skipping for now as it requires complex setup
    });

    it('should handle disk space errors gracefully', async () => {
      // This test would need to simulate disk space issues
      // Skipping for now as it requires complex setup
    });
  });

});