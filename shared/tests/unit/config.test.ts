/**
 * Configuration module unit tests
 */

import { 
  loadConfiguration, 
  deepMerge, 
  ArrayMergeStrategy,
  validateShared,
  validateDaemon,
  validateCli 
} from '../../src/config';
import { SharedConfig } from '../../src/types';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

describe('Config', () => {
  const testConfigDir = join(__dirname, '../fixtures/config');

  beforeEach(() => {
    // Create test config directory
    if (!existsSync(testConfigDir)) {
      mkdirSync(testConfigDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up
    if (existsSync(testConfigDir)) {
      rmSync(testConfigDir, { recursive: true });
    }
  });

  describe('deepMerge', () => {
    it('should merge objects deeply', () => {
      const target = {
        a: 1,
        b: { c: 2, d: 3 },
        e: [1, 2]
      };
      
      const source: any = {
        b: { c: 4, f: 5 },
        e: [3, 4],
        g: 6
      };
      
      const result = deepMerge(target, source);
      
      expect(result).toEqual({
        a: 1,
        b: { c: 4, d: 3, f: 5 },
        e: [3, 4],
        g: 6
      });
    });

    it('should handle array merge strategies', () => {
      const target = { arr: [1, 2] };
      const source = { arr: [3, 4] };
      
      // Replace strategy (default)
      let result = deepMerge(target, source, ArrayMergeStrategy.REPLACE);
      expect(result.arr).toEqual([3, 4]);
      
      // Concat strategy
      result = deepMerge(target, source, ArrayMergeStrategy.CONCAT);
      expect(result.arr).toEqual([1, 2, 3, 4]);
      
      // Unique strategy
      const target2 = { arr: [1, 2, 3] };
      const source2 = { arr: [2, 3, 4] };
      result = deepMerge(target2, source2, ArrayMergeStrategy.UNIQUE);
      expect(result.arr).toEqual([1, 2, 3, 4]);
    });
  });

  describe('validation', () => {
    it('should validate valid shared config', () => {
      const config: SharedConfig = {
        version: '0.3.0.0',
        project: {
          name: 'test',
          description: 'Test project'
        },
        database: {
          path: 'test.db'
        },
        directories: {
          config: '.test',
          logs: '.test/logs',
          temp: '.test/temp'
        }
      };
      
      const result = validateShared(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject invalid shared config', () => {
      const config = {
        version: 'invalid-version',
        project: {
          name: 'test'
          // missing description
        },
        database: {
          path: 'test.db'
        },
        directories: {
          config: '.test',
          logs: '.test/logs'
          // missing temp
        }
      };
      
      const result = validateShared(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should validate daemon config', () => {
      const config = {
        watch: {
          enabled: true,
          paths: ['.'],
          ignore: ['node_modules'],
          followSymlinks: false
        }
      };
      
      const result = validateDaemon(config);
      expect(result.valid).toBe(true);
    });

    it('should validate CLI config', () => {
      const config = {
        display: {
          refreshRate: 100,
          maxRows: 50,
          showHidden: false
        },
        polling: {
          interval: 100
        }
      };
      
      const result = validateCli(config);
      expect(result.valid).toBe(true);
    });
  });

  describe('loadConfiguration', () => {
    it('should load default configuration when no files exist', async () => {
      const config = await loadConfiguration({
        configDir: testConfigDir
      });
      
      expect(config.shared).toBeDefined();
      expect(config.shared.version).toBe('0.3.0.0');
      expect(config.shared.project.name).toBe('cctop');
    });

    it('should load shared configuration from file', async () => {
      const sharedConfig = {
        version: '0.3.0.1',
        project: {
          name: 'custom-cctop',
          description: 'Custom description'
        },
        database: {
          path: 'custom.db'
        },
        directories: {
          config: '.custom',
          logs: '.custom/logs',
          temp: '.custom/temp'
        }
      };
      
      writeFileSync(
        join(testConfigDir, 'shared-config.json'),
        JSON.stringify(sharedConfig)
      );
      
      const config = await loadConfiguration({
        configDir: testConfigDir
      });
      
      expect(config.shared.version).toBe('0.3.0.1');
      expect(config.shared.project.name).toBe('custom-cctop');
      expect(config.shared.database.path).toBe('custom.db');
    });

    it('should load process-specific configuration', async () => {
      const daemonConfig = {
        watch: {
          enabled: true,
          paths: ['/custom/path'],
          ignore: ['custom-ignore'],
          followSymlinks: true
        }
      };
      
      writeFileSync(
        join(testConfigDir, 'daemon-config.json'),
        JSON.stringify(daemonConfig)
      );
      
      const config = await loadConfiguration({
        configDir: testConfigDir,
        processType: 'daemon'
      });
      
      expect(config.daemon).toBeDefined();
      expect(config.daemon!.watch.paths).toEqual(['/custom/path']);
      expect(config.daemon!.watch.followSymlinks).toBe(true);
    });

    it('should merge with defaults properly', async () => {
      const partialConfig = {
        database: {
          path: 'my-custom.db'
        }
      };
      
      writeFileSync(
        join(testConfigDir, 'shared-config.json'),
        JSON.stringify(partialConfig)
      );
      
      const config = await loadConfiguration({
        configDir: testConfigDir
      });
      
      // Custom value should be used
      expect(config.shared.database.path).toBe('my-custom.db');
      
      // Default values should still be present
      expect(config.shared.version).toBe('0.3.0.0');
      expect(config.shared.directories.logs).toBe('.cctop/logs');
    });
  });
});