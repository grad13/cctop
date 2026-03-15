/**
 * Tests for Hierarchical Config Management
 * Based on: documents/spec/shared/hierarchical-config-management.md
 * @created 2026-03-14
 */

import { describe, it, expect } from 'vitest';
import { SharedConfig, defaultSharedConfig } from '../../code/shared/src/config/SharedConfig';

describe('Hierarchical Config Management', () => {
  describe('shared-config.json schema', () => {
    it('should have a version string matching x.x.x.x format', () => {
      expect(defaultSharedConfig.version).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
    });

    it('should have required top-level fields: version, project, database, directories', () => {
      expect(defaultSharedConfig).toHaveProperty('version');
      expect(defaultSharedConfig).toHaveProperty('project');
      expect(defaultSharedConfig).toHaveProperty('database');
      expect(defaultSharedConfig).toHaveProperty('directories');
    });

    it('should have project with name and description', () => {
      expect(defaultSharedConfig.project).toBeDefined();
      expect(defaultSharedConfig.project!.name).toBe('cctop');
      expect(typeof defaultSharedConfig.project!.name).toBe('string');
      expect(typeof defaultSharedConfig.project!.description).toBe('string');
    });

    it('should have database with path as required field', () => {
      expect(defaultSharedConfig.database).toBeDefined();
      expect(typeof defaultSharedConfig.database.path).toBe('string');
      expect(defaultSharedConfig.database.path).toBe('.cctop/data/activity.db');
    });

    it('should have database.maxSize as integer >= 1048576', () => {
      expect(defaultSharedConfig.database.maxSize).toBeDefined();
      expect(defaultSharedConfig.database.maxSize).toBeGreaterThanOrEqual(1048576);
      expect(Number.isInteger(defaultSharedConfig.database.maxSize)).toBe(true);
    });

    it('should have directories with all 6 required subdirectories', () => {
      const dirs = defaultSharedConfig.directories!;
      expect(dirs.config).toBe('.cctop/config');
      expect(dirs.themes).toBe('.cctop/themes');
      expect(dirs.data).toBe('.cctop/data');
      expect(dirs.logs).toBe('.cctop/logs');
      expect(dirs.runtime).toBe('.cctop/runtime');
      expect(dirs.temp).toBe('.cctop/temp');
    });

    it('should have logging settings with maxFileSize, maxFiles, datePattern', () => {
      const logging = defaultSharedConfig.logging!;
      expect(logging.maxFileSize).toBeGreaterThanOrEqual(1048576);
      expect(logging.maxFiles).toBeGreaterThanOrEqual(1);
      expect(typeof logging.datePattern).toBe('string');
    });
  });

  describe('default values per spec', () => {
    it('should default database maxSize to 100MB (104857600)', () => {
      expect(defaultSharedConfig.database.maxSize).toBe(104857600);
    });

    it('should default logging maxFileSize to 10MB (10485760)', () => {
      expect(defaultSharedConfig.logging!.maxFileSize).toBe(10485760);
    });

    it('should default logging maxFiles to 5', () => {
      expect(defaultSharedConfig.logging!.maxFiles).toBe(5);
    });

    it('should default logging datePattern to YYYY-MM-DD', () => {
      expect(defaultSharedConfig.logging!.datePattern).toBe('YYYY-MM-DD');
    });
  });

  describe('SharedConfig interface type constraints', () => {
    it('should allow a valid SharedConfig object', () => {
      const config: SharedConfig = {
        version: '0.5.2.6',
        database: {
          path: '.cctop/data/activity.db',
        },
      };
      expect(config.version).toBe('0.5.2.6');
      expect(config.database.path).toBe('.cctop/data/activity.db');
    });

    it('should allow optional fields to be omitted', () => {
      const config: SharedConfig = {
        version: '1.0.0.0',
        database: { path: 'test.db' },
      };
      expect(config.project).toBeUndefined();
      expect(config.directories).toBeUndefined();
      expect(config.logging).toBeUndefined();
    });

    it('should support legacy fields for backward compatibility', () => {
      const config: SharedConfig = {
        version: '0.5.2.6',
        database: { path: 'test.db' },
        projectName: 'legacy-name',
        watchPaths: ['.'],
        excludePatterns: ['**/node_modules/**'],
        createdAt: '2026-01-01',
      };
      expect(config.projectName).toBe('legacy-name');
      expect(config.watchPaths).toEqual(['.']);
      expect(config.excludePatterns).toEqual(['**/node_modules/**']);
      expect(config.createdAt).toBe('2026-01-01');
    });
  });
});
