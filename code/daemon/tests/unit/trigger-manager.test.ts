/**
 * trigger-manager.test
 * @created 2026-03-14
 * @checked 2026-03-14
 * @updated 2026-03-14
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import sqlite3 from 'sqlite3';
import { TriggerManager } from '../../src/database/TriggerManager.js';
import { SchemaManager } from '../../src/database/SchemaManager.js';

function openMemoryDb(): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(':memory:', (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

function closeDb(db: sqlite3.Database): Promise<void> {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function dbAll(db: sqlite3.Database, sql: string, params: any[] = []): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function dbRun(db: sqlite3.Database, sql: string, params: any[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

describe('TriggerManager', () => {
  let db: sqlite3.Database;
  let triggerManager: TriggerManager;

  beforeEach(async () => {
    db = await openMemoryDb();
    const schemaManager = new SchemaManager(db);
    await schemaManager.initializeSchema();
    triggerManager = new TriggerManager(db);
  });

  afterEach(async () => {
    await closeDb(db);
  });

  describe('createTriggers', () => {
    it('should create two triggers without error', async () => {
      await triggerManager.createTriggers();

      const triggers = await dbAll(db,
        "SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name"
      );
      const names = triggers.map((t: any) => t.name);
      expect(names).toContain('trigger_maintain_aggregates_on_measurement');
      expect(names).toContain('trigger_maintain_aggregates_on_event');
      expect(names).toHaveLength(2);
    });

    it('should be idempotent (can be called twice)', async () => {
      await triggerManager.createTriggers();
      await triggerManager.createTriggers();

      const triggers = await dbAll(db,
        "SELECT name FROM sqlite_master WHERE type = 'trigger'"
      );
      expect(triggers).toHaveLength(2);
    });
  });

  describe('trigger_maintain_aggregates_on_measurement', () => {
    it('should update aggregates when a measurement is inserted', async () => {
      await triggerManager.createTriggers();

      // Insert a file
      await dbRun(db, 'INSERT INTO files (id, inode) VALUES (1, 12345)');

      // Insert a create event (event_type_id=2)
      await dbRun(db,
        'INSERT INTO events (id, timestamp, event_type_id, file_id, file_path, file_name, directory) VALUES (1, 1000, 2, 1, "/test/file.ts", "file.ts", "/test")'
      );

      // Insert a measurement -> should fire trigger
      await dbRun(db,
        'INSERT INTO measurements (event_id, inode, file_size, line_count, block_count) VALUES (1, 12345, 500, 50, 1)'
      );

      const aggregates = await dbAll(db, 'SELECT * FROM aggregates WHERE file_id = 1');
      expect(aggregates).toHaveLength(1);
      expect(aggregates[0].total_events).toBe(1);
      expect(aggregates[0].total_creates).toBe(1);
      expect(aggregates[0].first_size).toBe(500);
      expect(aggregates[0].last_size).toBe(500);
      expect(aggregates[0].max_size).toBe(500);
    });
  });

  describe('trigger_maintain_aggregates_on_event', () => {
    it('should update aggregates when a delete event is inserted', async () => {
      await triggerManager.createTriggers();

      // Insert a file
      await dbRun(db, 'INSERT INTO files (id, inode) VALUES (1, 12345)');

      // Insert initial create event with measurement
      await dbRun(db,
        'INSERT INTO events (id, timestamp, event_type_id, file_id, file_path, file_name, directory) VALUES (1, 1000, 2, 1, "/test/file.ts", "file.ts", "/test")'
      );
      await dbRun(db,
        'INSERT INTO measurements (event_id, inode, file_size, line_count, block_count) VALUES (1, 12345, 500, 50, 1)'
      );

      // Insert a delete event (event_type_id=4) -> should fire trigger
      await dbRun(db,
        'INSERT INTO events (id, timestamp, event_type_id, file_id, file_path, file_name, directory) VALUES (2, 2000, 4, 1, "/test/file.ts", "file.ts", "/test")'
      );

      const aggregates = await dbAll(db, 'SELECT * FROM aggregates WHERE file_id = 1');
      expect(aggregates).toHaveLength(1);
      expect(aggregates[0].total_events).toBe(2);
      expect(aggregates[0].total_creates).toBe(1);
      expect(aggregates[0].total_deletes).toBe(1);
    });

    it('should update aggregates when a move event is inserted', async () => {
      await triggerManager.createTriggers();

      await dbRun(db, 'INSERT INTO files (id, inode) VALUES (1, 12345)');
      await dbRun(db,
        'INSERT INTO events (id, timestamp, event_type_id, file_id, file_path, file_name, directory) VALUES (1, 1000, 2, 1, "/test/file.ts", "file.ts", "/test")'
      );
      await dbRun(db,
        'INSERT INTO measurements (event_id, inode, file_size, line_count, block_count) VALUES (1, 12345, 500, 50, 1)'
      );

      // Insert a move event (event_type_id=5) -> should fire trigger
      await dbRun(db,
        'INSERT INTO events (id, timestamp, event_type_id, file_id, file_path, file_name, directory) VALUES (2, 2000, 5, 1, "/test/moved.ts", "moved.ts", "/test")'
      );

      const aggregates = await dbAll(db, 'SELECT * FROM aggregates WHERE file_id = 1');
      expect(aggregates).toHaveLength(1);
      expect(aggregates[0].total_moves).toBe(1);
    });

    it('should NOT fire for non-delete/move events (e.g. find, create, modify)', async () => {
      await triggerManager.createTriggers();

      await dbRun(db, 'INSERT INTO files (id, inode) VALUES (1, 12345)');

      // Insert a find event (event_type_id=1) -> should NOT fire event trigger
      await dbRun(db,
        'INSERT INTO events (id, timestamp, event_type_id, file_id, file_path, file_name, directory) VALUES (1, 1000, 1, 1, "/test/file.ts", "file.ts", "/test")'
      );

      // No measurement inserted, so measurement trigger also shouldn't fire
      const aggregates = await dbAll(db, 'SELECT * FROM aggregates WHERE file_id = 1');
      expect(aggregates).toHaveLength(0);
    });

    it('should use COALESCE for delete/move events with no measurements', async () => {
      await triggerManager.createTriggers();

      await dbRun(db, 'INSERT INTO files (id, inode) VALUES (1, 12345)');

      // Insert delete event without any prior measurements
      await dbRun(db,
        'INSERT INTO events (id, timestamp, event_type_id, file_id, file_path, file_name, directory) VALUES (1, 1000, 4, 1, "/test/file.ts", "file.ts", "/test")'
      );

      const aggregates = await dbAll(db, 'SELECT * FROM aggregates WHERE file_id = 1');
      expect(aggregates).toHaveLength(1);
      // COALESCE should produce 0 instead of NULL
      expect(aggregates[0].first_size).toBe(0);
      expect(aggregates[0].max_size).toBe(0);
      expect(aggregates[0].last_size).toBe(0);
    });
  });

  describe('recreateTriggers', () => {
    it('should delegate to createTriggers', async () => {
      await triggerManager.recreateTriggers();

      const triggers = await dbAll(db,
        "SELECT name FROM sqlite_master WHERE type = 'trigger'"
      );
      expect(triggers).toHaveLength(2);
    });
  });
});
