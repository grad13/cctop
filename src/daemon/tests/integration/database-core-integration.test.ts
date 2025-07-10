/**
 * Database Core Integration Tests
 * Tests for Database and DatabaseReader classes moved from shared module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Database } from '../../src/database/database';
import { DatabaseReader } from '../../src/database/database-reader';
import { FileEvent } from '../../../shared/src/types';
import * as fs from 'fs';
import * as path from 'path';

describe('Database Core Integration Tests', () => {
  const testDbPath = path.join(__dirname, 'test-database-core.db');
  let database: Database;
  let reader: DatabaseReader;

  beforeEach(async () => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    database = new Database(testDbPath);
    reader = new DatabaseReader(testDbPath);
    
    await database.connect();
  });

  afterEach(async () => {
    await database.close();
    await reader.disconnect();
    
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Database and DatabaseReader Integration', () => {
    it('should handle complete write-read cycle', async () => {
      // Test data with FUNC-000 compliant measurement
      const testEvent: FileEvent = {
        eventType: 'create',
        filePath: '/test/file.txt',
        directory: '/test',
        fileName: 'file.txt',
        timestamp: new Date(),
        inode: 123456
      };

      const measurement = {
        inode: 123456,
        fileSize: 1024,
        lineCount: 50,
        blockCount: 5
      };

      // Insert via Database
      await database.insertEvent(testEvent, measurement);

      // Read via DatabaseReader
      await reader.connect();
      const events = await reader.getLatestEvents(1);

      expect(events).toHaveLength(1);
      const event = events[0];
      
      expect(event.filename).toBe('file.txt');
      expect(event.directory).toBe('/test');
      expect(event.event_type).toBe('create');
      expect(event.size).toBe(1024);
      expect(event.inode).toBe(123456);
    });

    it('should handle multiple event types correctly', async () => {
      const events: FileEvent[] = [
        {
          eventType: 'create',
          filePath: '/test/file1.txt',
          directory: '/test',
          fileName: 'file1.txt',
          timestamp: new Date('2025-07-08T08:00:00.000Z'),
          inode: 111
        },
        {
          eventType: 'modify',
          filePath: '/test/file1.txt',
          directory: '/test',
          fileName: 'file1.txt',
          timestamp: new Date('2025-07-08T08:01:00.000Z'),
          inode: 111
        },
        {
          eventType: 'delete',
          filePath: '/test/file2.txt',
          directory: '/test',
          fileName: 'file2.txt',
          timestamp: new Date('2025-07-08T08:02:00.000Z'),
          inode: 222
        }
      ];

      // Insert multiple events with measurements
      for (const event of events) {
        const measurement = {
          inode: event.inode || 111,
          fileSize: 1024,
          lineCount: 50,
          blockCount: 5
        };
        await database.insertEvent(event, measurement);
      }

      await reader.connect();
      
      // Test event type filtering
      const modifyEvents = await reader.getEventsByType('modify', 10);
      expect(modifyEvents).toHaveLength(1);
      expect(modifyEvents[0].event_type).toBe('modify');

      const deleteEvents = await reader.getEventsByType('delete', 10);
      expect(deleteEvents).toHaveLength(1);
      expect(deleteEvents[0].event_type).toBe('delete');

      // Test latest events
      const latestEvents = await reader.getLatestEvents(10);
      expect(latestEvents).toHaveLength(3);
    });

    it('should provide accurate event counts', async () => {
      // Insert test events
      const testEvents = [
        { eventType: 'find' as any, filePath: '/a.txt', directory: '/', fileName: 'a.txt', timestamp: new Date(), inode: 1 },
        { eventType: 'create' as any, filePath: '/b.txt', directory: '/', fileName: 'b.txt', timestamp: new Date(), inode: 2 },
        { eventType: 'modify' as any, filePath: '/c.txt', directory: '/', fileName: 'c.txt', timestamp: new Date(), inode: 3 }
      ];

      for (const event of testEvents) {
        const measurement = {
          inode: event.inode,
          fileSize: 1024,
          lineCount: 50,
          blockCount: 5
        };
        await database.insertEvent(event, measurement);
      }

      // Get event count from both Database and DatabaseReader
      const globalStats = await database.getGlobalStatistics();
      
      await reader.connect();
      const totalCount = await reader.getEventCount();

      expect(totalCount).toBe(3);
      expect(globalStats.total_events).toBe(3);
    });
  });

  describe('FUNC-000 Schema Compliance', () => {
    it('should create proper normalized schema', async () => {
      const connection = database.getConnection();
      expect(connection).toBeDefined();

      // Check that all required tables exist
      const checkTableSQL = `
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name IN ('events', 'event_types', 'files', 'measurements', 'aggregates')
        ORDER BY name
      `;
      
      const tables = await new Promise<string[]>((resolve, reject) => {
        connection!.all(checkTableSQL, [], (err: Error | null, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows.map(row => row.name));
        });
      });
      
      expect(tables).toEqual(['aggregates', 'event_types', 'events', 'files', 'measurements']);
    });

    it('should have event_types pre-populated with correct codes', async () => {
      const connection = database.getConnection();
      
      const eventTypesSQL = 'SELECT code FROM event_types ORDER BY code';
      const eventTypes = await new Promise<string[]>((resolve, reject) => {
        connection!.all(eventTypesSQL, [], (err: Error | null, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows.map(row => row.code));
        });
      });
      
      expect(eventTypes).toEqual(['create', 'delete', 'find', 'modify', 'move', 'restore']);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      const invalidReader = new DatabaseReader('/invalid/path/nonexistent.db');
      
      await expect(invalidReader.connect()).rejects.toThrow();
    });

    it('should handle operations on disconnected database', async () => {
      await reader.connect();
      await reader.disconnect();
      
      await expect(reader.getLatestEvents(1)).rejects.toThrow('Database not connected');
    });
  });
});