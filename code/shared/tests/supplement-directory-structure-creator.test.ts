/**
 * Tests for DirectoryStructureCreator - .cctop Directory Scaffolding
 * Based on: documents/spec/shared/supplement-directory-structure-creator.md
 * @created 2026-03-14
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DirectoryStructureCreator } from '../../code/shared/src/config/DirectoryStructureCreator';

describe('DirectoryStructureCreator - .cctop Directory Scaffolding', () => {
  let testDir: string;
  let creator: DirectoryStructureCreator;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cctop-dsc-test-'));
    creator = new DirectoryStructureCreator();
  });

  afterEach(() => {
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('create()', () => {
    it('should create the root directory (index 0)', () => {
      const configPath = path.join(testDir, '.cctop');
      creator.create(configPath);
      expect(fs.existsSync(configPath)).toBe(true);
    });

    it('should create config directory (index 1)', () => {
      const configPath = path.join(testDir, '.cctop');
      creator.create(configPath);
      expect(fs.existsSync(path.join(configPath, 'config'))).toBe(true);
    });

    it('should create themes directory (index 2)', () => {
      const configPath = path.join(testDir, '.cctop');
      creator.create(configPath);
      expect(fs.existsSync(path.join(configPath, 'themes'))).toBe(true);
    });

    it('should create themes/custom directory (index 3)', () => {
      const configPath = path.join(testDir, '.cctop');
      creator.create(configPath);
      expect(fs.existsSync(path.join(configPath, 'themes', 'custom'))).toBe(true);
    });

    it('should create data directory (index 4)', () => {
      const configPath = path.join(testDir, '.cctop');
      creator.create(configPath);
      expect(fs.existsSync(path.join(configPath, 'data'))).toBe(true);
    });

    it('should create logs directory (index 5)', () => {
      const configPath = path.join(testDir, '.cctop');
      creator.create(configPath);
      expect(fs.existsSync(path.join(configPath, 'logs'))).toBe(true);
    });

    it('should create cache directory (index 6)', () => {
      const configPath = path.join(testDir, '.cctop');
      creator.create(configPath);
      expect(fs.existsSync(path.join(configPath, 'cache'))).toBe(true);
    });

    it('should create runtime directory (index 7)', () => {
      const configPath = path.join(testDir, '.cctop');
      creator.create(configPath);
      expect(fs.existsSync(path.join(configPath, 'runtime'))).toBe(true);
    });

    it('should create temp directory (index 8)', () => {
      const configPath = path.join(testDir, '.cctop');
      creator.create(configPath);
      expect(fs.existsSync(path.join(configPath, 'temp'))).toBe(true);
    });

    it('should create exactly 9 directories in total', () => {
      const configPath = path.join(testDir, '.cctop');
      creator.create(configPath);

      const expectedDirs = [
        '',
        'config',
        'themes',
        'themes/custom',
        'data',
        'logs',
        'cache',
        'runtime',
        'temp',
      ];

      for (const dir of expectedDirs) {
        const fullPath = path.join(configPath, dir);
        expect(fs.existsSync(fullPath)).toBe(true);
        expect(fs.statSync(fullPath).isDirectory()).toBe(true);
      }
    });
  });

  describe('creation semantics', () => {
    it('should create directories with recursive: true (nested paths work)', () => {
      // configPath doesn't exist yet, recursive creation should work
      const configPath = path.join(testDir, 'nested', 'deep', '.cctop');
      creator.create(configPath);
      expect(fs.existsSync(path.join(configPath, 'config'))).toBe(true);
    });

    it('should create directories with mode 0o755', () => {
      const configPath = path.join(testDir, '.cctop');
      creator.create(configPath);

      const stats = fs.statSync(path.join(configPath, 'config'));
      // On macOS/Linux, check that the directory is readable and executable by all
      const mode = stats.mode & 0o777;
      expect(mode).toBe(0o755);
    });
  });

  describe('idempotency', () => {
    it('should be idempotent - repeated calls produce no errors', () => {
      const configPath = path.join(testDir, '.cctop');
      creator.create(configPath);
      // Second call should not throw
      expect(() => creator.create(configPath)).not.toThrow();
    });

    it('should preserve existing directory contents on repeated calls', () => {
      const configPath = path.join(testDir, '.cctop');
      creator.create(configPath);

      // Write a file into one of the created directories
      const testFile = path.join(configPath, 'config', 'test-file.txt');
      fs.writeFileSync(testFile, 'test content');

      // Call create again
      creator.create(configPath);

      // Verify the file still exists
      expect(fs.existsSync(testFile)).toBe(true);
      expect(fs.readFileSync(testFile, 'utf8')).toBe('test content');
    });

    it('should skip existing directories (existsSync check)', () => {
      const configPath = path.join(testDir, '.cctop');

      // Pre-create some directories
      fs.mkdirSync(path.join(configPath, 'config'), { recursive: true });
      fs.mkdirSync(path.join(configPath, 'data'), { recursive: true });

      // Should not throw and should create missing directories
      expect(() => creator.create(configPath)).not.toThrow();
      expect(fs.existsSync(path.join(configPath, 'themes'))).toBe(true);
      expect(fs.existsSync(path.join(configPath, 'logs'))).toBe(true);
    });
  });

  describe('separation from ConfigManager', () => {
    it('should handle only directory creation (no file generation)', () => {
      const configPath = path.join(testDir, '.cctop');
      creator.create(configPath);

      // Should not create any config files
      const configDir = path.join(configPath, 'config');
      const files = fs.readdirSync(configDir);
      expect(files).toHaveLength(0);
    });

    it('should not create theme files', () => {
      const configPath = path.join(testDir, '.cctop');
      creator.create(configPath);

      const themesDir = path.join(configPath, 'themes');
      const files = fs.readdirSync(themesDir).filter(f => f !== 'custom');
      expect(files).toHaveLength(0);
    });

    it('should not create .gitignore', () => {
      const configPath = path.join(testDir, '.cctop');
      creator.create(configPath);

      expect(fs.existsSync(path.join(configPath, '.gitignore'))).toBe(false);
    });
  });
});
