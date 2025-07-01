/**
 * Database Query Helper Functions
 */

import sqlite3 from 'sqlite3';
import { AggregateData, GlobalStatistics } from './TestHelpers';

export class DatabaseQueries {
  constructor(private dbPath: string) {}

  async queryAggregatesTable(): Promise<AggregateData[]> {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath);
      db.all(`
        SELECT 
          a.*,
          f.file_path,
          f.inode_number,
          f.is_active
        FROM aggregates a
        JOIN files f ON a.file_id = f.id
        ORDER BY a.id ASC
      `, (err, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows as AggregateData[]);
        db.close();
      });
    });
  }

  async queryEventsTable(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath);
      db.all(`
        SELECT * FROM events 
        ORDER BY timestamp ASC
      `, (err, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows);
        db.close();
      });
    });
  }

  async queryGlobalStatistics(): Promise<GlobalStatistics> {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath);
      db.get(`
        SELECT 
          SUM(total_finds) as total_finds,
          SUM(total_creates) as total_creates,
          SUM(total_modifies) as total_modifies,
          SUM(total_deletes) as total_deletes,
          SUM(total_moves) as total_moves,
          SUM(total_restores) as total_restores,
          SUM(total_events) as total_events,
          COUNT(*) as total_files,
          COUNT(CASE WHEN (SELECT f.is_active FROM files f WHERE f.id = a.file_id) = 1 THEN 1 END) as active_files,
          SUM(last_size) as total_current_size,
          AVG(last_size) as avg_file_size,
          MAX(max_size) as largest_file_size,
          MIN(CASE WHEN last_size > 0 THEN last_size END) as smallest_file_size,
          MIN(first_event_timestamp) as earliest_event,
          MAX(last_event_timestamp) as latest_event
        FROM aggregates a
      `, (err, row: any) => {
        if (err) reject(err);
        else resolve(row as GlobalStatistics);
        db.close();
      });
    });
  }

  async recreateTriggersForTest(): Promise<void> {
    try {
      const { Database } = await import('@cctop/shared');
      const db = new Database(this.dbPath);
      await db.connect();
      await db.recreateTriggers();
      await db.close();
      console.log('Triggers recreated successfully');
    } catch (error) {
      console.error('Critical: Failed to recreate triggers for test environment:', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
        testEnvironment: true
      });
      throw new Error(`Test setup failed: Unable to recreate database triggers - ${error}`);
    }
  }
}