/**
 * Database Query Utilities for Testing
 * Provides direct database access for test verification
 */

import BetterSqlite3 from 'better-sqlite3';
import type { AggregateData, GlobalStatistics } from './types';

export class DatabaseQueries {
  private db: BetterSqlite3.Database;

  constructor(dbPath: string) {
    this.db = new BetterSqlite3(dbPath);
  }

  queryAggregatesTable(): AggregateData[] {
    return this.db.prepare(`
      SELECT 
        a.*,
        f.file_path,
        f.inode_number,
        f.is_active
      FROM aggregates a
      JOIN files f ON a.file_id = f.id
      ORDER BY a.id
    `).all() as AggregateData[];
  }

  queryGlobalStatistics(): GlobalStatistics | null {
    return this.db.prepare('SELECT * FROM global_statistics LIMIT 1').get() as GlobalStatistics | null;
  }

  recreateTriggersForTest(): void {
    // Check if events table exists
    const tableExists = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='events'").get();
    if (!tableExists) {
      console.warn('Warning: events table does not exist, skipping trigger creation');
      return;
    }
    
    // Drop existing triggers
    this.db.exec(`
      DROP TRIGGER IF EXISTS update_aggregates_on_insert;
      DROP TRIGGER IF EXISTS update_global_statistics_on_aggregates_insert;
      DROP TRIGGER IF EXISTS update_global_statistics_on_aggregates_update;
    `);

    // Recreate triggers for testing
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_aggregates_on_insert
      AFTER INSERT ON events
      BEGIN
        INSERT INTO aggregates (
          file_id,
          total_events,
          total_finds,
          total_creates,
          total_modifies,
          total_deletes,
          total_moves,
          total_restores,
          first_size,
          max_size,
          last_size,
          first_event_timestamp,
          last_event_timestamp
        )
        VALUES (
          NEW.file_id,
          1,
          CASE WHEN NEW.event_type = 'find' THEN 1 ELSE 0 END,
          CASE WHEN NEW.event_type = 'create' THEN 1 ELSE 0 END,
          CASE WHEN NEW.event_type = 'modify' THEN 1 ELSE 0 END,
          CASE WHEN NEW.event_type = 'delete' THEN 1 ELSE 0 END,
          CASE WHEN NEW.event_type = 'move' THEN 1 ELSE 0 END,
          CASE WHEN NEW.event_type = 'restore' THEN 1 ELSE 0 END,
          NEW.size,
          NEW.size,
          NEW.size,
          NEW.timestamp,
          NEW.timestamp
        )
        ON CONFLICT(file_id) DO UPDATE SET
          total_events = total_events + 1,
          total_finds = total_finds + CASE WHEN NEW.event_type = 'find' THEN 1 ELSE 0 END,
          total_creates = total_creates + CASE WHEN NEW.event_type = 'create' THEN 1 ELSE 0 END,
          total_modifies = total_modifies + CASE WHEN NEW.event_type = 'modify' THEN 1 ELSE 0 END,
          total_deletes = total_deletes + CASE WHEN NEW.event_type = 'delete' THEN 1 ELSE 0 END,
          total_moves = total_moves + CASE WHEN NEW.event_type = 'move' THEN 1 ELSE 0 END,
          total_restores = total_restores + CASE WHEN NEW.event_type = 'restore' THEN 1 ELSE 0 END,
          max_size = MAX(max_size, NEW.size),
          last_size = NEW.size,
          last_event_timestamp = NEW.timestamp;
      END;
    `);
  }

  close(): void {
    this.db.close();
  }
}