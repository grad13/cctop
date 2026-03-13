/**
 * Measurement Operations
 * Database measurements table operations
 */

import sqlite3 from 'sqlite3';
import { MeasurementResult } from './types';

export class MeasurementOperations {
  private db: sqlite3.Database;

  constructor(db: sqlite3.Database) {
    this.db = db;
  }

  /**
   * Insert measurement data for an event
   */
  async insertMeasurement(eventId: number, measurement: MeasurementResult): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO measurements (event_id, inode, file_size, line_count, block_count)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      this.db.run(query, [
        eventId,
        measurement.inode,
        measurement.fileSize,
        measurement.lineCount,
        measurement.blockCount
      ], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Get measurements for a specific event
   */
  async getMeasurementByEventId(eventId: number): Promise<MeasurementResult | null> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT event_id, inode, file_size, line_count, block_count
        FROM measurements
        WHERE event_id = ?
      `;
      
      this.db.get(query, [eventId], (err, row: any) => {
        if (err) {
          reject(err);
        } else if (row) {
          resolve({
            inode: row.inode,
            fileSize: row.file_size,
            lineCount: row.line_count ?? 0,  // Convert null to 0
            blockCount: row.block_count ?? 0  // Convert null to 0
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  /**
   * Get measurements for a specific file (most recent)
   */
  async getMeasurementsByFilePath(filePath: string): Promise<MeasurementResult[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT m.event_id, m.inode, m.file_size, m.line_count, m.block_count
        FROM measurements m
        JOIN events e ON m.event_id = e.id
        WHERE e.file_path = ?
        ORDER BY e.timestamp DESC
      `;
      
      this.db.all(query, [filePath], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const measurements = rows.map(row => ({
            inode: row.inode,
            fileSize: row.file_size,
            lineCount: row.line_count ?? 0,  // Convert null to 0
            blockCount: row.block_count ?? 0  // Convert null to 0
          }));
          resolve(measurements);
        }
      });
    });
  }

  /**
   * Get measurement statistics
   */
  async getMeasurementStatistics(): Promise<{
    totalMeasurements: number;
    totalLines: number;
    totalBlocks: number;
    averageLines: number;
    averageBlocks: number;
    binaryFiles: number;
    textFiles: number;
  }> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          COUNT(*) as total_measurements,
          SUM(line_count) as total_lines,
          SUM(block_count) as total_blocks,
          AVG(CASE WHEN line_count > 0 THEN line_count END) as avg_lines,
          AVG(block_count) as avg_blocks,
          COUNT(CASE WHEN line_count = 0 OR line_count IS NULL THEN 1 END) as binary_files,
          COUNT(CASE WHEN line_count > 0 THEN 1 END) as text_files
        FROM measurements
      `;
      
      this.db.get(query, [], (err, row: any) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            totalMeasurements: row.total_measurements || 0,
            totalLines: row.total_lines || 0,
            totalBlocks: row.total_blocks || 0,
            averageLines: row.avg_lines || 0,
            averageBlocks: row.avg_blocks || 0,
            binaryFiles: row.binary_files || 0,
            textFiles: row.text_files || 0
          });
        }
      });
    });
  }

  /**
   * Get top files by line count
   */
  async getTopFilesByLines(limit: number = 10): Promise<Array<{
    filePath: string;
    lineCount: number;
    blockCount: number;
    lastEventType: string;
    lastTimestamp: string;
  }>> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          e.file_path as filePath,
          m.line_count as lineCount,
          m.block_count as blockCount,
          et.code as lastEventType,
          datetime(e.timestamp, 'unixepoch') as lastTimestamp
        FROM measurements m
        JOIN events e ON m.event_id = e.id
        JOIN event_types et ON e.event_type_id = et.id
        WHERE m.line_count > 0
        ORDER BY m.line_count DESC
        LIMIT ?
      `;
      
      this.db.all(query, [limit], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Get top files by block count
   */
  async getTopFilesByBlocks(limit: number = 10): Promise<Array<{
    filePath: string;
    lineCount: number;
    blockCount: number;
    lastEventType: string;
    lastTimestamp: string;
  }>> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          e.file_path as filePath,
          m.line_count as lineCount,
          m.block_count as blockCount,
          et.code as lastEventType,
          datetime(e.timestamp, 'unixepoch') as lastTimestamp
        FROM measurements m
        JOIN events e ON m.event_id = e.id
        JOIN event_types et ON e.event_type_id = et.id
        ORDER BY m.block_count DESC
        LIMIT ?
      `;
      
      this.db.all(query, [limit], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Delete measurements for a specific event
   */
  async deleteMeasurementsByEventId(eventId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `DELETE FROM measurements WHERE event_id = ?`;
      
      this.db.run(query, [eventId], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}