/**
 * Database Reader for CLI
 * Read-only operations for UI display
 */

import * as sqlite3 from 'sqlite3';
import { EventRow } from './types';

export class DatabaseReader {
  private db: sqlite3.Database | null = null;

  constructor(private dbPath: string) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
          reject(new Error(`Failed to connect to database: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            this.db = null;
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  async getLatestEvents(limit: number = 25): Promise<EventRow[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      const sql = `
        SELECT 
          e.id,
          e.timestamp,
          e.file_name as filename,
          e.directory,
          et.code as event_type,
          COALESCE(m.file_size, 0) as size,
          COALESCE(m.line_count, 0) as lines,
          COALESCE(m.block_count, 0) as blocks,
          COALESCE(m.inode, 0) as inode,
          0 as elapsed_ms
        FROM events e
        JOIN event_types et ON e.event_type_id = et.id
        LEFT JOIN measurements m ON e.id = m.event_id
        ORDER BY e.timestamp DESC 
        LIMIT ?
      `;

      this.db.all(sql, [limit], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const events: EventRow[] = rows.map(row => ({
            id: row.id,
            timestamp: row.timestamp,
            filename: row.filename,
            directory: row.directory,
            event_type: row.event_type,
            size: row.size,
            lines: row.lines,
            blocks: row.blocks,
            inode: row.inode,
            elapsed_ms: row.elapsed_ms
          }));
          resolve(events);
        }
      });
    });
  }

  async getEventsByType(eventType: string, limit: number = 25): Promise<EventRow[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      const sql = `
        SELECT 
          e.id,
          e.timestamp,
          e.file_name as filename,
          e.directory,
          et.code as event_type,
          COALESCE(m.file_size, 0) as size,
          COALESCE(m.line_count, 0) as lines,
          COALESCE(m.block_count, 0) as blocks,
          COALESCE(m.inode, 0) as inode,
          0 as elapsed_ms
        FROM events e
        JOIN event_types et ON e.event_type_id = et.id
        LEFT JOIN measurements m ON e.id = m.event_id
        WHERE et.code = ?
        ORDER BY e.timestamp DESC 
        LIMIT ?
      `;

      this.db.all(sql, [eventType, limit], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const events: EventRow[] = rows.map(row => ({
            id: row.id,
            timestamp: row.timestamp,
            filename: row.filename,
            directory: row.directory,
            event_type: row.event_type,
            size: row.size,
            lines: row.lines,
            blocks: row.blocks,
            inode: row.inode,
            elapsed_ms: row.elapsed_ms
          }));
          resolve(events);
        }
      });
    });
  }

  async getUniqueFiles(limit: number = 25): Promise<EventRow[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      const sql = `
        SELECT 
          e.id,
          e.timestamp,
          e.file_name as filename,
          e.directory,
          et.code as event_type,
          COALESCE(m.file_size, 0) as size,
          COALESCE(m.line_count, 0) as lines,
          COALESCE(m.block_count, 0) as blocks,
          COALESCE(m.inode, 0) as inode,
          0 as elapsed_ms
        FROM events e
        JOIN event_types et ON e.event_type_id = et.id
        LEFT JOIN measurements m ON e.id = m.event_id
        WHERE e.id IN (
          SELECT MAX(e2.id)
          FROM events e2
          GROUP BY e2.file_id
        )
        ORDER BY e.timestamp DESC 
        LIMIT ?
      `;

      this.db.all(sql, [limit], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const events: EventRow[] = rows.map(row => ({
            id: row.id,
            timestamp: row.timestamp,
            filename: row.filename,
            directory: row.directory,
            event_type: row.event_type,
            size: row.size,
            lines: row.lines,
            blocks: row.blocks,
            inode: row.inode,
            elapsed_ms: row.elapsed_ms
          }));
          resolve(events);
        }
      });
    });
  }

  async getDirectoryEvents(directory: string, limit: number = 25): Promise<EventRow[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      const sql = `
        SELECT 
          e.id,
          e.timestamp,
          e.file_name as filename,
          e.directory,
          et.code as event_type,
          COALESCE(m.file_size, 0) as size,
          COALESCE(m.line_count, 0) as lines,
          COALESCE(m.block_count, 0) as blocks,
          COALESCE(m.inode, 0) as inode,
          0 as elapsed_ms
        FROM events e
        JOIN event_types et ON e.event_type_id = et.id
        LEFT JOIN measurements m ON e.id = m.event_id
        WHERE e.directory LIKE ?
        ORDER BY e.timestamp DESC 
        LIMIT ?
      `;

      this.db.all(sql, [`%${directory}%`, limit], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const events: EventRow[] = rows.map(row => ({
            id: row.id,
            timestamp: row.timestamp,
            filename: row.filename,
            directory: row.directory,
            event_type: row.event_type,
            size: row.size,
            lines: row.lines,
            blocks: row.blocks,
            inode: row.inode,
            elapsed_ms: row.elapsed_ms
          }));
          resolve(events);
        }
      });
    });
  }

  async getEventCount(): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      this.db.get('SELECT COUNT(*) as count FROM events', (err, row: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.count);
        }
      });
    });
  }
}