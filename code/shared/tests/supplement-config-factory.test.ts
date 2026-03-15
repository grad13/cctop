/**
 * Tests for ConfigFactory - Configuration Schema Generation
 * Based on: documents/spec/shared/supplement-config-factory.md
 * @created 2026-03-14
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigFactory } from '../../code/shared/src/config/ConfigFactory';

describe('ConfigFactory - Configuration Schema Generation', () => {
  let factory: ConfigFactory;

  beforeEach(() => {
    factory = new ConfigFactory();
  });

  describe('createSharedConfig()', () => {
    it('should return a plain object', () => {
      const config = factory.createSharedConfig();
      expect(typeof config).toBe('object');
      expect(config).not.toBeNull();
    });

    it('should embed version "0.5.2.6"', () => {
      const config = factory.createSharedConfig() as Record<string, unknown>;
      expect(config.version).toBe('0.5.2.6');
    });

    it('should derive project.name from path.basename(process.cwd())', () => {
      const config = factory.createSharedConfig() as { project: { name: string } };
      const path = require('path');
      expect(config.project.name).toBe(path.basename(process.cwd()));
    });

    it('should have project.description', () => {
      const config = factory.createSharedConfig() as { project: { description: string } };
      expect(typeof config.project.description).toBe('string');
      expect(config.project.description.length).toBeGreaterThan(0);
    });

    it('should have database.maxSize of 100MB (104857600)', () => {
      const config = factory.createSharedConfig() as { database: { maxSize: number } };
      expect(config.database.maxSize).toBe(104857600);
    });

    it('should have database.path', () => {
      const config = factory.createSharedConfig() as { database: { path: string } };
      expect(config.database.path).toBe('.cctop/data/activity.db');
    });

    it('should have directories with all 6 required paths', () => {
      const config = factory.createSharedConfig() as { directories: Record<string, string> };
      expect(config.directories.config).toBeDefined();
      expect(config.directories.themes).toBeDefined();
      expect(config.directories.data).toBeDefined();
      expect(config.directories.logs).toBeDefined();
      expect(config.directories.runtime).toBeDefined();
      expect(config.directories.temp).toBeDefined();
    });

    it('should have logging with maxFileSize 10MB, maxFiles 5, datePattern YYYY-MM-DD', () => {
      const config = factory.createSharedConfig() as { logging: { maxFileSize: number; maxFiles: number; datePattern: string } };
      expect(config.logging.maxFileSize).toBe(10485760);
      expect(config.logging.maxFiles).toBe(5);
      expect(config.logging.datePattern).toBe('YYYY-MM-DD');
    });
  });

  describe('createDaemonConfig()', () => {
    it('should return a plain object', () => {
      const config = factory.createDaemonConfig();
      expect(typeof config).toBe('object');
    });

    it('should embed version "0.5.2.6"', () => {
      const config = factory.createDaemonConfig() as Record<string, unknown>;
      expect(config.version).toBe('0.5.2.6');
    });

    it('should have monitoring.debounceMs of 100', () => {
      const config = factory.createDaemonConfig() as { monitoring: { debounceMs: number } };
      expect(config.monitoring.debounceMs).toBe(100);
    });

    it('should have monitoring.moveThresholdMs of 100', () => {
      const config = factory.createDaemonConfig() as { monitoring: { moveThresholdMs: number } };
      expect(config.monitoring.moveThresholdMs).toBe(100);
    });

    it('should have monitoring.systemLimits.requiredLimit of 524288', () => {
      const config = factory.createDaemonConfig() as { monitoring: { systemLimits: { requiredLimit: number } } };
      expect(config.monitoring.systemLimits.requiredLimit).toBe(524288);
    });

    it('should have daemon.heartbeatInterval of 30000', () => {
      const config = factory.createDaemonConfig() as { daemon: { heartbeatInterval: number } };
      expect(config.daemon.heartbeatInterval).toBe(30000);
    });

    it('should have daemon.maxRestarts of 3', () => {
      const config = factory.createDaemonConfig() as { daemon: { maxRestarts: number } };
      expect(config.daemon.maxRestarts).toBe(3);
    });

    it('should have daemon.restartDelay of 5000', () => {
      const config = factory.createDaemonConfig() as { daemon: { restartDelay: number } };
      expect(config.daemon.restartDelay).toBe(5000);
    });

    it('should have database.writeMode WAL', () => {
      const config = factory.createDaemonConfig() as { database: { writeMode: string } };
      expect(config.database.writeMode).toBe('WAL');
    });

    it('should have database.syncMode NORMAL', () => {
      const config = factory.createDaemonConfig() as { database: { syncMode: string } };
      expect(config.database.syncMode).toBe('NORMAL');
    });

    it('should have database.cacheSize of 65536', () => {
      const config = factory.createDaemonConfig() as { database: { cacheSize: number } };
      expect(config.database.cacheSize).toBe(65536);
    });

    it('should have database.busyTimeout of 5000', () => {
      const config = factory.createDaemonConfig() as { database: { busyTimeout: number } };
      expect(config.database.busyTimeout).toBe(5000);
    });

    it('should have database.checkpointInterval of 300000 (5 min)', () => {
      const config = factory.createDaemonConfig() as { database: { checkpointInterval: number } };
      expect(config.database.checkpointInterval).toBe(300000);
    });
  });

  describe('createCliConfig()', () => {
    it('should return a plain object', () => {
      const config = factory.createCliConfig();
      expect(typeof config).toBe('object');
    });

    it('should embed version "0.5.2.6"', () => {
      const config = factory.createCliConfig() as Record<string, unknown>;
      expect(config.version).toBe('0.5.2.6');
    });

    it('should have 8-column layout in display.columns', () => {
      const config = factory.createCliConfig() as { display: { columns: Record<string, unknown> } };
      const columnNames = ['timestamp', 'elapsed', 'fileName', 'event', 'lines', 'blocks', 'size', 'directory'];
      for (const name of columnNames) {
        expect(config.display.columns).toHaveProperty(name);
      }
    });

    it('should have directory.width of -1 (auto-fill)', () => {
      const config = factory.createCliConfig() as { display: { columns: { directory: { width: number } } } };
      expect(config.display.columns.directory.width).toBe(-1);
    });

    it('should have empty directoryMutePaths array', () => {
      const config = factory.createCliConfig() as { display: { directoryMutePaths: string[] } };
      expect(config.display.directoryMutePaths).toEqual([]);
    });

    it('should have interaction settings with mouse and keyboard enabled, scrollSpeed 3', () => {
      const config = factory.createCliConfig() as { interaction: { enableMouse: boolean; enableKeyboard: boolean; scrollSpeed: number } };
      expect(config.interaction.enableMouse).toBe(true);
      expect(config.interaction.enableKeyboard).toBe(true);
      expect(config.interaction.scrollSpeed).toBe(3);
    });

    it('should have per-event-type color mapping', () => {
      const config = factory.createCliConfig() as { colors: Record<string, string> };
      expect(config.colors.find).toBe('cyan');
      expect(config.colors.create).toBe('green');
      expect(config.colors.modify).toBe('yellow');
      expect(config.colors.delete).toBe('red');
      expect(config.colors.move).toBe('blue');
      expect(config.colors.restore).toBe('magenta');
    });
  });

  describe('createDefaultTheme()', () => {
    it('should return a theme object with name "default"', () => {
      const theme = factory.createDefaultTheme() as { name: string };
      expect(theme.name).toBe('default');
    });

    it('should use terminal color names (not hex)', () => {
      const theme = factory.createDefaultTheme() as { colors: Record<string, unknown> };
      // Terminal color names should not start with #
      const flatValues = JSON.stringify(theme.colors);
      expect(flatValues).not.toContain('#');
    });

    it('should have event sub-group with create, modify, delete, move', () => {
      const theme = factory.createDefaultTheme() as { colors: { event: Record<string, string> } };
      expect(theme.colors.event).toHaveProperty('create');
      expect(theme.colors.event).toHaveProperty('modify');
      expect(theme.colors.event).toHaveProperty('delete');
      expect(theme.colors.event).toHaveProperty('move');
    });

    it('should have ui sub-group', () => {
      const theme = factory.createDefaultTheme() as { colors: { ui: Record<string, string> } };
      expect(theme.colors.ui).toBeDefined();
      expect(theme.colors.ui).toHaveProperty('statusBar');
      expect(theme.colors.ui).toHaveProperty('searchBox');
      expect(theme.colors.ui).toHaveProperty('selection');
    });
  });

  describe('createHighContrastTheme()', () => {
    it('should return a theme object with name "high-contrast"', () => {
      const theme = factory.createHighContrastTheme() as { name: string };
      expect(theme.name).toBe('high-contrast');
    });

    it('should use bright-* prefixed color names', () => {
      const theme = factory.createHighContrastTheme() as { colors: { event: Record<string, string> } };
      const eventColors = Object.values(theme.colors.event);
      const hasBrightColors = eventColors.some(c => c.startsWith('bright-'));
      expect(hasBrightColors).toBe(true);
    });

    it('should have event and ui sub-groups', () => {
      const theme = factory.createHighContrastTheme() as { colors: { event: Record<string, string>; ui: Record<string, string> } };
      expect(theme.colors.event).toBeDefined();
      expect(theme.colors.ui).toBeDefined();
    });
  });

  describe('side effects', () => {
    it('should have no side effects on createDaemonConfig (pure)', () => {
      const a = factory.createDaemonConfig();
      const b = factory.createDaemonConfig();
      expect(a).toEqual(b);
      expect(a).not.toBe(b); // different object references
    });

    it('should have no side effects on createCliConfig (pure)', () => {
      const a = factory.createCliConfig();
      const b = factory.createCliConfig();
      expect(a).toEqual(b);
      expect(a).not.toBe(b);
    });

    it('should have no side effects on createDefaultTheme (pure)', () => {
      const a = factory.createDefaultTheme();
      const b = factory.createDefaultTheme();
      expect(a).toEqual(b);
      expect(a).not.toBe(b);
    });

    it('should have no side effects on createHighContrastTheme (pure)', () => {
      const a = factory.createHighContrastTheme();
      const b = factory.createHighContrastTheme();
      expect(a).toEqual(b);
      expect(a).not.toBe(b);
    });
  });
});
