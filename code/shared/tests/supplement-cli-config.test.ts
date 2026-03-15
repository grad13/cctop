/**
 * Tests for CLIConfig - CLI Configuration Type Definition
 * Based on: documents/spec/shared/supplement-cli-config.md
 * @created 2026-03-14
 */

import { describe, it, expect } from 'vitest';
import { CLIConfig, defaultCLIConfig } from '../../code/shared/src/config/CLIConfig';

describe('CLIConfig - CLI Configuration Type Definition', () => {
  describe('defaultCLIConfig structure', () => {
    it('should have a version string', () => {
      expect(typeof defaultCLIConfig.version).toBe('string');
      expect(defaultCLIConfig.version).toBe('0.5.2.6');
    });

    it('should have display, interaction, and colors sections', () => {
      expect(defaultCLIConfig).toHaveProperty('display');
      expect(defaultCLIConfig).toHaveProperty('interaction');
      expect(defaultCLIConfig).toHaveProperty('colors');
    });
  });

  describe('dual column definition system', () => {
    it('should have legacy columnWidths with 4 fields', () => {
      const cw = defaultCLIConfig.display.columnWidths;
      expect(cw).toHaveProperty('time');
      expect(cw).toHaveProperty('event');
      expect(cw).toHaveProperty('size');
      expect(cw).toHaveProperty('path');
    });

    it('should have current columns system with 8 columns', () => {
      const cols = defaultCLIConfig.display.columns;
      expect(cols).toHaveProperty('timestamp');
      expect(cols).toHaveProperty('elapsed');
      expect(cols).toHaveProperty('fileName');
      expect(cols).toHaveProperty('event');
      expect(cols).toHaveProperty('lines');
      expect(cols).toHaveProperty('blocks');
      expect(cols).toHaveProperty('size');
      expect(cols).toHaveProperty('directory');
    });

    it('should have visible and width properties on each column', () => {
      const cols = defaultCLIConfig.display.columns;
      const columnNames = ['timestamp', 'elapsed', 'fileName', 'event', 'lines', 'blocks', 'size', 'directory'] as const;
      for (const name of columnNames) {
        expect(cols[name]).toHaveProperty('visible');
        expect(cols[name]).toHaveProperty('width');
        expect(typeof cols[name].visible).toBe('boolean');
        expect(typeof cols[name].width).toBe('number');
      }
    });
  });

  describe('column layout specification', () => {
    it('should have timestamp width of 19', () => {
      expect(defaultCLIConfig.display.columns.timestamp.width).toBe(19);
    });

    it('should have elapsed width of 8', () => {
      expect(defaultCLIConfig.display.columns.elapsed.width).toBe(8);
    });

    it('should have fileName width of 35', () => {
      expect(defaultCLIConfig.display.columns.fileName.width).toBe(35);
    });

    it('should have event width of 6', () => {
      expect(defaultCLIConfig.display.columns.event.width).toBe(6);
    });

    it('should have lines width of 6', () => {
      expect(defaultCLIConfig.display.columns.lines.width).toBe(6);
    });

    it('should have blocks width of 4', () => {
      expect(defaultCLIConfig.display.columns.blocks.width).toBe(4);
    });

    it('should have size width of 7', () => {
      expect(defaultCLIConfig.display.columns.size.width).toBe(7);
    });

    it('should have directory width of -1 (auto-fill)', () => {
      expect(defaultCLIConfig.display.columns.directory.width).toBe(-1);
    });
  });

  describe('event color mapping', () => {
    it('should map find to cyan', () => {
      expect(defaultCLIConfig.colors.find).toBe('cyan');
    });

    it('should map create to green', () => {
      expect(defaultCLIConfig.colors.create).toBe('green');
    });

    it('should map modify to yellow', () => {
      expect(defaultCLIConfig.colors.modify).toBe('yellow');
    });

    it('should map delete to red', () => {
      expect(defaultCLIConfig.colors.delete).toBe('red');
    });

    it('should map move to blue', () => {
      expect(defaultCLIConfig.colors.move).toBe('blue');
    });

    it('should map restore to magenta', () => {
      expect(defaultCLIConfig.colors.restore).toBe('magenta');
    });

    it('should have info, success, warning, error colors', () => {
      expect(defaultCLIConfig.colors.info).toBeDefined();
      expect(defaultCLIConfig.colors.success).toBeDefined();
      expect(defaultCLIConfig.colors.warning).toBeDefined();
      expect(defaultCLIConfig.colors.error).toBeDefined();
    });
  });

  describe('legacy backward compatibility', () => {
    it('should have root-level refreshInterval matching display.refreshInterval', () => {
      expect(defaultCLIConfig.refreshInterval).toBe(defaultCLIConfig.display.refreshInterval);
    });

    it('should have root-level maxRows matching display.maxRows', () => {
      expect(defaultCLIConfig.maxRows).toBe(defaultCLIConfig.display.maxRows);
    });

    it('should have root-level displayMode', () => {
      expect(defaultCLIConfig.displayMode).toBeDefined();
    });

    it('should have root-level colorEnabled', () => {
      expect(defaultCLIConfig.colorEnabled).toBeDefined();
    });
  });

  describe('directoryMutePaths', () => {
    it('should default to an empty array', () => {
      expect(defaultCLIConfig.display.directoryMutePaths).toEqual([]);
    });

    it('should be optional in CLIConfig interface', () => {
      const config: CLIConfig = {
        ...defaultCLIConfig,
        display: {
          ...defaultCLIConfig.display,
          directoryMutePaths: undefined,
        },
      };
      expect(config.display.directoryMutePaths).toBeUndefined();
    });
  });

  describe('interaction defaults', () => {
    it('should enable mouse by default', () => {
      expect(defaultCLIConfig.interaction.enableMouse).toBe(true);
    });

    it('should enable keyboard by default', () => {
      expect(defaultCLIConfig.interaction.enableKeyboard).toBe(true);
    });

    it('should have scrollSpeed of 3', () => {
      expect(defaultCLIConfig.interaction.scrollSpeed).toBe(3);
    });
  });

  describe('no side effects', () => {
    it('should be a pure data export with no functions', () => {
      // defaultCLIConfig should be a plain object, not a class instance with methods
      expect(typeof defaultCLIConfig).toBe('object');
      const ownMethods = Object.values(defaultCLIConfig).filter(v => typeof v === 'function');
      expect(ownMethods).toHaveLength(0);
    });
  });
});
