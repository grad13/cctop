/**
 * Database Query Utilities for Testing
 * Provides direct database access for test verification
 */

import { Database } from '../../src/database/database';
import type { DbEvent, AggregateData, GlobalStatistics } from './types';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

export class DatabaseQueries {
  private database: Database;
  private db: sqlite3.Database | null = null;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    this.database = new Database(dbPath);
  }

  async connect(): Promise<void> {
    await this.database.connect();
    // Get direct sqlite3 database instance for raw queries
    this.db = new sqlite3.Database(this.dbPath);
  }

  async queryAggregatesTable(): Promise<AggregateData[]> {
    if (!this.db) throw new Error('Database not connected');
    
    return new Promise((resolve, reject) => {
      this.db!.all(`
        SELECT 
          a.*,
          f.inode,
          f.is_active,
          (SELECT file_path FROM events WHERE file_id = a.file_id ORDER BY timestamp DESC LIMIT 1) as file_path
        FROM aggregates a
        JOIN files f ON a.file_id = f.id
        ORDER BY a.id
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as AggregateData[]);
      });
    });
  }

  async queryGlobalStatistics(): Promise<GlobalStatistics | null> {
    if (!this.db) throw new Error('Database not connected');
    
    // Since global_statistics table doesn't exist, we'll compute from aggregates
    return new Promise((resolve, reject) => {
      this.db!.get(`
        SELECT 
          COUNT(DISTINCT file_id) as total_files,
          SUM(total_events) as total_events,
          0 as total_finds,  -- finds are not tracked separately in FUNC-000
          SUM(total_creates) as total_creates,
          SUM(total_modifies) as total_modifies,
          SUM(total_deletes) as total_deletes,
          SUM(total_moves) as total_moves,
          SUM(total_restores) as total_restores,
          MAX(last_event_timestamp) as last_event_timestamp,
          MIN(first_event_timestamp) as first_event_timestamp
        FROM aggregates
      `, (err, row) => {
        if (err) reject(err);
        else resolve(row as GlobalStatistics | null);
      });
    });
  }

  async recreateTriggersForTest(): Promise<void> {
    if (!this.db) throw new Error('Database not connected');
    
    // Use the database's trigger recreation method
    await this.database.recreateTriggers();
  }

  async queryEvents(query: string, ...params: any[]): Promise<any[]> {
    if (!this.db) throw new Error('Database not connected');
    
    return new Promise((resolve, reject) => {
      this.db!.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async queryEvent(query: string, ...params: any[]): Promise<any> {
    if (!this.db) throw new Error('Database not connected');
    
    return new Promise((resolve, reject) => {
      this.db!.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async getEventsFromDb(): Promise<DbEvent[]> {
    if (!this.db) throw new Error('Database not connected');
    
    return new Promise((resolve, reject) => {
      this.db!.all(
        `SELECT 
          e.*,
          et.code as event_type,
          e.file_name as filename,
          COALESCE(m.inode, f.inode) as inode_number,
          m.file_size as file_size,
          m.line_count,
          m.block_count
        FROM events e
        JOIN event_types et ON e.event_type_id = et.id
        JOIN files f ON e.file_id = f.id
        LEFT JOIN measurements m ON e.id = m.event_id
        ORDER BY e.id ASC`,
        (err, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows as DbEvent[]);
        }
      );
    });
  }

  async getEventsByType(eventType: string): Promise<DbEvent[]> {
    const events = await this.getEventsFromDb();
    return events.filter(e => e.event_type === eventType);
  }

  async getEventsByFilename(filename: string): Promise<DbEvent[]> {
    const events = await this.getEventsFromDb();
    return events.filter(e => e.filename === filename);
  }

  async close(): Promise<void> {
    if (this.db) {
      await promisify(this.db.close.bind(this.db))();
      this.db = null;
    }
    await this.database.close();
  }
}
