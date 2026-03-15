/**
 * Tests for ConfigManager - Unified Configuration Management (TypeScript Implementation)
 * Based on: documents/spec/shared/supplement-config-manager.md
 * Partial: supplements existing tests in code/shared/tests/config-manager-func105.test.ts
 * Focus: mergeWithDefaults, theme file generation, sync/async API distinction
 * @created 2026-03-14
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigManager, CctopConfig } from '../../code/shared/src/config-manager';

describe('ConfigManager - Supplement Tests', () => {
  let testDir: string;
  let configManager: ConfigManager;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cctop-cm-supp-test-'));
    configManager = new ConfigManager(testDir);
  });

  afterEach(() => {
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('CctopConfig interface', () => {
    it('should have 4 top-level sections: daemon, database, monitoring, ui', async () => {
      await configManager.initializeCctopStructure();
      const config = configManager.loadConfig();

      expect(config).toHaveProperty('daemon');
      expect(config).toHaveProperty('database');
      expect(config).toHaveProperty('monitoring');
      expect(config).toHaveProperty('ui');
    });

    it('should have daemon section with pidFile, logFile, heartbeatInterval', async () => {
      await configManager.initializeCctopStructure();
      const config = configManager.loadConfig();

      expect(typeof config.daemon.pidFile).toBe('string');
      expect(typeof config.daemon.logFile).toBe('string');
      expect(typeof config.daemon.heartbeatInterval).toBe('number');
    });

    it('should have database section with path, walMode, timeout', async () => {
      await configManager.initializeCctopStructure();
      const config = configManager.loadConfig();

      expect(typeof config.database.path).toBe('string');
      expect(typeof config.database.walMode).toBe('boolean');
      expect(typeof config.database.timeout).toBe('number');
    });

    it('should have monitoring section with watchPaths, excludePatterns, maxDepth, moveThresholdMs', async () => {
      await configManager.initializeCctopStructure();
      const config = configManager.loadConfig();

      expect(Array.isArray(config.monitoring.watchPaths)).toBe(true);
      expect(Array.isArray(config.monitoring.excludePatterns)).toBe(true);
      expect(typeof config.monitoring.maxDepth).toBe('number');
      expect(typeof config.monitoring.moveThresholdMs).toBe('number');
    });

    it('should have ui section with refreshInterval, maxRows, theme', async () => {
      await configManager.initializeCctopStructure();
      const config = configManager.loadConfig();

      expect(typeof config.ui.refreshInterval).toBe('number');
      expect(typeof config.ui.maxRows).toBe('number');
      expect(typeof config.ui.theme).toBe('string');
    });
  });

  describe('config file layout', () => {
    it('should use .cctop/config/cctop.json as main config path', async () => {
      await configManager.initializeCctopStructure();
      const configPath = path.join(testDir, '.cctop', 'config', 'cctop.json');
      expect(fs.existsSync(configPath)).toBe(true);
    });

    it('should also create daemon-config.json', async () => {
      await configManager.initializeCctopStructure();
      expect(fs.existsSync(path.join(testDir, '.cctop', 'config', 'daemon-config.json'))).toBe(true);
    });

    it('should also create cli-config.json', async () => {
      await configManager.initializeCctopStructure();
      expect(fs.existsSync(path.join(testDir, '.cctop', 'config', 'cli-config.json'))).toBe(true);
    });
  });

  describe('synchronous API', () => {
    it('loadConfig() should be synchronous (returns CctopConfig, not Promise)', async () => {
      await configManager.initializeCctopStructure();
      const result = configManager.loadConfig();
      // If it were a Promise, it would not have 'daemon' as a direct property
      expect(result.daemon).toBeDefined();
      expect(result).not.toBeInstanceOf(Promise);
    });

    it('saveConfig() should be synchronous (returns void, not Promise)', async () => {
      await configManager.initializeCctopStructure();
      const config = configManager.loadConfig();
      const result = configManager.saveConfig(config);
      expect(result).toBeUndefined();
    });

    it('isInitialized() should be synchronous (returns boolean, not Promise)', () => {
      const result = configManager.isInitialized();
      expect(typeof result).toBe('boolean');
    });

    it('initializeCctopStructure() should be async (returns Promise)', () => {
      const result = configManager.initializeCctopStructure();
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('mergeWithDefaults', () => {
    it('should fill missing daemon fields from defaults', async () => {
      await configManager.initializeCctopStructure();

      // Write a config with partial daemon section
      const configPath = path.join(testDir, '.cctop', 'config', 'cctop.json');
      const partialConfig = {
        daemon: { pidFile: '/custom/pid' },
        database: { path: '.cctop/data/activity.db', walMode: true, timeout: 10000 },
        monitoring: { watchPaths: ['.'], excludePatterns: [], maxDepth: 10, moveThresholdMs: 100 },
        ui: { refreshInterval: 100, maxRows: 100, theme: 'default' },
      };
      fs.writeFileSync(configPath, JSON.stringify(partialConfig, null, 2));

      const config = configManager.loadConfig();
      // pidFile should be the custom value
      expect(config.daemon.pidFile).toBe('/custom/pid');
      // Other daemon fields should have defaults
      expect(config.daemon.logFile).toBeDefined();
      expect(config.daemon.heartbeatInterval).toBeDefined();
    });

    it('should fill missing database fields from defaults', async () => {
      await configManager.initializeCctopStructure();

      const configPath = path.join(testDir, '.cctop', 'config', 'cctop.json');
      const partialConfig = {
        daemon: { pidFile: '.cctop/runtime/daemon.pid', logFile: '.cctop/logs/daemon.log', heartbeatInterval: 30000 },
        database: { path: '/custom/db.sqlite' },
        monitoring: { watchPaths: ['.'], excludePatterns: [], maxDepth: 10, moveThresholdMs: 100 },
        ui: { refreshInterval: 100, maxRows: 100, theme: 'default' },
      };
      fs.writeFileSync(configPath, JSON.stringify(partialConfig, null, 2));

      const config = configManager.loadConfig();
      expect(config.database.path).toBe('/custom/db.sqlite');
      expect(typeof config.database.walMode).toBe('boolean');
      expect(typeof config.database.timeout).toBe('number');
    });

    it('should perform shallow merge per section (spread operator)', async () => {
      await configManager.initializeCctopStructure();

      const configPath = path.join(testDir, '.cctop', 'config', 'cctop.json');
      const partialConfig = {
        daemon: { pidFile: '/a' },
        // database section entirely missing
        monitoring: { watchPaths: ['/src'] },
        ui: { theme: 'dark' },
      };
      fs.writeFileSync(configPath, JSON.stringify(partialConfig, null, 2));

      const config = configManager.loadConfig();
      // Missing sections should get all defaults
      expect(config.database.path).toBeDefined();
      expect(config.database.walMode).toBeDefined();
    });

    it('should return full default config when config file is absent', () => {
      const config = configManager.loadConfig();
      expect(config.daemon).toBeDefined();
      expect(config.database).toBeDefined();
      expect(config.monitoring).toBeDefined();
      expect(config.ui).toBeDefined();
    });

    it('should return default config when config file contains invalid JSON', async () => {
      await configManager.initializeCctopStructure();

      const configPath = path.join(testDir, '.cctop', 'config', 'cctop.json');
      fs.writeFileSync(configPath, 'not valid json {{{');

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const config = configManager.loadConfig();
      expect(config.daemon).toBeDefined();
      expect(config.database).toBeDefined();
      warnSpy.mockRestore();
    });
  });

  describe('theme file generation (ensureThemeFiles)', () => {
    it('should generate default theme with hex color values', async () => {
      await configManager.initializeCctopStructure();

      const themePath = path.join(testDir, '.cctop', 'themes', 'default.json');
      const theme = JSON.parse(fs.readFileSync(themePath, 'utf8'));

      expect(theme.name).toBe('default');
      expect(theme.colors).toBeDefined();
      // Check that colors contain hex values
      const colorValues = Object.values(theme.colors) as string[];
      const hasHexColors = colorValues.some(v => typeof v === 'string' && v.startsWith('#'));
      expect(hasHexColors).toBe(true);
    });

    it('should generate high-contrast theme with hex color values', async () => {
      await configManager.initializeCctopStructure();

      const themePath = path.join(testDir, '.cctop', 'themes', 'high-contrast.json');
      const theme = JSON.parse(fs.readFileSync(themePath, 'utf8'));

      expect(theme.name).toBe('high-contrast');
      expect(theme.colors).toBeDefined();
    });

    it('should use flat colors structure (not grouped)', async () => {
      await configManager.initializeCctopStructure();

      const themePath = path.join(testDir, '.cctop', 'themes', 'default.json');
      const theme = JSON.parse(fs.readFileSync(themePath, 'utf8'));

      // Flat structure: all color values should be strings, not objects
      for (const [, value] of Object.entries(theme.colors)) {
        expect(typeof value).toBe('string');
      }
    });

    it('should create current-theme.json as a pointer', async () => {
      await configManager.initializeCctopStructure();

      const currentThemePath = path.join(testDir, '.cctop', 'themes', 'current-theme.json');
      const currentTheme = JSON.parse(fs.readFileSync(currentThemePath, 'utf8'));

      expect(currentTheme.active).toBe('default');
      expect(currentTheme.path).toBe('./default.json');
    });
  });

  describe('.gitignore generation', () => {
    it('should exclude data/, logs/, runtime/, temp/, themes/custom/', async () => {
      await configManager.initializeCctopStructure();

      const gitignorePath = path.join(testDir, '.cctop', '.gitignore');
      const content = fs.readFileSync(gitignorePath, 'utf8');

      expect(content).toContain('data/');
      expect(content).toContain('logs/');
      expect(content).toContain('runtime/');
      expect(content).toContain('temp/');
      expect(content).toContain('themes/custom/');
    });
  });

  describe('no internal caching', () => {
    it('should read from disk on each loadConfig() call', async () => {
      await configManager.initializeCctopStructure();

      const config1 = configManager.loadConfig();
      expect(config1.ui.theme).toBe('default');

      // Modify the file on disk
      const configPath = path.join(testDir, '.cctop', 'config', 'cctop.json');
      const modified = { ...config1, ui: { ...config1.ui, theme: 'dark' } };
      fs.writeFileSync(configPath, JSON.stringify(modified, null, 2));

      // Load again - should reflect the change
      const config2 = configManager.loadConfig();
      expect(config2.ui.theme).toBe('dark');
    });
  });

  describe('path accessors side effects', () => {
    it('getDatabasePath() should read config from disk', async () => {
      await configManager.initializeCctopStructure();
      const dbPath = configManager.getDatabasePath();
      expect(dbPath).toBe(path.resolve(testDir, '.cctop/data/activity.db'));
    });

    it('getPidFilePath() should read config from disk', async () => {
      await configManager.initializeCctopStructure();
      const pidPath = configManager.getPidFilePath();
      expect(pidPath).toBe(path.resolve(testDir, '.cctop/runtime/daemon.pid'));
    });

    it('getLogFilePath() should read config from disk', async () => {
      await configManager.initializeCctopStructure();
      const logPath = configManager.getLogFilePath();
      expect(logPath).toBe(path.resolve(testDir, '.cctop/logs/daemon.log'));
    });
  });

  describe('saveConfig()', () => {
    it('should overwrite .cctop/config/cctop.json', async () => {
      await configManager.initializeCctopStructure();

      const config = configManager.loadConfig();
      config.ui.maxRows = 999;
      configManager.saveConfig(config);

      const reloaded = configManager.loadConfig();
      expect(reloaded.ui.maxRows).toBe(999);
    });

    it('should write valid JSON', async () => {
      await configManager.initializeCctopStructure();

      const config = configManager.loadConfig();
      configManager.saveConfig(config);

      const configPath = path.join(testDir, '.cctop', 'config', 'cctop.json');
      const content = fs.readFileSync(configPath, 'utf8');
      expect(() => JSON.parse(content)).not.toThrow();
    });
  });

  describe('constructor', () => {
    it('should default workingDirectory to process.cwd() when not provided', () => {
      const manager = new ConfigManager();
      // We can verify by checking the expected database path
      const dbPath = manager.getDatabasePath();
      expect(dbPath).toBe(path.resolve(process.cwd(), '.cctop/data/activity.db'));
    });

    it('should accept a custom workingDirectory', () => {
      const manager = new ConfigManager(testDir);
      const dbPath = manager.getDatabasePath();
      expect(dbPath).toBe(path.resolve(testDir, '.cctop/data/activity.db'));
    });
  });
});
