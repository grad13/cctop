/**
 * Database connection and management
 */

import sqlite3 from 'sqlite3';
import { SCHEMA_SQL, PRAGMA_SETTINGS } from '../schema/database.schema';
import { FileEvent, EventFilter, EventStats } from '../types';

export class Database {
  private db: sqlite3.Database | null = null;
  private readonly dbPath: string;
  private readonly readOnly: boolean;

  constructor(dbPath: string, readOnly: boolean = false) {
    this.dbPath = dbPath;
    this.readOnly = readOnly;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const mode = this.readOnly 
        ? sqlite3.OPEN_READONLY 
        : sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE;

      this.db = new sqlite3.Database(this.dbPath, mode, async (err) => {
        if (err) {
          reject(err);
          return;
        }

        try {
          await this.initializeDatabase();
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          this.db = null;
          resolve();
        }
      });
    });
  }

  private async initializeDatabase(): Promise<void> {
    if (!this.db) throw new Error('Database not connected');

    // Apply PRAGMA settings
    for (const pragma of PRAGMA_SETTINGS) {
      await this.run(pragma);
    }

    // Create schema if not read-only
    if (!this.readOnly) {
      await this.exec(SCHEMA_SQL);
    }
  }

  private run(sql: string, params?: any[]): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      this.db.run(sql, params || [], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private exec(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      this.db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private get<T>(sql: string, params?: any[]): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      this.db.get(sql, params || [], (err, row) => {
        if (err) reject(err);
        else resolve(row as T);
      });
    });
  }

  private all<T>(sql: string, params?: any[]): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      this.db.all(sql, params || [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }

  // Public methods for event operations

  async insertEvent(event: Omit<FileEvent, 'id'>): Promise<number> {
    if (this.readOnly) {
      throw new Error('Cannot insert in read-only mode');
    }

    const sql = `
      INSERT INTO activity_events (
        timestamp, event_type, file_path, directory, file_name,
        file_size, line_count, blocks, inode, old_path, error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      event.timestamp.toISOString(),
      event.eventType,
      event.filePath,
      event.directory,
      event.fileName,
      event.fileSize,
      event.lineCount,
      event.blocks,
      event.inode,
      event.oldPath || null,
      event.error || null
    ];

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  async getEvents(filter?: EventFilter): Promise<FileEvent[]> {
    let sql = 'SELECT * FROM activity_events WHERE 1=1';
    const params: any[] = [];

    if (filter) {
      if (filter.eventTypes && filter.eventTypes.length > 0) {
        sql += ` AND event_type IN (${filter.eventTypes.map(() => '?').join(',')})`;
        params.push(...filter.eventTypes);
      }

      if (filter.directory) {
        sql += ' AND directory LIKE ?';
        params.push(`%${filter.directory}%`);
      }

      if (filter.fileName) {
        sql += ' AND file_name LIKE ?';
        params.push(`%${filter.fileName}%`);
      }

      if (filter.startTime) {
        sql += ' AND timestamp >= ?';
        params.push(filter.startTime.toISOString());
      }

      if (filter.endTime) {
        sql += ' AND timestamp <= ?';
        params.push(filter.endTime.toISOString());
      }
    }

    sql += ' ORDER BY timestamp DESC';

    if (filter?.limit) {
      sql += ' LIMIT ?';
      params.push(filter.limit);
    }

    if (filter?.offset) {
      sql += ' OFFSET ?';
      params.push(filter.offset);
    }

    const rows = await this.all<any>(sql, params);
    
    return rows.map(row => ({
      id: row.id,
      timestamp: new Date(row.timestamp),
      eventType: row.event_type as FileEvent['eventType'],
      filePath: row.file_path,
      directory: row.directory,
      fileName: row.file_name,
      fileSize: row.file_size,
      lineCount: row.line_count,
      blocks: row.blocks,
      inode: row.inode,
      oldPath: row.old_path,
      error: row.error
    }));
  }

  async getEventStats(): Promise<EventStats> {
    const sql = `
      SELECT 
        COUNT(*) as total_events,
        COUNT(DISTINCT file_path) as total_files,
        SUM(file_size) as total_size,
        SUM(line_count) as total_lines,
        MAX(timestamp) as last_event_time,
        event_type,
        COUNT(*) as type_count
      FROM activity_events
      GROUP BY event_type
    `;

    const rows = await this.all<any>(sql);
    
    const eventsByType: Record<string, number> = {};
    let totalEvents = 0;
    let totalFiles = 0;
    let totalSize = 0;
    let totalLines = 0;
    let lastEventTime: Date | undefined;

    for (const row of rows) {
      eventsByType[row.event_type] = row.type_count;
      totalEvents += row.type_count;
      
      if (row.total_files > totalFiles) totalFiles = row.total_files;
      if (row.total_size > totalSize) totalSize = row.total_size;
      if (row.total_lines > totalLines) totalLines = row.total_lines;
      
      const eventTime = new Date(row.last_event_time);
      if (!lastEventTime || eventTime > lastEventTime) {
        lastEventTime = eventTime;
      }
    }

    return {
      totalEvents,
      eventsByType,
      totalFiles,
      totalSize,
      totalLines,
      lastEventTime
    };
  }
}