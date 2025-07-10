/**
 * Measurement Calculator
 * File measurement calculation functionality
 */

import * as fs from 'fs/promises';
import { LogManager } from '../logging/LogManager';
import { MeasurementResult } from '../database/types';

export class MeasurementCalculator {
  private logger: LogManager;
  private readonly BINARY_THRESHOLD = 0.3; // 30% threshold for binary detection
  private readonly CHUNK_SIZE = 8192; // 8KB chunks for reading files

  constructor(logger: LogManager) {
    this.logger = logger;
  }

  /**
   * Calculate measurements for a file
   */
  async calculateMeasurements(filePath: string, inode: number): Promise<MeasurementResult> {
    try {
      const stats = await fs.stat(filePath);
      
      // Check if file is binary
      const isBinary = await this.isBinaryFile(filePath);
      
      if (isBinary) {
        // For binary files, only calculate block count
        const blockCount = this.calculateBlockCount(stats.size);
        return {
          inode: inode,
          fileSize: stats.size,
          lineCount: 0,
          blockCount: blockCount
        };
      }

      // For text files, calculate both line count and block count
      const lineCount = await this.calculateLineCount(filePath);
      const blockCount = this.calculateBlockCount(stats.size);

      return {
        inode: inode,
        fileSize: stats.size,
        lineCount: lineCount,
        blockCount: blockCount
      };

    } catch (error) {
      this.logger.log('warn', `Failed to calculate measurements for ${filePath}: ${error}`);
      return {
        inode: inode,
        fileSize: 0,
        lineCount: 0,
        blockCount: 0
      };
    }
  }

  /**
   * Check if file is binary by detecting null bytes and non-printable characters
   */
  private async isBinaryFile(filePath: string): Promise<boolean> {
    try {
      const buffer = Buffer.alloc(this.CHUNK_SIZE);
      const fileHandle = await fs.open(filePath, 'r');
      
      try {
        const { bytesRead } = await fileHandle.read(buffer, 0, this.CHUNK_SIZE, 0);
        
        if (bytesRead === 0) {
          return false; // Empty file is treated as text
        }

        const sample = buffer.subarray(0, bytesRead);
        
        // Check for null bytes (strong indicator of binary)
        if (sample.includes(0)) {
          return true;
        }

        // Count non-printable characters
        let nonPrintableCount = 0;
        for (let i = 0; i < sample.length; i++) {
          const byte = sample[i];
          // Consider characters outside printable ASCII range (32-126) and common whitespace (9, 10, 13)
          // Also allow extended ASCII (128-255) for UTF-8 compatibility
          if (byte < 9 || (byte > 13 && byte < 32) || (byte > 126 && byte < 128)) {
            nonPrintableCount++;
          }
        }

        // If more than 30% of characters are non-printable, consider it binary
        const nonPrintableRatio = nonPrintableCount / sample.length;
        return nonPrintableRatio > this.BINARY_THRESHOLD;

      } finally {
        await fileHandle.close();
      }

    } catch (error) {
      this.logger.log('warn', `Error checking binary status for ${filePath}: ${error}`);
      return false; // Default to text file if unable to determine
    }
  }

  /**
   * Calculate line count for text files
   */
  private async calculateLineCount(filePath: string): Promise<number> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      if (content.length === 0) {
        return 1; // Empty file is considered 1 line
      }
      
      // Count newline characters and add 1 for the last line
      const newlineCount = (content.match(/\n/g) || []).length;
      return newlineCount + 1;

    } catch (error) {
      this.logger.log('warn', `Error calculating line count for ${filePath}: ${error}`);
      return 0;
    }
  }

  /**
   * Calculate block count based on file size
   * Using 512-byte blocks (traditional Unix block size)
   */
  private calculateBlockCount(fileSize: number): number {
    const BLOCK_SIZE = 512;
    return Math.ceil(fileSize / BLOCK_SIZE);
  }

  /**
   * Batch calculate measurements for multiple files
   */
  async batchCalculate(files: Array<{ filePath: string; inode: number }>): Promise<MeasurementResult[]> {
    const results: MeasurementResult[] = [];
    
    for (const file of files) {
      const result = await this.calculateMeasurements(file.filePath, file.inode);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Get measurement statistics for a set of files
   */
  async getStatistics(measurements: any[]): Promise<{
    totalFiles: number;
    totalLines: number;
    totalBlocks: number;
    averageLines: number;
    averageBlocks: number;
    binaryFiles: number;
    textFiles: number;
  }> {
    const totalFiles = measurements.length;
    const totalLines = measurements.reduce((sum, m) => sum + (m.line_count || m.lineCount || 0), 0);
    const totalBlocks = measurements.reduce((sum, m) => sum + (m.block_count || m.blockCount || 0), 0);
    const binaryFiles = measurements.filter(m => (m.line_count || m.lineCount || 0) === 0).length;
    const textFiles = totalFiles - binaryFiles;

    return {
      totalFiles,
      totalLines,
      totalBlocks,
      averageLines: textFiles > 0 ? totalLines / textFiles : 0,
      averageBlocks: totalFiles > 0 ? totalBlocks / totalFiles : 0,
      binaryFiles,
      textFiles
    };
  }
}