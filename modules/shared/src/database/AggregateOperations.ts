/**
 * Database Aggregate Operations
 */

import sqlite3 from 'sqlite3';

export class AggregateOperations {
  constructor(private db: sqlite3.Database) {}

  async getAggregateData(filePath?: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT 
          a.*,
          f.file_path,
          f.inode_number,
          f.is_active,
          f.created_at,
          f.updated_at
        FROM aggregates a
        JOIN files f ON a.file_id = f.id
      `;
      let params: any[] = [];

      if (filePath) {
        sql += ` WHERE f.file_path = ?`;
        params.push(filePath);
      }

      sql += ` ORDER BY a.last_updated DESC`;

      this.db.all(sql, params, (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getGlobalStatistics(): Promise<any> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          -- Event type counts
          SUM(total_finds) as total_finds,
          SUM(total_creates) as total_creates,
          SUM(total_modifies) as total_modifies,
          SUM(total_deletes) as total_deletes,
          SUM(total_moves) as total_moves,
          SUM(total_restores) as total_restores,
          SUM(total_events) as total_events,
          
          -- File counts
          COUNT(*) as total_files,
          COUNT(CASE WHEN (SELECT f.is_active FROM files f WHERE f.id = a.file_id) = 1 THEN 1 END) as active_files,
          
          -- Size statistics
          SUM(last_size) as total_current_size,
          AVG(last_size) as avg_file_size,
          MAX(max_size) as largest_file_size,
          MIN(CASE WHEN last_size > 0 THEN last_size END) as smallest_file_size,
          
          -- Time statistics
          MIN(first_event_timestamp) as earliest_event,
          MAX(last_event_timestamp) as latest_event
          
        FROM aggregates a
      `;

      this.db.get(sql, [], (err, row: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || {});
        }
      });
    });
  }

  async getFileStatistics(filePath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          a.*,
          f.file_path,
          f.inode_number,
          f.is_active,
          f.created_at,
          f.updated_at
        FROM aggregates a
        JOIN files f ON a.file_id = f.id
        WHERE f.file_path = ?
      `;

      this.db.get(sql, [filePath], (err, row: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  async getTopFilesByEvents(limit: number = 10): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          a.*,
          f.file_path,
          f.inode_number,
          f.is_active
        FROM aggregates a
        JOIN files f ON a.file_id = f.id
        ORDER BY a.total_events DESC
        LIMIT ?
      `;

      this.db.all(sql, [limit], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
}