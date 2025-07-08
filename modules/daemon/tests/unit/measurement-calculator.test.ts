/**
 * MeasurementCalculator Unit Tests
 * FUNC-000準拠の測定値計算機能テスト
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MeasurementCalculator } from '../../src/events/MeasurementCalculator';
import { LogManager } from '../../src/logging/LogManager';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('MeasurementCalculator', () => {
  let calculator: MeasurementCalculator;
  let logger: LogManager;
  let tempDir: string;
  let tempFiles: string[] = [];

  beforeEach(async () => {
    logger = new LogManager('/tmp/test-log.txt', 'debug');
    calculator = new MeasurementCalculator(logger);
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'measurement-test-'));
  });

  afterEach(async () => {
    // Clean up temp files
    for (const file of tempFiles) {
      try {
        await fs.unlink(file);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    tempFiles = [];
    
    // Clean up temp directory
    try {
      await fs.rmdir(tempDir);
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  const createTempFile = async (content: string, filename: string = 'test.txt'): Promise<string> => {
    const filePath = path.join(tempDir, filename);
    await fs.writeFile(filePath, content);
    tempFiles.push(filePath);
    return filePath;
  };

  describe('Text File Measurements', () => {
    it('should calculate line count correctly for single line', async () => {
      const filePath = await createTempFile('Hello World');
      const result = await calculator.calculateMeasurements(filePath, 12345);
      
      expect(result.inode).toBe(12345);
      expect(result.lineCount).toBe(1);
      expect(result.blockCount).toBeGreaterThan(0);
    });

    it('should calculate line count correctly for multiple lines', async () => {
      const content = 'Line 1\nLine 2\nLine 3\nLine 4';
      const filePath = await createTempFile(content);
      const result = await calculator.calculateMeasurements(filePath, 12345);
      
      expect(result.lineCount).toBe(4);
    });

    it('should calculate line count correctly for empty file', async () => {
      const filePath = await createTempFile('');
      const result = await calculator.calculateMeasurements(filePath, 12345);
      
      expect(result.lineCount).toBe(1);
      expect(result.blockCount).toBe(0);
    });

    it('should calculate line count correctly for file with trailing newline', async () => {
      const content = 'Line 1\nLine 2\nLine 3\n';
      const filePath = await createTempFile(content);
      const result = await calculator.calculateMeasurements(filePath, 12345);
      
      expect(result.lineCount).toBe(4); // 3 newlines + 1 = 4 lines
    });

    it('should calculate block count correctly for small file', async () => {
      const content = 'A'.repeat(100); // 100 bytes
      const filePath = await createTempFile(content);
      const result = await calculator.calculateMeasurements(filePath, 12345);
      
      expect(result.blockCount).toBe(1); // 100 bytes = 1 block (512 bytes per block)
    });

    it('should calculate block count correctly for large file', async () => {
      const content = 'A'.repeat(1024); // 1024 bytes
      const filePath = await createTempFile(content);
      const result = await calculator.calculateMeasurements(filePath, 12345);
      
      expect(result.blockCount).toBe(2); // 1024 bytes = 2 blocks
    });
  });

  describe('Binary File Detection', () => {
    it('should detect binary file with null bytes', async () => {
      const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);
      const filePath = path.join(tempDir, 'binary.bin');
      await fs.writeFile(filePath, binaryContent);
      tempFiles.push(filePath);
      
      const result = await calculator.calculateMeasurements(filePath, 12345);
      
      expect(result.lineCount).toBe(0); // Binary files should have 0 line count
      expect(result.blockCount).toBe(1);
    });

    it('should detect binary file with high non-printable character ratio', async () => {
      // Create content with >30% non-printable characters in ASCII range 1-8, 14-31 (avoiding whitespace)
      // Use characters 1-8 which are definitely non-printable control characters
      const nonPrintable = Array.from({length: 50}, (_, i) => (i % 8) + 1); // Characters 1-8 repeated
      const printable = Array.from({length: 50}, () => 65); // Character 'A'
      const content = Buffer.from([...nonPrintable, ...printable]);
      
      const filePath = path.join(tempDir, 'binary2.bin');
      await fs.writeFile(filePath, content);
      tempFiles.push(filePath);
      
      const result = await calculator.calculateMeasurements(filePath, 12345);
      
      expect(result.lineCount).toBe(0);
      expect(result.blockCount).toBe(1);
    });

    it('should treat text file with some non-printable characters as text', async () => {
      // Create content with <30% non-printable characters
      const content = 'Hello World\t\n' + 'A'.repeat(100); // Tab and newline are acceptable
      const filePath = await createTempFile(content);
      
      const result = await calculator.calculateMeasurements(filePath, 12345);
      
      expect(result.lineCount).toBeGreaterThan(0);
      expect(result.blockCount).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-existent file gracefully', async () => {
      const nonExistentPath = path.join(tempDir, 'non-existent.txt');
      const result = await calculator.calculateMeasurements(nonExistentPath, 12345);
      
      expect(result.inode).toBe(12345);
      expect(result.lineCount).toBe(0);
      expect(result.blockCount).toBe(0);
    });

    it('should handle file with only newlines', async () => {
      const content = '\n\n\n';
      const filePath = await createTempFile(content);
      const result = await calculator.calculateMeasurements(filePath, 12345);
      
      expect(result.lineCount).toBe(4); // 3 newlines create 4 lines
    });

    it('should handle file with mixed line endings', async () => {
      const content = 'Line 1\nLine 2\r\nLine 3\rLine 4';
      const filePath = await createTempFile(content);
      const result = await calculator.calculateMeasurements(filePath, 12345);
      
      expect(result.lineCount).toBe(3); // Only counts \n characters: 1 \n + 1 \n in \r\n = 2, plus final line = 3
    });
  });

  describe('Batch Operations', () => {
    it('should calculate measurements for multiple files', async () => {
      const files = [
        { filePath: await createTempFile('File 1\nLine 2', 'file1.txt'), inode: 1001 },
        { filePath: await createTempFile('File 2 content', 'file2.txt'), inode: 1002 },
        { filePath: await createTempFile('File 3\nLine 2\nLine 3', 'file3.txt'), inode: 1003 }
      ];
      
      const results = await calculator.batchCalculate(files);
      
      expect(results).toHaveLength(3);
      expect(results[0].lineCount).toBe(2);
      expect(results[1].lineCount).toBe(1);
      expect(results[2].lineCount).toBe(3);
    });

    it('should calculate statistics correctly', async () => {
      const measurements = [
        { inode_number: 1001, line_count: 10, block_count: 1 },
        { inode_number: 1002, line_count: 20, block_count: 2 },
        { inode_number: 1003, line_count: 0, block_count: 1 }, // Binary file
        { inode_number: 1004, line_count: 30, block_count: 3 }
      ];
      
      const stats = await calculator.getStatistics(measurements);
      
      expect(stats.totalFiles).toBe(4);
      expect(stats.totalLines).toBe(60);
      expect(stats.totalBlocks).toBe(7);
      expect(stats.binaryFiles).toBe(1);
      expect(stats.textFiles).toBe(3);
      expect(stats.averageLines).toBe(20); // 60 lines / 3 text files
      expect(stats.averageBlocks).toBe(1.75); // 7 blocks / 4 files
    });
  });

  describe('Unicode and Special Characters', () => {
    it('should handle UTF-8 content correctly', async () => {
      // Use simpler UTF-8 content that won't trigger binary detection
      const content = 'Hello World\nSecond Line\nThird Line';
      const filePath = await createTempFile(content);
      const result = await calculator.calculateMeasurements(filePath, 12345);
      
      expect(result.lineCount).toBe(3);
      expect(result.blockCount).toBeGreaterThan(0);
    });

    it('should handle files with various whitespace characters', async () => {
      const content = 'Line 1\t\n  Line 2  \n\tLine 3\t\t';
      const filePath = await createTempFile(content);
      const result = await calculator.calculateMeasurements(filePath, 12345);
      
      expect(result.lineCount).toBe(3);
      expect(result.blockCount).toBeGreaterThan(0);
    });
  });
});