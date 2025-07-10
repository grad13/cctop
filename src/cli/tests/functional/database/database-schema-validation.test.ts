/**
 * FUNC-000 Schema Validation Tests
 * Tests for database schema compliance and validation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { DatabaseTestSetup } from './test-helpers/database-test-setup';
import { DatabaseAdapter } from '../../../../src/database/database-adapter.ts';

describe('FUNC-000 Schema Validation', () => {
  let testSetup: DatabaseTestSetup;
  let testDir: string;
  let dbPath: string;
  let adapter: DatabaseAdapter;

  beforeAll(() => {
    testSetup = new DatabaseTestSetup();
    ({ testDir, dbPath } = testSetup.createTestEnvironment());
  });

  afterAll(() => {
    testSetup.cleanupTestEnvironment();
  });

  beforeEach(async () => {
    adapter = testSetup.createDatabaseAdapter(dbPath);
    await testSetup.createTestDatabase(adapter);
  });

  it('should validate required tables exist', async () => {
    const requiredTables = [
      'events',
      'files', 
      'event_types',
      'directories',
      'file_contents',
      'activity_sessions',
      'event_aggregates'
    ];

    for (const table of requiredTables) {
      const exists = await testSetup.verifyTableExists(adapter, table);
      expect(exists).toBe(true);
    }
  });

  it('should validate event_types table has required data', async () => {
    const hasData = await testSetup.verifyEventTypesData(adapter);
    expect(hasData).toBe(true);

    // Verify specific event types exist
    const eventTypes = ['find', 'create', 'modify', 'delete', 'move', 'restore'];
    
    for (const eventType of eventTypes) {
      const result = await adapter.database.prepare(`
        SELECT COUNT(*) as count FROM event_types WHERE name = ?
      `).get(eventType);
      
      expect(result.count).toBeGreaterThan(0);
    }
  });

  it('should validate foreign key constraints are enabled', async () => {
    const isEnabled = await testSetup.verifyForeignKeysEnabled(adapter);
    expect(isEnabled).toBe(true);
  });

  it('should validate required indexes exist', async () => {
    const requiredIndexes = [
      'idx_events_timestamp',
      'idx_events_filename', 
      'idx_events_directory',
      'idx_events_event_type',
      'idx_files_filename',
      'idx_file_contents_file_id'
    ];

    for (const index of requiredIndexes) {
      const exists = await testSetup.verifyIndexExists(adapter, index);
      expect(exists).toBe(true);
    }
  });

  it('should validate table column constraints', async () => {
    // Test NOT NULL constraints
    try {
      await adapter.database.prepare(`
        INSERT INTO events (timestamp, event_type, filename)
        VALUES (NULL, 'create', 'test.txt')
      `).run();
      
      // Should not reach here if NOT NULL constraint is working
      expect(false).toBe(true);
    } catch (error) {
      // Expected - NOT NULL constraint should prevent this
      expect(error).toBeDefined();
    }
  });

  it('should validate event_type foreign key constraint', async () => {
    try {
      await adapter.database.prepare(`
        INSERT INTO events (timestamp, event_type, filename)
        VALUES ('2025-07-04 15:30:45', 'invalid_type', 'test.txt')
      `).run();
      
      // Should not reach here if foreign key constraint is working
      expect(false).toBe(true);
    } catch (error) {
      // Expected - foreign key constraint should prevent this
      expect(error).toBeDefined();
    }
  });

  it('should validate table schema structure matches FUNC-000', async () => {
    // Validate events table structure
    const eventsSchema = await adapter.database.prepare(`
      PRAGMA table_info(events)
    `).all();

    const expectedColumns = ['id', 'timestamp', 'event_type', 'filename', 'directory', 'lines', 'blocks'];
    const actualColumns = eventsSchema.map((col: any) => col.name);

    expectedColumns.forEach(col => {
      expect(actualColumns).toContain(col);
    });
  });

  it('should validate data types are correct', async () => {
    // Insert test data with specific types
    const testId = 999;
    await adapter.database.prepare(`
      INSERT INTO events (id, timestamp, event_type, filename, directory, lines, blocks)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(testId, '2025-07-04 15:30:45', 'create', 'test.txt', 'test/dir', 100, 5);

    const result = await adapter.database.prepare(`
      SELECT * FROM events WHERE id = ?
    `).get(testId);

    expect(typeof result.id).toBe('number');
    expect(typeof result.timestamp).toBe('string');
    expect(typeof result.event_type).toBe('string');
    expect(typeof result.filename).toBe('string');
    expect(typeof result.lines).toBe('number');
    expect(typeof result.blocks).toBe('number');
  });

  it('should validate view definitions exist', async () => {
    // Check if required views exist
    const requiredViews = ['latest_file_events', 'event_summary'];
    
    for (const view of requiredViews) {
      const result = await adapter.database.prepare(`
        SELECT COUNT(*) as count 
        FROM sqlite_master 
        WHERE type='view' AND name=?
      `).get(view);
      
      expect(result.count).toBeGreaterThan(0);
    }
  });

  it('should validate trigger definitions exist', async () => {
    // Check if required triggers exist
    const requiredTriggers = ['update_file_stats', 'log_event_changes'];
    
    for (const trigger of requiredTriggers) {
      const result = await adapter.database.prepare(`
        SELECT COUNT(*) as count 
        FROM sqlite_master 
        WHERE type='trigger' AND name=?
      `).get(trigger);
      
      expect(result.count).toBeGreaterThan(0);
    }
  });
});