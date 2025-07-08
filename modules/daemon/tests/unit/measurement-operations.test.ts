/**
 * MeasurementOperations Integration Tests
 * FUNC-000準拠のmeasurements テーブル操作テスト
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Database } from '../../../shared/dist/index';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('MeasurementOperations', () => {
  let db: Database;
  let tempDbPath: string;

  beforeEach(async () => {
    // Create temporary database
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'measurement-ops-test-'));
    tempDbPath = path.join(tempDir, 'test.db');
    
    db = new Database(tempDbPath);
    await db.connect();
    
    // Insert test events with measurements
    await db.insertEvent({
      eventType: 'create',
      filePath: '/test/file1.txt',
      directory: '/test',
      fileName: 'file1.txt',
      timestamp: new Date()
    }, {
      eventId: 0,
      inode: 12345,
      fileSize: 1024,
      lineCount: 100,
      blockCount: 2
    });
    
    await db.insertEvent({
      eventType: 'modify',
      filePath: '/test/file2.txt',
      directory: '/test',
      fileName: 'file2.txt',
      timestamp: new Date()
    }, {
      eventId: 0,
      inode: 23456,
      fileSize: 2048,
      lineCount: 200,
      blockCount: 4
    });
  });

  afterEach(async () => {
    await db.close();
    
    // Clean up temp database
    try {
      await fs.unlink(tempDbPath);
      await fs.rmdir(path.dirname(tempDbPath));
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('Insert Measurements', () => {
    it('should insert measurement data successfully', async () => {
      // Create a new event without measurement first
      const eventId = await new Promise<number>((resolve, reject) => {
        db.getConnection().run(
          `INSERT INTO events (timestamp, event_type_id, file_id, file_path, file_name, directory)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [Math.floor(Date.now() / 1000), 1, 1, '/test/file3.txt', 'file3.txt', '/test'],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });
      
      const measurement = {
        inode: 12345,
        fileSize: 1024,
        lineCount: 25,
        blockCount: 2
      };
      
      await db.insertMeasurement(eventId, measurement);
      
      const retrieved = await db.getMeasurementByEventId(eventId);
      expect(retrieved).toBeDefined();
      expect(retrieved!.inode).toBe(12345);
      expect(retrieved!.fileSize).toBe(1024);
      expect(retrieved!.lineCount).toBe(25);
      expect(retrieved!.blockCount).toBe(2);
    });

    it('should handle multiple measurements for different events', async () => {
      // The measurements were already inserted in beforeEach, so just verify them
      const events = await db.getRecentEvents(2);
      
      const measurement1 = await db.getMeasurementByEventId(events[0].id!);
      const measurement2 = await db.getMeasurementByEventId(events[1].id!);
      
      expect(measurement1).toBeDefined();
      expect(measurement1!.lineCount).toBe(200); // file2.txt was inserted last
      expect(measurement1!.fileSize).toBe(2048);
      
      expect(measurement2).toBeDefined();
      expect(measurement2!.lineCount).toBe(100); // file1.txt
      expect(measurement2!.fileSize).toBe(1024);
    });
  });

  describe('Retrieve Measurements', () => {
    // No need for beforeEach - measurements already inserted in parent beforeEach

    it('should retrieve measurements by file path', async () => {
      const measurements = await db.getMeasurementsByFilePath('/test/file1.txt');
      
      expect(measurements).toHaveLength(1);
      expect(measurements[0].lineCount).toBe(100); // As set in parent beforeEach
      expect(measurements[0].blockCount).toBe(2);
    });

    it('should return empty array for non-existent file', async () => {
      const measurements = await db.getMeasurementsByFilePath('/non/existent/file.txt');
      
      expect(measurements).toHaveLength(0);
    });

    it('should return null for non-existent event ID', async () => {
      const measurement = await db.getMeasurementByEventId(99999);
      
      expect(measurement).toBeNull();
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      // Add one more test event with measurement
      await db.insertEvent({
        eventType: 'create',
        filePath: '/test/file3.txt',
        directory: '/test',
        fileName: 'file3.txt',
        timestamp: new Date()
      }, {
        eventId: 0,
        inode: 34567,
        fileSize: 512,
        lineCount: 50,
        blockCount: 1
      });
    });

    it('should calculate measurement statistics correctly', async () => {
      const stats = await db.getMeasurementStatistics();
      
      expect(stats.totalMeasurements).toBe(3);
      expect(stats.totalLines).toBe(350); // 100 + 200 + 50
      expect(stats.totalBlocks).toBe(7); // 2 + 4 + 1
      expect(stats.binaryFiles).toBe(0); // All have line counts > 0
      expect(stats.textFiles).toBe(3);
      expect(stats.averageLines).toBeCloseTo(116.67, 1); // 350 / 3 text files
      expect(stats.averageBlocks).toBeCloseTo(2.33, 1); // 7 / 3 files
    });

    it('should handle empty measurements table', async () => {
      // Create new clean database
      await db.close();
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'empty-test-'));
      const emptyDbPath = path.join(tempDir, 'empty.db');
      
      const emptyDb = new Database(emptyDbPath);
      await emptyDb.connect();
      
      const stats = await emptyDb.getMeasurementStatistics();
      
      expect(stats.totalMeasurements).toBe(0);
      expect(stats.totalLines).toBe(0);
      expect(stats.totalBlocks).toBe(0);
      expect(stats.binaryFiles).toBe(0);
      expect(stats.textFiles).toBe(0);
      
      await emptyDb.close();
      await fs.unlink(emptyDbPath);
      await fs.rmdir(tempDir);
    });
  });

  describe('Top Files Queries', () => {
    beforeEach(async () => {
      // Create multiple files with different measurements
      const testFiles = [
        { path: '/test/large.txt', lines: 1000, blocks: 10 },
        { path: '/test/medium.txt', lines: 500, blocks: 5 },
        { path: '/test/small.txt', lines: 100, blocks: 1 },
        { path: '/test/binary.bin', lines: 0, blocks: 20 } // Large binary
      ];
      
      for (const file of testFiles) {
        await db.insertEvent({
          eventType: 'create',
          filePath: file.path,
          directory: path.dirname(file.path),
          fileName: path.basename(file.path),
          timestamp: new Date()
        }, {
          eventId: 0,
          inode: Math.floor(Math.random() * 100000),
          fileSize: file.blocks * 512,
          lineCount: file.lines,
          blockCount: file.blocks
        });
      }
    });

    it('should return top files by line count', async () => {
      const topFiles = await db.getTopFilesByLines(3);
      
      expect(topFiles).toHaveLength(3); // Should exclude binary files
      expect(topFiles[0].filePath).toBe('/test/large.txt');
      expect(topFiles[0].lineCount).toBe(1000);
      expect(topFiles[1].filePath).toBe('/test/medium.txt');
      expect(topFiles[2].filePath).toBe('/test/file2.txt'); // 200 lines
    });

    it('should return top files by block count', async () => {
      const topFiles = await db.getTopFilesByBlocks(3);
      
      expect(topFiles).toHaveLength(3);
      expect(topFiles[0].filePath).toBe('/test/binary.bin');
      expect(topFiles[0].blockCount).toBe(20);
      expect(topFiles[1].filePath).toBe('/test/large.txt');
      expect(topFiles[1].blockCount).toBe(10);
    });

    it('should respect limit parameter', async () => {
      const topFiles = await db.getTopFilesByLines(2);
      
      expect(topFiles).toHaveLength(2);
      expect(topFiles[0].lineCount).toBe(1000);
      expect(topFiles[1].lineCount).toBe(500);
    });
  });

  describe('Error Handling', () => {
    it('should handle foreign key constraint violation', async () => {
      // Try to insert measurement with non-existent event_id
      const invalidMeasurement = {
        inode: 99999,
        fileSize: 1024,
        lineCount: 100,
        blockCount: 1
      };
      
      await expect(db.insertMeasurement(99999, invalidMeasurement))
        .rejects.toThrow();
    });

    it('should handle database connection issues gracefully', async () => {
      await db.close();
      
      await expect(db.getMeasurementStatistics())
        .rejects.toThrow('Database not connected');
    });
  });
});