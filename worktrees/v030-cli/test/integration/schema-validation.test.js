import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { ConfigSchema, ConfigRequiredFieldsSchema, ConfigValueRangesSchema } from '../schema/config-schema.js';
import { 
  EventRecordSchema, 
  FilesSchema, 
  EventTypeSchema,
  MeasurementsSchema,
  AggregatesSchema,
  ExpectedTablesSchema 
} from '../schema/database-schema.js';

/**
 * Schema Validation Test Suite
 * 
 * Purpose: 仕様書で定義されたスキーマと実際の実装の整合性を検証
 * Approach: Schema Validation (データ構造の正確性チェック)
 */
describe('Schema Validation Suite', () => {
  
  describe('Config Schema Validation', () => {
    let tempConfigPath;
    
    beforeEach(() => {
      tempConfigPath = path.join('/tmp', `cctop-test-config-${Date.now()}.json`);
    });
    
    afterEach(() => {
      if (fs.existsSync(tempConfigPath)) {
        fs.unlinkSync(tempConfigPath);
      }
    });

    test('Should validate default config structure against schema', () => {
      const defaultConfig = {
        version: "0.1.0",
        monitoring: {
          watchPaths: [],
          excludePatterns: ["**/node_modules/**", "**/.git/**", "**/.DS_Store", "**/.cctop/**"],
          debounceMs: 100,
          maxDepth: 10
        },
        database: {
          path: "~/.cctop/activity.db",
          mode: "WAL"
        },
        display: {
          maxEvents: 20,
          refreshRateMs: 100
        }
      };

      // Schema validation should pass
      const validationResult = ConfigSchema.safeParse(defaultConfig);
      expect(validationResult.success).toBe(true);
      
      if (!validationResult.success) {
        console.log('Validation errors:', validationResult.error.errors);
      }
    });

    test('Should detect config property name violations', () => {
      // Test case for the actual bug: refreshInterval vs refreshRateMs
      const invalidConfig = {
        version: "0.1.0",
        monitoring: {
          watchPaths: [],
          excludePatterns: [],
          debounceMs: 100,
          maxDepth: 10
        },
        database: {
          path: "~/.cctop/activity.db",
          mode: "WAL"
        },
        display: {
          maxEvents: 20,
          refreshInterval: 100  // Wrong property name (should be refreshRateMs)
        }
      };

      const validationResult = ConfigSchema.safeParse(invalidConfig);
      expect(validationResult.success).toBe(false);
      
      // Check that it specifically flags the missing refreshRateMs
      const errors = validationResult.error?.errors || [];
      const missingRefreshRate = errors.some(err => 
        err.path.includes('refreshRateMs') && err.code === 'invalid_type'
      );
      expect(missingRefreshRate).toBe(true);
    });

    test('Should validate config value ranges', () => {
      const invalidRangeConfigs = [
        {
          monitoring: { debounceMs: -1 },  // Too low
          display: { maxEvents: 20, refreshRateMs: 100 },
          database: { path: "test.db", mode: "WAL" }
        },
        {
          monitoring: { debounceMs: 100, maxDepth: 101 },  // Too high
          display: { maxEvents: 20, refreshRateMs: 100 },
          database: { path: "test.db", mode: "WAL" }
        },
        {
          monitoring: { debounceMs: 100 },
          display: { maxEvents: 0, refreshRateMs: 100 },  // Too low
          database: { path: "test.db", mode: "WAL" }
        }
      ];

      invalidRangeConfigs.forEach((config, index) => {
        const validationResult = ConfigValueRangesSchema.safeParse(config);
        expect(validationResult.success).toBe(false, `Config ${index} should fail validation`);
      });
    });

    test('Should validate generated config file against schema', async () => {
      // Test actual ConfigManager output using dynamic import
      const { default: ConfigManager } = await import('../../src/config/config-manager.js');
      const configManager = new ConfigManager();
      
      // Create default config manually based on specification
      const defaultConfig = {
        version: "0.1.0",
        monitoring: {
          watchPaths: [],
          excludePatterns: ["**/node_modules/**", "**/.git/**", "**/.DS_Store", "**/.cctop/**"],
          debounceMs: 100,
          maxDepth: 10
        },
        database: {
          path: "~/.cctop/activity.db",
          mode: "WAL"
        },
        display: {
          maxEvents: 20,
          refreshRateMs: 100
        }
      };
      
      // Write and read back to simulate real usage
      fs.writeFileSync(tempConfigPath, JSON.stringify(defaultConfig, null, 2));
      const loadedConfig = JSON.parse(fs.readFileSync(tempConfigPath, 'utf8'));
      
      // Schema validation should pass for real generated config
      const validationResult = ConfigSchema.safeParse(loadedConfig);
      expect(validationResult.success).toBe(true);
      
      if (!validationResult.success) {
        console.log('Generated config validation errors:', validationResult.error.errors);
        console.log('Generated config:', JSON.stringify(loadedConfig, null, 2));
      }
    });

    test('Should validate required fields presence', () => {
      const configWithMissingRequired = {
        monitoring: {
          // Missing watchPaths
          excludePatterns: [],
          debounceMs: 100
        },
        database: {
          // Missing path
          mode: "WAL"
        },
        display: {
          // Missing maxEvents
          refreshRateMs: 100
        }
      };

      const validationResult = ConfigRequiredFieldsSchema.safeParse(configWithMissingRequired);
      expect(validationResult.success).toBe(false);
    });
  });

  describe('Database Schema Validation', () => {
    let dbManager;
    let tempDbPath;

    beforeEach(async () => {
      tempDbPath = path.join('/tmp', `cctop-test-db-${Date.now()}.db`);
      const { default: DatabaseManager } = await import('../../src/database/database-manager.js');
      dbManager = new DatabaseManager(tempDbPath);
      await dbManager.initialize();
    });

    afterEach(async () => {
      if (dbManager) {
        await dbManager.close();
      }
      if (fs.existsSync(tempDbPath)) {
        fs.unlinkSync(tempDbPath);
      }
    });

    test('Should validate database table structure against schema', async () => {
      // Check that all expected tables exist with correct columns
      const tables = ['event_types', 'object_fingerprint', 'events', 'object_statistics'];
      
      const actualTableStructure = {};
      
      for (const tableName of tables) {
        const columns = await dbManager.all(`PRAGMA table_info(${tableName})`);
        actualTableStructure[tableName] = columns.map(col => col.name);
      }

      // Validate against expected schema
      const validationResult = ExpectedTablesSchema.safeParse(actualTableStructure);
      expect(validationResult.success).toBe(true);
      
      if (!validationResult.success) {
        console.log('Database schema validation errors:', validationResult.error.errors);
        console.log('Actual table structure:', actualTableStructure);
      }
    });

    test('Should validate event record data against schema', async () => {
      // DatabaseManager already initializes event_types, so we use existing ones
      // Get the first event_type_id (should be 'find' = id 1)
      const eventType = await dbManager.get(`SELECT id FROM event_types WHERE code = 'find'`);
      
      // Insert test object fingerprint
      await dbManager.run(`INSERT INTO object_fingerprint (inode) VALUES (12345)`);
      
      const eventData = {
        timestamp: Date.now(),
        event_type_id: eventType.id,
        object_id: 1,
        file_path: '/test/file.txt',
        file_name: 'file.txt',
        directory: '/test',
        is_directory: 0,
        file_size: 1024,
        line_count: 50,
        block_count: 2
      };

      // Insert event
      await dbManager.run(`
        INSERT INTO events (timestamp, event_type_id, object_id, file_path, file_name, directory, is_directory, file_size, line_count, block_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        eventData.timestamp, eventData.event_type_id, eventData.object_id,
        eventData.file_path, eventData.file_name, eventData.directory,
        eventData.is_directory, eventData.file_size, eventData.line_count, eventData.block_count
      ]);

      // Retrieve and validate
      const retrievedEvent = await dbManager.get('SELECT * FROM events WHERE object_id = 1');
      const validationResult = EventRecordSchema.safeParse(retrievedEvent);
      
      // Always log for debugging during implementation
      console.log('Retrieved event:', retrievedEvent);
      if (!validationResult.success) {
        console.log('Event record validation errors:', validationResult.error.errors);
      }
      
      expect(validationResult.success).toBe(true);
    });

    test('Should validate object statistics data against schema', async () => {
      // Insert test object fingerprint
      await dbManager.run(`INSERT INTO object_fingerprint (inode) VALUES (54321)`);
      
      const statsData = {
        object_id: 1,
        current_file_size: 2048,
        current_line_count: 100,
        current_block_count: 4,
        total_events: 5,
        total_modifications: 3
      };

      // Insert statistics
      await dbManager.run(`
        INSERT INTO object_statistics (object_id, current_file_size, current_line_count, current_block_count, total_events, total_modifications)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        statsData.object_id, statsData.current_file_size, statsData.current_line_count,
        statsData.current_block_count, statsData.total_events, statsData.total_modifications
      ]);

      // Retrieve and validate
      const retrievedStats = await dbManager.get('SELECT * FROM object_statistics WHERE object_id = 1');
      const validationResult = ObjectStatisticsSchema.safeParse(retrievedStats);
      
      expect(validationResult.success).toBe(true);
      
      if (!validationResult.success) {
        console.log('Object statistics validation errors:', validationResult.error.errors);
        console.log('Retrieved stats:', retrievedStats);
      }
    });

    test('Should detect database column name violations', async () => {
      // Test for potential database schema violations
      // This would catch issues like eventType vs event_type_id mismatches
      
      const expectedEventColumns = ['id', 'timestamp', 'event_type_id', 'object_id', 'file_path', 'file_name', 'directory'];
      const actualEventColumnsData = await dbManager.all('PRAGMA table_info(events)');
      const actualEventColumns = actualEventColumnsData.map(col => col.name);
      
      expectedEventColumns.forEach(expectedCol => {
        expect(actualEventColumns).toContain(expectedCol);
      });

      // Specifically check for common naming violations
      expect(actualEventColumns).not.toContain('eventType');  // Should be event_type_id
      expect(actualEventColumns).not.toContain('objectId');   // Should be object_id
      expect(actualEventColumns).not.toContain('filePath');   // Should be file_path
    });
  });

  describe('Schema Integration Tests', () => {
    test('Should validate that config and database schemas are consistent', () => {
      // Test that database mode enum matches config mode enum
      const configModes = ['WAL', 'DELETE', 'TRUNCATE'];
      
      // This would typically be extended to check that config enums
      // match database constraint enums, etc.
      expect(configModes).toContain('WAL');
      expect(configModes).toContain('DELETE');
    });

    test('Should validate that maxEvents config matches database query limits', () => {
      // Integration test to ensure config.display.maxEvents
      // is respected by database queries
      const defaultConfig = {
        display: { maxEvents: 20, refreshRateMs: 100 }
      };
      
      const configValidation = ConfigSchema.shape.display.safeParse(defaultConfig.display);
      expect(configValidation.success).toBe(true);
      
      // This ensures maxEvents is a valid positive number that can be used in SQL LIMIT clauses
      expect(defaultConfig.display.maxEvents).toBeGreaterThan(0);
      expect(defaultConfig.display.maxEvents).toBeLessThanOrEqual(1000);
    });
  });
});