/**
 * Tests for Local Setup Initialization
 * Based on: documents/spec/shared/local-setup-initialization.md
 * Partial: supplements existing tests in code/shared/tests/config-manager-func105.test.ts
 * Focus: LocalSetupInitializer and DirectoryStructureCreator independent unit tests
 * @created 2026-03-14
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LocalSetupInitializer, SetupResult, LocalSetupConfig } from '../../code/shared/src/config/LocalSetupInitializer';

describe('Local Setup Initialization - LocalSetupInitializer', () => {
  let testDir: string;
  let initializer: LocalSetupInitializer;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cctop-setup-test-'));
    initializer = new LocalSetupInitializer();
  });

  afterEach(() => {
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('initialize() - first-run setup', () => {
    it('should create .cctop directory structure', async () => {
      const result = await initializer.initialize({ targetDirectory: testDir });

      expect(result.success).toBe(true);
      expect(result.created).toBe(true);
      expect(fs.existsSync(path.join(testDir, '.cctop'))).toBe(true);
    });

    it('should return SetupResult with configPath', async () => {
      const result = await initializer.initialize({ targetDirectory: testDir });

      expect(result.configPath).toBe(path.join(testDir, '.cctop'));
    });

    it('should create all required subdirectories', async () => {
      await initializer.initialize({ targetDirectory: testDir });

      const requiredDirs = ['config', 'themes', 'themes/custom', 'data', 'logs', 'runtime', 'temp'];
      for (const dir of requiredDirs) {
        expect(fs.existsSync(path.join(testDir, '.cctop', dir))).toBe(true);
      }
    });

    it('should create cache directory (supplement to spec)', async () => {
      await initializer.initialize({ targetDirectory: testDir });
      expect(fs.existsSync(path.join(testDir, '.cctop', 'cache'))).toBe(true);
    });
  });

  describe('config file generation', () => {
    it('should create shared-config.json', async () => {
      await initializer.initialize({ targetDirectory: testDir });
      expect(fs.existsSync(path.join(testDir, '.cctop', 'config', 'shared-config.json'))).toBe(true);
    });

    it('should create daemon-config.json', async () => {
      await initializer.initialize({ targetDirectory: testDir });
      expect(fs.existsSync(path.join(testDir, '.cctop', 'config', 'daemon-config.json'))).toBe(true);
    });

    it('should create cli-config.json', async () => {
      await initializer.initialize({ targetDirectory: testDir });
      expect(fs.existsSync(path.join(testDir, '.cctop', 'config', 'cli-config.json'))).toBe(true);
    });

    it('should create valid JSON in shared-config.json', async () => {
      await initializer.initialize({ targetDirectory: testDir });
      const content = fs.readFileSync(path.join(testDir, '.cctop', 'config', 'shared-config.json'), 'utf8');
      const config = JSON.parse(content);
      expect(config).toHaveProperty('version');
      expect(config).toHaveProperty('project');
      expect(config).toHaveProperty('database');
    });

    it('should create valid JSON in daemon-config.json', async () => {
      await initializer.initialize({ targetDirectory: testDir });
      const content = fs.readFileSync(path.join(testDir, '.cctop', 'config', 'daemon-config.json'), 'utf8');
      const config = JSON.parse(content);
      expect(config).toHaveProperty('version');
      expect(config).toHaveProperty('monitoring');
      expect(config).toHaveProperty('daemon');
      expect(config).toHaveProperty('database');
    });

    it('should create valid JSON in cli-config.json', async () => {
      await initializer.initialize({ targetDirectory: testDir });
      const content = fs.readFileSync(path.join(testDir, '.cctop', 'config', 'cli-config.json'), 'utf8');
      const config = JSON.parse(content);
      expect(config).toHaveProperty('version');
      expect(config).toHaveProperty('display');
      expect(config).toHaveProperty('interaction');
      expect(config).toHaveProperty('colors');
    });
  });

  describe('theme initialization', () => {
    it('should create default.json theme', async () => {
      await initializer.initialize({ targetDirectory: testDir });
      expect(fs.existsSync(path.join(testDir, '.cctop', 'themes', 'default.json'))).toBe(true);
    });

    it('should create high-contrast.json theme', async () => {
      await initializer.initialize({ targetDirectory: testDir });
      expect(fs.existsSync(path.join(testDir, '.cctop', 'themes', 'high-contrast.json'))).toBe(true);
    });

    it('should create current-theme.json', async () => {
      await initializer.initialize({ targetDirectory: testDir });
      expect(fs.existsSync(path.join(testDir, '.cctop', 'themes', 'current-theme.json'))).toBe(true);
    });

    it('should have valid JSON in theme files', async () => {
      await initializer.initialize({ targetDirectory: testDir });
      const defaultTheme = JSON.parse(
        fs.readFileSync(path.join(testDir, '.cctop', 'themes', 'default.json'), 'utf8')
      );
      expect(defaultTheme).toHaveProperty('name', 'default');
      expect(defaultTheme).toHaveProperty('colors');
    });
  });

  describe('.gitignore generation', () => {
    it('should create .gitignore file', async () => {
      await initializer.initialize({ targetDirectory: testDir });
      expect(fs.existsSync(path.join(testDir, '.cctop', '.gitignore'))).toBe(true);
    });

    it('should exclude data/ in .gitignore', async () => {
      await initializer.initialize({ targetDirectory: testDir });
      const content = fs.readFileSync(path.join(testDir, '.cctop', '.gitignore'), 'utf8');
      expect(content).toContain('data/');
    });

    it('should exclude logs/ in .gitignore', async () => {
      await initializer.initialize({ targetDirectory: testDir });
      const content = fs.readFileSync(path.join(testDir, '.cctop', '.gitignore'), 'utf8');
      expect(content).toContain('logs/');
    });

    it('should exclude runtime/ in .gitignore', async () => {
      await initializer.initialize({ targetDirectory: testDir });
      const content = fs.readFileSync(path.join(testDir, '.cctop', '.gitignore'), 'utf8');
      expect(content).toContain('runtime/');
    });

    it('should exclude temp/ in .gitignore', async () => {
      await initializer.initialize({ targetDirectory: testDir });
      const content = fs.readFileSync(path.join(testDir, '.cctop', '.gitignore'), 'utf8');
      expect(content).toContain('temp/');
    });

    it('should exclude themes/custom/ in .gitignore', async () => {
      await initializer.initialize({ targetDirectory: testDir });
      const content = fs.readFileSync(path.join(testDir, '.cctop', '.gitignore'), 'utf8');
      expect(content).toContain('themes/custom/');
    });
  });

  describe('re-run protection', () => {
    it('should detect already initialized directory', async () => {
      await initializer.initialize({ targetDirectory: testDir });
      const result = await initializer.initialize({ targetDirectory: testDir });

      expect(result.success).toBe(true);
      expect(result.created).toBe(false);
      expect(result.message).toContain('already exists');
    });

    it('should not overwrite existing config files', async () => {
      await initializer.initialize({ targetDirectory: testDir });

      // Modify a config file
      const configFile = path.join(testDir, '.cctop', 'config', 'shared-config.json');
      const original = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      original.customField = 'user-value';
      fs.writeFileSync(configFile, JSON.stringify(original, null, 2));

      // Re-initialize
      await initializer.initialize({ targetDirectory: testDir });

      // User modification should be preserved
      const reloaded = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      expect(reloaded.customField).toBe('user-value');
    });
  });

  describe('dry-run mode', () => {
    it('should not create any files or directories in dry-run mode', async () => {
      const result = await initializer.initialize({ targetDirectory: testDir, dryRun: true });

      expect(result.success).toBe(true);
      expect(result.created).toBe(false);
      expect(fs.existsSync(path.join(testDir, '.cctop'))).toBe(false);
    });

    it('should return a message describing what would be created', async () => {
      const result = await initializer.initialize({ targetDirectory: testDir, dryRun: true });

      expect(result.message).toContain('Would create');
    });
  });

  describe('isInitialized()', () => {
    it('should return false for non-initialized directory', () => {
      expect(initializer.isInitialized(testDir)).toBe(false);
    });

    it('should return true after successful initialization', async () => {
      await initializer.initialize({ targetDirectory: testDir });
      expect(initializer.isInitialized(testDir)).toBe(true);
    });

    it('should return false if .cctop exists but config files are missing', () => {
      fs.mkdirSync(path.join(testDir, '.cctop', 'config'), { recursive: true });
      expect(initializer.isInitialized(testDir)).toBe(false);
    });

    it('should require all 3 config files to be present', () => {
      const configDir = path.join(testDir, '.cctop', 'config');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(path.join(configDir, 'shared-config.json'), '{}');
      // Missing daemon-config.json and cli-config.json
      expect(initializer.isInitialized(testDir)).toBe(false);
    });
  });

  describe('first-run success message', () => {
    it('should include config path in success message', async () => {
      const result = await initializer.initialize({ targetDirectory: testDir });
      expect(result.message).toContain(path.join(testDir, '.cctop'));
    });

    it('should mention shared-config.json in success message', async () => {
      const result = await initializer.initialize({ targetDirectory: testDir });
      expect(result.message).toContain('shared-config.json');
    });

    it('should mention daemon-config.json in success message', async () => {
      const result = await initializer.initialize({ targetDirectory: testDir });
      expect(result.message).toContain('daemon-config.json');
    });

    it('should mention cli-config.json in success message', async () => {
      const result = await initializer.initialize({ targetDirectory: testDir });
      expect(result.message).toContain('cli-config.json');
    });

    it('should mention current-theme.json in success message', async () => {
      const result = await initializer.initialize({ targetDirectory: testDir });
      expect(result.message).toContain('current-theme.json');
    });
  });

  describe('error handling', () => {
    it('should throw an error with descriptive message on failure', async () => {
      // Use a path that cannot be created (e.g., inside a file)
      const blockingFile = path.join(testDir, 'blocker');
      fs.writeFileSync(blockingFile, 'not a directory');

      await expect(
        initializer.initialize({ targetDirectory: path.join(blockingFile, 'nested') })
      ).rejects.toThrow('Failed to initialize configuration');
    });
  });

  describe('file permissions', () => {
    it('should create config files with mode 0o644', async () => {
      await initializer.initialize({ targetDirectory: testDir });

      const configFile = path.join(testDir, '.cctop', 'config', 'shared-config.json');
      const stats = fs.statSync(configFile);
      const mode = stats.mode & 0o777;
      expect(mode).toBe(0o644);
    });
  });
});
