/**
 * CLI Config Tests
 * Tests for CLI configuration types and defaults
 */

import { describe, it, expect } from 'vitest';
import { CLIConfig, defaultCLIConfig } from '../../../src/config/cli-config';

describe('CLIConfig', () => {
  describe('Default Configuration', () => {
    it('should have correct default values', () => {
      expect(defaultCLIConfig.refreshInterval).toBe(100);
      expect(defaultCLIConfig.maxRows).toBe(20);
      expect(defaultCLIConfig.displayMode).toBe('all');
      expect(defaultCLIConfig.colorEnabled).toBe(true);
    });
  });

  describe('Configuration Creation', () => {
    it('should create a valid configuration object', () => {
      const config: CLIConfig = {
        refreshInterval: 500,
        maxRows: 50,
        displayMode: 'unique',
        headerVisible: false,
        showElapsed: false,
        colorEnabled: false,
        instantViewerEnabled: true
      };

      expect(config.refreshInterval).toBe(500);
      expect(config.maxRows).toBe(50);
      expect(config.displayMode).toBe('unique');
      expect(config.headerVisible).toBe(false);
      expect(config.showElapsed).toBe(false);
      expect(config.colorEnabled).toBe(false);
      expect(config.instantViewerEnabled).toBe(true);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate refresh interval', () => {
      const isValidRefreshInterval = (interval: number): boolean => {
        return interval >= 100 && interval <= 10000;
      };

      expect(isValidRefreshInterval(100)).toBe(true);
      expect(isValidRefreshInterval(1000)).toBe(true);
      expect(isValidRefreshInterval(10000)).toBe(true);
      expect(isValidRefreshInterval(50)).toBe(false);
      expect(isValidRefreshInterval(20000)).toBe(false);
    });

    it('should validate max rows', () => {
      const isValidMaxRows = (rows: number): boolean => {
        return rows >= 10 && rows <= 1000;
      };

      expect(isValidMaxRows(10)).toBe(true);
      expect(isValidMaxRows(100)).toBe(true);
      expect(isValidMaxRows(1000)).toBe(true);
      expect(isValidMaxRows(5)).toBe(false);
      expect(isValidMaxRows(2000)).toBe(false);
    });

    it('should validate display mode', () => {
      const isValidDisplayMode = (mode: string): boolean => {
        return mode === 'all' || mode === 'unique';
      };

      expect(isValidDisplayMode('all')).toBe(true);
      expect(isValidDisplayMode('unique')).toBe(true);
      expect(isValidDisplayMode('invalid')).toBe(false);
    });
  });

  describe('Configuration Merging', () => {
    it('should merge partial configuration with defaults', () => {
      const mergeConfig = (partial: Partial<CLIConfig>): CLIConfig => {
        return { ...defaultCLIConfig, ...partial };
      };

      const merged = mergeConfig({
        refreshInterval: 2000,
        displayMode: 'unique'
      });

      expect(merged.refreshInterval).toBe(2000);
      expect(merged.displayMode).toBe('unique');
      expect(merged.maxRows).toBe(20); // From default
      expect(merged.colorEnabled).toBe(true); // From default
    });
  });
});