/**
 * Database Event Operations
 */

import sqlite3 from 'sqlite3';
import { FileEvent } from '../types';

export class EventOperations {
  constructor(private db: sqlite3.Database) {}

  async insertEvent(event: FileEvent): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO events (event_type, file_path, directory, filename, file_size, timestamp, inode_number)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        event.eventType,
        event.filePath,
        event.directory,
        event.filename,
        event.fileSize,
        event.timestamp.toISOString(),
        event.inodeNumber
      ];

      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async getRecentEvents(limit: number = 100, filePath?: string): Promise<FileEvent[]> {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT * FROM events
      `;
      let params: any[] = [];

      if (filePath) {
        sql += ` WHERE file_path = ?`;
        params.push(filePath);
      }

      sql += ` ORDER BY timestamp DESC LIMIT ?`;
      params.push(limit);

      this.db.all(sql, params, (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const events = rows.map(row => ({
            id: row.id,
            eventType: row.event_type,
            filePath: row.file_path,
            directory: row.directory,
            filename: row.filename,
            fileSize: row.file_size,
            timestamp: new Date(row.timestamp),
            inodeNumber: row.inode_number
          }));
          resolve(events);
        }
      });
    });
  }

  async getEventTypeStatistics(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          event_type,
          COUNT(*) as count,
          COUNT(DISTINCT file_path) as unique_files,
          AVG(file_size) as avg_file_size,
          SUM(file_size) as total_size,
          MIN(timestamp) as first_occurrence,
          MAX(timestamp) as last_occurrence
        FROM events
        GROUP BY event_type
        ORDER BY count DESC
      `;

      this.db.all(sql, [], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getTimeBasedStatistics(intervalMinutes: number = 10): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          datetime(
            (strftime('%s', timestamp) / (? * 60)) * (? * 60), 
            'unixepoch'
          ) as time_bucket,
          event_type,
          COUNT(*) as count,
          COUNT(DISTINCT file_path) as unique_files,
          AVG(file_size) as avg_size
        FROM events
        WHERE timestamp > datetime('now', '-1 day')
        GROUP BY time_bucket, event_type
        ORDER BY time_bucket DESC, count DESC
      `;

      this.db.all(sql, [intervalMinutes, intervalMinutes], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
}