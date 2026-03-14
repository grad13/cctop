import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import sqlite3 from 'sqlite3';
import { EventOperations } from '../../src/database/EventOperations.js';
import { SchemaManager } from '../../src/database/SchemaManager.js';
import { FileEvent, EventMeasurement } from '../../src/database/types.js';

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

function makeEvent(overrides: Partial<FileEvent> = {}): FileEvent {
  return {
    eventType: 'create',
    filePath: '/test/file.ts',
    directory: '/test',
    fileName: 'file.ts',
    timestamp: new Date(1000000000000),
    ...overrides,
  };
}

function makeMeasurement(overrides: Partial<EventMeasurement> = {}): EventMeasurement {
  return {
    inode: 12345,
    fileSize: 500,
    lineCount: 50,
    blockCount: 1,
    ...overrides,
  };
}

describe('EventOperations', () => {
  let db: sqlite3.Database;
  let ops: EventOperations;

  beforeEach(async () => {
    db = await openMemoryDb();
    const schema = new SchemaManager(db);
    await schema.initializeSchema();
    ops = new EventOperations(db);
  });

  afterEach(async () => {
    await closeDb(db);
  });

  describe('ensureEventTypesLoaded (via insertEvent)', () => {
    it('should load event types from DB on first insert', async () => {
      const eventId = await ops.insertEvent(makeEvent(), makeMeasurement());
      expect(eventId).toBeGreaterThan(0);
    });

    it('should use cached event types on second insert', async () => {
      await ops.insertEvent(makeEvent(), makeMeasurement());
      const eventId = await ops.insertEvent(
        makeEvent({ filePath: '/test/file2.ts', fileName: 'file2.ts' }),
        makeMeasurement({ inode: 99999 })
      );
      expect(eventId).toBeGreaterThan(0);
    });

    it('should clear cache when clearCache is called', async () => {
      await ops.insertEvent(makeEvent(), makeMeasurement());
      ops.clearCache();
      // Should reload from DB
      const eventId = await ops.insertEvent(
        makeEvent({ eventType: 'modify' }),
        makeMeasurement()
      );
      expect(eventId).toBeGreaterThan(0);
    });
  });

  describe('insertEvent - create', () => {
    it('should insert file, event, and measurement', async () => {
      const eventId = await ops.insertEvent(makeEvent(), makeMeasurement());

      const files = await dbAll(db, 'SELECT * FROM files');
      expect(files).toHaveLength(1);
      expect(files[0].inode).toBe(12345);
      expect(files[0].is_active).toBe(1);

      const events = await dbAll(db, 'SELECT * FROM events');
      expect(events).toHaveLength(1);
      expect(events[0].event_type_id).toBe(2); // create

      const measurements = await dbAll(db, 'SELECT * FROM measurements');
      expect(measurements).toHaveLength(1);
      expect(measurements[0].event_id).toBe(eventId);
      expect(measurements[0].file_size).toBe(500);
    });
  });

  describe('insertEvent - modify', () => {
    it('should reuse existing file record by inode', async () => {
      await ops.insertEvent(makeEvent(), makeMeasurement());
      await ops.insertEvent(
        makeEvent({ eventType: 'modify' }),
        makeMeasurement({ fileSize: 600 })
      );

      const files = await dbAll(db, 'SELECT * FROM files');
      expect(files).toHaveLength(1);

      const events = await dbAll(db, 'SELECT * FROM events');
      expect(events).toHaveLength(2);
    });
  });

  describe('insertEvent - delete', () => {
    it('should insert event without measurement', async () => {
      // First create the file
      await ops.insertEvent(makeEvent(), makeMeasurement());

      // Then delete it
      const eventId = await ops.insertEvent(
        makeEvent({ eventType: 'delete' }),
        makeMeasurement()
      );
      expect(eventId).toBeGreaterThan(0);

      const events = await dbAll(db, 'SELECT * FROM events WHERE event_type_id = 4');
      expect(events).toHaveLength(1);

      // delete events should NOT have measurements
      const measurements = await dbAll(db, 'SELECT * FROM measurements WHERE event_id = ?', [eventId]);
      expect(measurements).toHaveLength(0);

      // File should be marked inactive
      const files = await dbAll(db, 'SELECT * FROM files');
      expect(files[0].is_active).toBe(0);
    });
  });

  describe('insertEvent - move', () => {
    it('should insert event without measurement', async () => {
      await ops.insertEvent(makeEvent(), makeMeasurement());

      const eventId = await ops.insertEvent(
        makeEvent({ eventType: 'move', filePath: '/test/moved.ts', fileName: 'moved.ts' }),
        makeMeasurement()
      );

      const measurements = await dbAll(db, 'SELECT * FROM measurements WHERE event_id = ?', [eventId]);
      expect(measurements).toHaveLength(0);
    });
  });

  describe('insertEvent - find', () => {
    it('should skip insertion if file already exists', async () => {
      await ops.insertEvent(makeEvent(), makeMeasurement());

      // Find event for same inode - should skip
      const result = await ops.insertEvent(
        makeEvent({ eventType: 'find' }),
        makeMeasurement()
      );

      // Should return file_id, not event_id
      const events = await dbAll(db, 'SELECT * FROM events');
      expect(events).toHaveLength(1); // Only the original create event
    });

    it('should insert if file does not exist yet', async () => {
      const result = await ops.insertEvent(
        makeEvent({ eventType: 'find' }),
        makeMeasurement()
      );
      expect(result).toBeGreaterThan(0);

      const events = await dbAll(db, 'SELECT * FROM events');
      expect(events).toHaveLength(1);
    });
  });

  describe('insertEvent - validation', () => {
    it('should reject when measurement is missing for create event', async () => {
      await expect(ops.insertEvent(makeEvent())).rejects.toThrow('Measurement with inode is required');
    });

    it('should reject when inode is missing for delete event', async () => {
      await expect(
        ops.insertEvent(makeEvent({ eventType: 'delete' }), { inode: 0, fileSize: 0 } as any)
      ).rejects.toThrow('inode is required');
    });

    it('should reject for unknown event type', async () => {
      await expect(
        ops.insertEvent(makeEvent({ eventType: 'unknown' as any }), makeMeasurement())
      ).rejects.toThrow('Unknown event type');
    });
  });

  describe('getRecentEvents', () => {
    it('should return events in descending timestamp order', async () => {
      await ops.insertEvent(
        makeEvent({ timestamp: new Date(1000000000000) }),
        makeMeasurement()
      );
      await ops.insertEvent(
        makeEvent({ eventType: 'modify', timestamp: new Date(2000000000000) }),
        makeMeasurement()
      );

      const events = await ops.getRecentEvents(10);
      expect(events).toHaveLength(2);
      expect(events[0].timestamp.getTime()).toBeGreaterThan(events[1].timestamp.getTime());
    });

    it('should filter by filePath when provided', async () => {
      await ops.insertEvent(makeEvent(), makeMeasurement());
      await ops.insertEvent(
        makeEvent({ filePath: '/other/file.ts', fileName: 'file.ts' }),
        makeMeasurement({ inode: 99999 })
      );

      const events = await ops.getRecentEvents(10, '/test/file.ts');
      expect(events).toHaveLength(1);
      expect(events[0].filePath).toBe('/test/file.ts');
    });
  });

  describe('getEventById', () => {
    it('should return event by id', async () => {
      const eventId = await ops.insertEvent(makeEvent(), makeMeasurement());
      const event = await ops.getEventById(eventId);
      expect(event).not.toBeNull();
      expect(event!.filePath).toBe('/test/file.ts');
    });

    it('should return null for non-existent id', async () => {
      const event = await ops.getEventById(99999);
      expect(event).toBeNull();
    });
  });
});
