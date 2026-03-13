/**
 * Local Setup Initializer Core Tests
 * Tests for basic initialization functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LocalSetupInitializer } from '../../../src/config/local-setup-initializer';

describe('LocalSetupInitializer - Core', () => {
  let initializer: LocalSetupInitializer;
  let testDir: string;
  let configPath: string;

  beforeEach(() => {
    initializer = new LocalSetupInitializer();
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cctop-test-'));
    configPath = path.join(testDir, '.cctop');
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('initialize()', () => {
    it('should create .cctop directory structure', async () => {
      // Change to test directory
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const result = await initializer.initialize();

        expect(result.success).toBe(true);
        expect(fs.existsSync('.cctop')).toBe(true);
        expect(fs.existsSync('.cctop/config')).toBe(true);
        expect(fs.existsSync('.cctop/data')).toBe(true);
        expect(fs.existsSync('.cctop/themes')).toBe(true);
        expect(fs.existsSync('.cctop/logs')).toBe(true);
        expect(fs.existsSync('.cctop/cache')).toBe(true);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should create required configuration files', async () => {
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        await initializer.initialize();

        // Check config files exist
        expect(fs.existsSync('.cctop/config/shared-config.json')).toBe(true);
        expect(fs.existsSync('.cctop/config/daemon-config.json')).toBe(true);
        expect(fs.existsSync('.cctop/config/cli-config.json')).toBe(true);
        
        // Check .gitignore
        expect(fs.existsSync('.cctop/.gitignore')).toBe(true);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should create valid JSON configuration files', async () => {
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        await initializer.initialize();

        // Test parsing config files
        const sharedConfig = JSON.parse(fs.readFileSync('.cctop/config/shared-config.json', 'utf8'));
        const daemonConfig = JSON.parse(fs.readFileSync('.cctop/config/daemon-config.json', 'utf8'));
        const cliConfig = JSON.parse(fs.readFileSync('.cctop/config/cli-config.json', 'utf8'));

        // Validate structure
        expect(sharedConfig).toHaveProperty('version');
        expect(sharedConfig).toHaveProperty('projectName');
        expect(daemonConfig).toHaveProperty('daemon');
        expect(cliConfig).toHaveProperty('display');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should create valid theme files', async () => {
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        await initializer.initialize();

        // Check theme files
        expect(fs.existsSync('.cctop/themes/current-theme.json')).toBe(true);
        expect(fs.existsSync('.cctop/themes/default.json')).toBe(true);

        // Validate theme file content
        const currentTheme = JSON.parse(fs.readFileSync('.cctop/themes/current-theme.json', 'utf8'));
        const defaultTheme = JSON.parse(fs.readFileSync('.cctop/themes/default.json', 'utf8'));

        expect(currentTheme).toHaveProperty('name');
        expect(defaultTheme).toHaveProperty('name');
        expect(defaultTheme).toHaveProperty('colors');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should create .gitignore with correct content', async () => {
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        await initializer.initialize();

        const gitignoreContent = fs.readFileSync('.cctop/.gitignore', 'utf8');
        
        // Should contain common ignore patterns
        expect(gitignoreContent).toContain('logs/');
        expect(gitignoreContent).toContain('cache/');
        expect(gitignoreContent).toContain('temp/');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should not overwrite existing configuration', async () => {
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        // First initialization
        await initializer.initialize();
        
        // Modify a config file
        const configFile = '.cctop/config/cli-config.json';
        const originalConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        originalConfig.testProperty = 'preserved';
        fs.writeFileSync(configFile, JSON.stringify(originalConfig, null, 2));

        // Second initialization
        await initializer.initialize();
        
        // Check that modification is preserved
        const modifiedConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        expect(modifiedConfig.testProperty).toBe('preserved');
      } finally {
        process.chdir(originalCwd);
      }
    });

  });
});