/**
 * FUNC-000 Measurement Integration Tests
 * FileEventHandler + MeasurementCalculator + Database の統合テスト
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Database } from '../../../shared/dist/index';
import { FileEventHandler } from '../../src/events/FileEventHandler';
import { LogManager } from '../../src/logging/LogManager';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('FUNC-000 Measurement Integration', () => {
  let db: Database;
  let handler: FileEventHandler;
  let logger: LogManager;
  let tempDir: string;
  let tempDbPath: string;
  let tempFiles: string[] = [];

  beforeEach(async () => {
    // Create temporary database and directory
    const testTempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'func000-integration-test-'));
    tempDbPath = path.join(testTempDir, 'test.db');
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-files-'));
    
    // Initialize components
    db = new Database(tempDbPath);
    await db.connect();
    
    logger = new LogManager('/tmp/integration-test.log', 'info');
    handler = new FileEventHandler(db, logger);
  });

  afterEach(async () => {
    await handler.cleanup();
    if (db && db.isConnected()) {
      db.clearCache(); // Clear event type cache
      await db.close();
    }
    
    // Clean up temp files and directories
    for (const file of tempFiles) {
      try {
        await fs.unlink(file);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    tempFiles = [];
    
    try {
      await fs.rmdir(tempDir);
      await fs.unlink(tempDbPath);
      await fs.rmdir(path.dirname(tempDbPath));
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  const createTestFile = async (content: string, filename: string): Promise<string> => {
    const filePath = path.join(tempDir, filename);
    await fs.writeFile(filePath, content);
    tempFiles.push(filePath);
    return filePath;
  };

  describe('Create Event with Measurement Calculation', () => {
    it('should automatically calculate measurements for text files on create', async () => {
      const content = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
      const filePath = await createTestFile(content, 'test-text.txt');
      
      // Handle create event
      await handler.handleFileEvent('create', filePath);
      
      // Wait a bit for async measurement calculation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify event was recorded
      const events = await db.getRecentEvents(1, filePath);
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('create');
      expect(events[0].filePath).toBe(filePath);
      
      // Verify measurement was calculated
      const measurement = await db.getMeasurementByEventId(events[0].id!);
      expect(measurement).toBeDefined();
      expect(measurement!.lineCount).toBe(5);
      expect(measurement!.blockCount).toBeGreaterThan(0);
      expect(measurement!.inode).toBeDefined();
      expect(measurement!.inode).toBeGreaterThan(0);
    });

    it('should automatically calculate measurements for binary files on create', async () => {
      const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
      const filePath = path.join(tempDir, 'test-binary.bin');
      await fs.writeFile(filePath, binaryContent);
      tempFiles.push(filePath);
      
      // Handle create event
      await handler.handleFileEvent('create', filePath);
      
      // Wait a bit for async measurement calculation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify event was recorded
      const events = await db.getRecentEvents(1, filePath);
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('create');
      
      // Verify measurement was calculated (binary files should have 0 line count)
      const measurement = await db.getMeasurementByEventId(events[0].id!);
      expect(measurement).toBeDefined();
      expect(measurement!.lineCount).toBe(0); // Binary file
      expect(measurement!.blockCount).toBe(1); // 8 bytes = 1 block
    });

    it('should calculate measurements for large text files correctly', async () => {
      const lines = Array.from({length: 1000}, (_, i) => `Line ${i + 1}`);
      const content = lines.join('\n');
      const filePath = await createTestFile(content, 'large-text.txt');
      
      // Handle create event
      await handler.handleFileEvent('create', filePath);
      
      // Wait a bit for async measurement calculation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify measurement
      const events = await db.getRecentEvents(1, filePath);
      const measurement = await db.getMeasurementByEventId(events[0].id!);
      
      expect(measurement!.lineCount).toBe(1000);
      expect(measurement!.blockCount).toBeGreaterThan(1); // Large file should use multiple blocks
    });
  });

  describe('Modify Event with Measurement Calculation', () => {
    it('should recalculate measurements on file modification', async () => {
      const initialContent = 'Line 1\nLine 2';
      const filePath = await createTestFile(initialContent, 'modifiable.txt');
      
      // Handle initial create event
      await handler.handleFileEvent('create', filePath);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Wait a bit more to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Modify the file
      const modifiedContent = 'Line 1\nLine 2\nLine 3\nLine 4';
      await fs.writeFile(filePath, modifiedContent);
      
      // Handle modify event
      await handler.handleFileEvent('modify', filePath);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify we have 2 events
      const events = await db.getRecentEvents(10, filePath);
      expect(events).toHaveLength(2);
      expect(events[0].eventType).toBe('modify'); // Most recent
      expect(events[1].eventType).toBe('create');
      
      // Verify measurements for both events
      const createMeasurement = await db.getMeasurementByEventId(events[1].id!);
      const modifyMeasurement = await db.getMeasurementByEventId(events[0].id!);
      
      expect(createMeasurement!.lineCount).toBe(2);
      expect(modifyMeasurement!.lineCount).toBe(4);
    });
  });

  describe('Event Types Without Measurements', () => {
    it('should not calculate measurements for delete events', async () => {
      const filePath = await createTestFile('Test content', 'to-delete.txt');
      
      // Handle delete event
      await handler.handleFileEvent('delete', filePath, 12345);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify event was recorded but no measurement
      const events = await db.getRecentEvents(1, filePath);
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('delete');
      
      const measurement = await db.getMeasurementByEventId(events[0].id!);
      expect(measurement).toBeNull(); // No measurement for delete events
    });

    it('should not calculate measurements for move events', async () => {
      const srcPath = await createTestFile('Test content', 'to-move.txt');
      const destPath = path.join(tempDir, 'moved.txt');
      
      // Get inode before move
      const stats = await fs.stat(srcPath);
      const inode = stats.ino;
      
      // Actually move the file
      await fs.rename(srcPath, destPath);
      
      // Handle move event with proper inode
      await handler.handleFileEvent('move', destPath, inode);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify event was recorded but no measurement
      const events = await db.getRecentEvents(1, destPath);
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('move');
      
      const measurement = await db.getMeasurementByEventId(events[0].id!);
      console.log('Move event measurement:', measurement);
      expect(measurement).toBeNull(); // No measurement for move events
    });
  });

  describe('Measurement Statistics Integration', () => {
    it('should provide comprehensive statistics after multiple file operations', async () => {
      // Create multiple files with different characteristics
      const textFile1 = await createTestFile('Line 1\nLine 2\nLine 3', 'stats-text1.txt');
      const textFile2 = await createTestFile('Single line', 'stats-text2.txt');
      
      // Create binary file
      const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      const binaryPath = path.join(tempDir, 'stats-binary.bin');
      await fs.writeFile(binaryPath, binaryContent);
      tempFiles.push(binaryPath);
      
      // Handle create events
      await handler.handleFileEvent('create', textFile1);
      await handler.handleFileEvent('create', textFile2);
      await handler.handleFileEvent('create', binaryPath);
      
      // Wait for async calculations
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Get measurement statistics
      const stats = await db.getMeasurementStatistics();
      
      expect(stats.totalMeasurements).toBe(3);
      expect(stats.totalLines).toBe(4); // 3 + 1 + 0
      expect(stats.textFiles).toBe(2);
      expect(stats.binaryFiles).toBe(1);
      expect(stats.averageLines).toBe(2); // 4 lines / 2 text files
      expect(stats.totalBlocks).toBeGreaterThan(0);
    });

    it('should provide top files by line count', async () => {
      // Create files with different line counts
      const smallFile = await createTestFile('Line 1', 'small.txt');
      const mediumFile = await createTestFile('Line 1\nLine 2\nLine 3\nLine 4\nLine 5', 'medium.txt');
      const largeFile = await createTestFile(
        Array.from({length: 10}, (_, i) => `Line ${i + 1}`).join('\n'),
        'large.txt'
      );
      
      // Handle create events
      await handler.handleFileEvent('create', smallFile);
      await handler.handleFileEvent('create', mediumFile);
      await handler.handleFileEvent('create', largeFile);
      
      // Wait for async calculations
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Get top files by line count
      const topFiles = await db.getTopFilesByLines(3);
      
      expect(topFiles).toHaveLength(3);
      expect(topFiles[0].lineCount).toBe(10); // largest file first
      expect(topFiles[1].lineCount).toBe(5);
      expect(topFiles[2].lineCount).toBe(1);
      expect(topFiles[0].filePath).toBe(largeFile);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle measurement calculation errors gracefully', async () => {
      const nonExistentPath = path.join(tempDir, 'non-existent.txt');
      
      // This should not throw, but should handle the error gracefully
      await expect(handler.handleFileEvent('create', nonExistentPath)).resolves.not.toThrow();
      
      // Event might be recorded with default values, but no measurement
      const events = await db.getRecentEvents(1, nonExistentPath);
      if (events.length > 0) {
        const measurement = await db.getMeasurementByEventId(events[0].id!);
        // Either no measurement, or measurement with 0 values
        expect(measurement === null || (measurement.lineCount === 0 && measurement.blockCount === 0)).toBe(true);
      }
    });

    it('should continue working after measurement calculation failures', async () => {
      const nonExistentPath = path.join(tempDir, 'non-existent.txt');
      const validPath = await createTestFile('Valid content\nLine 2', 'valid.txt');
      
      // Try to handle non-existent file
      await handler.handleFileEvent('create', nonExistentPath);
      
      // Then handle valid file - should still work
      await handler.handleFileEvent('create', validPath);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify valid file was processed correctly
      const events = await db.getRecentEvents(1, validPath);
      expect(events).toHaveLength(1);
      
      const measurement = await db.getMeasurementByEventId(events[0].id!);
      expect(measurement).toBeDefined();
      expect(measurement!.lineCount).toBe(2);
    });
  });

  describe('FUNC-000 Compliance Verification', () => {
    it('should store measurements with proper foreign key relationships', async () => {
      const filePath = await createTestFile('Test\nContent', 'fk-test.txt');
      
      await handler.handleFileEvent('create', filePath);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify foreign key relationship works
      const events = await db.getRecentEvents(1, filePath);
      const measurement = await db.getMeasurementByEventId(events[0].id!);
      
      expect(measurement).toBeDefined();
      
      // Try to get measurements by file path (tests JOIN query)
      const measurements = await db.getMeasurementsByFilePath(filePath);
      expect(measurements).toHaveLength(1);
      expect(measurements[0].lineCount).toBe(measurement!.lineCount);
    });

    it('should maintain data integrity across multiple operations', async () => {
      const filePath = await createTestFile('Initial content', 'integrity-test.txt');
      
      // Create, modify, then verify data integrity
      await handler.handleFileEvent('create', filePath);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Wait to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      await fs.writeFile(filePath, 'Modified\ncontent\nwith\nmore\nlines');
      await handler.handleFileEvent('modify', filePath);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify all measurements are properly linked
      const measurements = await db.getMeasurementsByFilePath(filePath);
      expect(measurements).toHaveLength(2);
      
      // Verify measurements are ordered by timestamp (most recent first)
      expect(measurements[0].lineCount).toBe(5); // modify event
      expect(measurements[1].lineCount).toBe(1); // create event
      
      // Verify statistics include all measurements
      const stats = await db.getMeasurementStatistics();
      expect(stats.totalMeasurements).toBeGreaterThanOrEqual(2);
    });
  });
});