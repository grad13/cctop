/**
 * Database integration tests
 * Tests Database and DatabaseReader integration and compatibility
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Database } from '../src/database';
import { DatabaseReader } from '../src/database-reader';
import { FileEvent } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

describe('Database Integration Tests', () => {
  const testDbPath = path.join(__dirname, 'test-integration.db');
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

  describe('Schema Compatibility', () => {
    it('should handle column name mapping between Database and DatabaseReader', async () => {
      // Test data using Database (uses file_size, inode_number)
      const testEvent: FileEvent = {
        eventType: 'create',
        filePath: '/test/file.txt',
        directory: '/test',
        fileName: 'file.txt',
        fileSize: 1024,
        timestamp: new Date(),
        inode: 123456
      };

      // Insert via Database with measurement data (FUNC-000 compliant)
      const measurement = {
        inode: 123456,
        fileSize: 1024,
        lineCount: 50,
        blockCount: 5
      };
      await database.insertEvent(testEvent, measurement);

      // Read via DatabaseReader (expects size, inode)
      await reader.connect();
      const events = await reader.getLatestEvents(1);

      expect(events).toHaveLength(1);
      const event = events[0];
      
      // Verify schema mapping works
      expect(event.filename).toBe('file.txt');
      expect(event.directory).toBe('/test');
      expect(event.event_type).toBe('create');
      
      // Check for potential column name issues
      // Database uses: file_size, inode_number
      // DatabaseReader expects: size, inode
      expect(event.size).toBeDefined();
      expect(event.inode).toBeDefined();
    });

    it('should maintain data consistency between write and read operations', async () => {
      const events: FileEvent[] = [
        {
          eventType: 'create',
          filePath: '/test/file1.txt',
          directory: '/test',
          fileName: 'file1.txt',
          fileSize: 100,
          timestamp: new Date('2025-07-08T08:00:00.000Z'),
          inode: 111
        },
        {
          eventType: 'modify',
          filePath: '/test/file1.txt',
          directory: '/test',
          fileName: 'file1.txt',
          fileSize: 200,
          timestamp: new Date('2025-07-08T08:01:00.000Z'),
          inode: 111
        }
      ];

      // Insert multiple events with measurement data (FUNC-000 compliant)
      for (const event of events) {
        const measurement = {
          inode: event.inode || 111,
          fileSize: event.fileSize || 1024,
          lineCount: 50,
          blockCount: 5
        };
        await database.insertEvent(event, measurement);
      }

      await reader.connect();
      
      // Test various read operations
      const latestEvents = await reader.getLatestEvents(10);
      expect(latestEvents).toHaveLength(2);

      const modifyEvents = await reader.getEventsByType('modify', 10);
      expect(modifyEvents).toHaveLength(1);
      expect(modifyEvents[0].event_type).toBe('modify');

      const directoryEvents = await reader.getDirectoryEvents('/test', 10);
      expect(directoryEvents).toHaveLength(2);

      const uniqueFiles = await reader.getUniqueFiles(10);
      expect(uniqueFiles).toHaveLength(1); // Same file, latest event only
      expect(uniqueFiles[0].event_type).toBe('modify'); // Should be the latest
    });
  });

  describe('Type System Integration', () => {
    it('should validate FileEvent to EventRow conversion', async () => {
      const fileEvent: FileEvent = {
        eventType: 'delete',
        filePath: '/test/deleted.txt',
        directory: '/test',
        fileName: 'deleted.txt',
        fileSize: 0,
        timestamp: new Date(),
        inode: 999
      };

      // For delete events, provide minimal measurement with inode (FUNC-000 compliant)
      const measurement = {
        inode: 999,
        fileSize: 0,
        lineCount: 0,
        blockCount: 0
      };
      await database.insertEvent(fileEvent, measurement);
      await reader.connect();
      
      const events = await reader.getLatestEvents(1);
      const eventRow = events[0];

      // Verify type conversion
      expect(eventRow.id).toBeDefined();
      expect(eventRow.timestamp).toBeDefined();
      expect(eventRow.filename).toBe(fileEvent.filename);
      expect(eventRow.directory).toBe(fileEvent.directory);
      expect(eventRow.event_type).toBe(fileEvent.eventType);
      expect(eventRow.elapsed_ms).toBeDefined();
    });
  });

  describe('Database Statistics Integration', () => {
    it('should provide consistent statistics across Database and aggregation', async () => {
      const testEvents: FileEvent[] = [
        {
          eventType: 'create',
          filePath: '/test/file1.txt',
          directory: '/test',
          fileName: 'file1.txt',
          fileSize: 500,
          timestamp: new Date(),
          inodeNumber: 1001
        },
        {
          eventType: 'create',
          filePath: '/test/file2.txt',
          directory: '/test',
          fileName: 'file2.txt',
          fileSize: 1000,
          timestamp: new Date(),
          inode: 1002
        },
        {
          eventType: 'modify',
          filePath: '/test/file1.txt',
          directory: '/test',
          fileName: 'file1.txt',
          fileSize: 750,
          timestamp: new Date(),
          inode: 1001
        }
      ];

      // Insert test events with measurement data (FUNC-000 compliant)
      for (const event of testEvents) {
        const measurement = {
          inode: event.inode || 1000,
          fileSize: event.fileSize || 1024,
          lineCount: 50,
          blockCount: 5
        };
        await database.insertEvent(event, measurement);
      }

      // Get statistics from Database
      const globalStats = await database.getGlobalStatistics();
      const eventTypeStats = await database.getEventTypeStatistics();

      // Verify reader count consistency
      await reader.connect();
      const totalCount = await reader.getEventCount();

      expect(totalCount).toBe(3);
      expect(globalStats.total_events).toBe(3);
      expect(eventTypeStats.some(stat => stat.event_type === 'create')).toBe(true);
      expect(eventTypeStats.some(stat => stat.event_type === 'modify')).toBe(true);
    });
  });

  describe('Error Handling Integration', () => {
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