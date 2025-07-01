/**
 * Database Trigger Management
 */

import sqlite3 from 'sqlite3';

export class TriggerManager {
  constructor(private db: sqlite3.Database) {}

  async createTriggers(): Promise<void> {
    return new Promise((resolve, reject) => {
      // First drop all existing triggers
      const dropTriggersSQL = `
        DROP TRIGGER IF EXISTS trigger_update_aggregates_on_event;
        DROP TRIGGER IF EXISTS trigger_maintain_files_and_aggregates;
      `;

      this.db.exec(dropTriggersSQL, (err) => {
        if (err) {
          console.error('Failed to drop existing triggers:', {
            error: err.message,
            code: (err as any).code || 'UNKNOWN',
            timestamp: new Date().toISOString()
          });
        }

        // Create new trigger with proper UPSERT logic
        const createTriggerSQL = `
          CREATE TRIGGER trigger_maintain_files_and_aggregates
          AFTER INSERT ON events
          FOR EACH ROW
          BEGIN
            -- Insert or update files table (preserve file_id)
            INSERT OR IGNORE INTO files (file_path, inode_number, is_active, updated_at)
            VALUES (NEW.file_path, NEW.inode_number, 
                    CASE WHEN NEW.event_type = 'delete' THEN 0 ELSE 1 END, 
                    datetime('now'));
                    
            -- Update existing file record
            UPDATE files 
            SET inode_number = NEW.inode_number,
                is_active = CASE WHEN NEW.event_type = 'delete' THEN 0 ELSE 1 END,
                updated_at = datetime('now')
            WHERE file_path = NEW.file_path;

            -- UPSERT aggregates: Delete existing then insert with updated values
            DELETE FROM aggregates WHERE file_id = (SELECT id FROM files WHERE file_path = NEW.file_path);
            
            INSERT INTO aggregates (
              file_id,
              total_events, total_finds, total_creates, total_modifies, 
              total_deletes, total_moves, total_restores,
              first_size, max_size, last_size,
              first_event_timestamp, last_event_timestamp,
              last_updated
            ) 
            SELECT 
              f.id as file_id,
              COUNT(*) as total_events,
              SUM(CASE WHEN fe.event_type = 'find' THEN 1 ELSE 0 END) as total_finds,
              SUM(CASE WHEN fe.event_type = 'create' THEN 1 ELSE 0 END) as total_creates,
              SUM(CASE WHEN fe.event_type = 'modify' THEN 1 ELSE 0 END) as total_modifies,
              SUM(CASE WHEN fe.event_type = 'delete' THEN 1 ELSE 0 END) as total_deletes,
              SUM(CASE WHEN fe.event_type = 'move' THEN 1 ELSE 0 END) as total_moves,
              SUM(CASE WHEN fe.event_type = 'restore' THEN 1 ELSE 0 END) as total_restores,
              
              MIN(fe.file_size) as first_size,
              MAX(fe.file_size) as max_size,
              (SELECT file_size FROM events WHERE file_path = NEW.file_path ORDER BY timestamp DESC LIMIT 1) as last_size,
              
              MIN(strftime('%s', fe.timestamp)) as first_event_timestamp,
              MAX(strftime('%s', fe.timestamp)) as last_event_timestamp,
              strftime('%s', 'now') as last_updated
              
            FROM files f
            JOIN events fe ON fe.file_path = f.file_path
            WHERE f.file_path = NEW.file_path
            GROUP BY f.id;
          END;
        `;

        this.db.exec(createTriggerSQL, (err) => {
          if (err) {
            reject(err);
          } else {
            console.log('Database triggers created successfully');
            resolve();
          }
        });
      });
    });
  }

  async recreateTriggers(): Promise<void> {
    return this.createTriggers();
  }
}