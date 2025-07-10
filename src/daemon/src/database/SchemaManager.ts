/**
 * Database Schema Management
 */

import sqlite3 from 'sqlite3';

export class SchemaManager {
  constructor(private db: sqlite3.Database) {}

  async initializeSchema(): Promise<void> {
    return new Promise((resolve, reject) => {
      const createTablesSQL = `
        -- Enable foreign key constraints
        PRAGMA foreign_keys = ON;

        -- 1. event_types table
        CREATE TABLE IF NOT EXISTS event_types (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          description TEXT
        );

        -- 2. files table
        CREATE TABLE IF NOT EXISTS files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          inode INTEGER,
          is_active BOOLEAN DEFAULT TRUE
        );

        -- 3. events table
        CREATE TABLE IF NOT EXISTS events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp INTEGER NOT NULL,
          event_type_id INTEGER NOT NULL,
          file_id INTEGER NOT NULL,
          file_path TEXT NOT NULL,
          file_name TEXT NOT NULL,
          directory TEXT NOT NULL,
          FOREIGN KEY (event_type_id) REFERENCES event_types(id),
          FOREIGN KEY (file_id) REFERENCES files(id)
        );

        -- 4. measurements table
        CREATE TABLE IF NOT EXISTS measurements (
          event_id INTEGER PRIMARY KEY,
          inode INTEGER,
          file_size INTEGER,
          line_count INTEGER,
          block_count INTEGER,
          FOREIGN KEY (event_id) REFERENCES events(id)
        );

        -- 5. aggregates table
        CREATE TABLE IF NOT EXISTS aggregates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          file_id INTEGER,
          period_start INTEGER,
          
          -- 累積統計値
          total_size INTEGER DEFAULT 0,
          total_lines INTEGER DEFAULT 0,
          total_blocks INTEGER DEFAULT 0,
          
          -- イベント回数
          total_events INTEGER DEFAULT 0,
          total_finds INTEGER DEFAULT 0,
          total_creates INTEGER DEFAULT 0,
          total_modifies INTEGER DEFAULT 0,
          total_deletes INTEGER DEFAULT 0,
          total_moves INTEGER DEFAULT 0,
          total_restores INTEGER DEFAULT 0,
          
          -- 時系列統計
          first_event_timestamp INTEGER,
          last_event_timestamp INTEGER,
          
          -- メトリック統計（Size）
          first_size INTEGER,
          max_size INTEGER,
          last_size INTEGER,
          
          -- メトリック統計（Lines）
          first_lines INTEGER,
          max_lines INTEGER,
          last_lines INTEGER,
          
          -- メトリック統計（Blocks）
          first_blocks INTEGER,
          max_blocks INTEGER,
          last_blocks INTEGER,
          
          -- イベントタイプ統計
          dominant_event_type INTEGER,
          last_event_type_id INTEGER,
          
          -- メタデータ
          last_updated INTEGER DEFAULT CURRENT_TIMESTAMP,
          calculation_method TEXT DEFAULT 'trigger',
          
          FOREIGN KEY (file_id) REFERENCES files(id),
          FOREIGN KEY (dominant_event_type) REFERENCES event_types(id),
          FOREIGN KEY (last_event_type_id) REFERENCES event_types(id)
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
        CREATE INDEX IF NOT EXISTS idx_events_file_path ON events(file_path);
        CREATE INDEX IF NOT EXISTS idx_events_file_id ON events(file_id);
        CREATE INDEX IF NOT EXISTS idx_events_file_timestamp ON events(file_id, timestamp);
      `;
      
      this.db.exec(createTablesSQL, (err) => {
        if (err) {
          reject(err);
        } else {
          this.insertInitialEventTypes().then(() => {
            resolve();
          }).catch(reject);
        }
      });
    });
  }

  private async insertInitialEventTypes(): Promise<void> {
    return new Promise((resolve, reject) => {
      const eventTypes = [
        { id: 1, code: 'find', name: 'Find', description: 'Initial file discovery' },
        { id: 2, code: 'create', name: 'Create', description: 'File creation' },
        { id: 3, code: 'modify', name: 'Modify', description: 'File modification' },
        { id: 4, code: 'delete', name: 'Delete', description: 'File deletion' },
        { id: 5, code: 'move', name: 'Move', description: 'File move/rename' },
        { id: 6, code: 'restore', name: 'Restore', description: 'File restoration after deletion' }
      ];

      // Check existing event types
      this.db.all('SELECT id, code FROM event_types', (err, existingRows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        // Create a map of existing code to id
        const existingMap = new Map<string, number>();
        if (existingRows) {
          existingRows.forEach(row => {
            existingMap.set(row.code, row.id);
          });
        }

        // Check if we need to fix the IDs
        let needsFix = false;
        eventTypes.forEach(et => {
          const existingId = existingMap.get(et.code);
          if (existingId && existingId !== et.id) {
            needsFix = true;
          }
        });

        if (needsFix && existingRows.length > 0) {
          // If there are existing events, we can't easily fix the IDs
          resolve();
          return;
        }

        // Insert or update event types
        let completed = 0;
        eventTypes.forEach(eventType => {
          const sql = `
            INSERT OR REPLACE INTO event_types (id, code, name, description) 
            VALUES (?, ?, ?, ?)
          `;
          
          this.db.run(sql, [eventType.id, eventType.code, eventType.name, eventType.description], (err) => {
            if (err) {
            }
            completed++;
            if (completed === eventTypes.length) {
              resolve();
            }
          });
        });
      });
    });
  }
}