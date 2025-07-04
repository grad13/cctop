/**
 * Database connection and basic operations
 */

import sqlite3 from 'sqlite3';
import { FileEvent } from './types';

export class Database {
  private db: sqlite3.Database | null = null;

  constructor(private dbPath: string) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Ensure directory exists
      const fs = require('fs');
      const path = require('path');
      const dbDir = path.dirname(this.dbPath);
      
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log(`Created database directory: ${dbDir}`);
      }
      
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) reject(err);
        else {
          // Enable WAL mode for concurrent access
          this.db!.run('PRAGMA journal_mode=WAL', (err) => {
            if (err) reject(err);
            else {
              // Initialize schema if needed
              this.initializeSchema().then(resolve).catch(reject);
            }
          });
        }
      });
    });
  }
  
  private async initializeSchema(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }
      
      const createTablesSQL = `
        -- Events table
        CREATE TABLE IF NOT EXISTS events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_type TEXT NOT NULL,
          file_path TEXT NOT NULL,
          directory TEXT NOT NULL,
          filename TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          inode_number INTEGER NOT NULL
        );

        -- Files table for tracking unique files
        CREATE TABLE IF NOT EXISTS files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          file_path TEXT UNIQUE NOT NULL,
          inode_number INTEGER,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Aggregates table for statistics
        CREATE TABLE IF NOT EXISTS aggregates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          file_id INTEGER,
          period_start INTEGER,
          
          -- Cumulative statistics
          total_size INTEGER DEFAULT 0,
          total_lines INTEGER DEFAULT 0,
          total_blocks INTEGER DEFAULT 0,
          
          -- Event counts
          total_events INTEGER DEFAULT 0,
          total_finds INTEGER DEFAULT 0,
          total_creates INTEGER DEFAULT 0,
          total_modifies INTEGER DEFAULT 0,
          total_deletes INTEGER DEFAULT 0,
          total_moves INTEGER DEFAULT 0,
          total_restores INTEGER DEFAULT 0,
          
          -- Time series statistics
          first_event_timestamp INTEGER,
          last_event_timestamp INTEGER,
          
          -- Metric statistics (Size/Lines/Blocks - First/Max/Last)
          first_size INTEGER, max_size INTEGER, last_size INTEGER,
          first_lines INTEGER, max_lines INTEGER, last_lines INTEGER,
          first_blocks INTEGER, max_blocks INTEGER, last_blocks INTEGER,
          
          -- Metadata
          last_updated INTEGER DEFAULT (strftime('%s', 'now')),
          calculation_method TEXT DEFAULT 'trigger',
          
          FOREIGN KEY (file_id) REFERENCES files(id)
        );

        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
        CREATE INDEX IF NOT EXISTS idx_events_file_path ON events(file_path);
        CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
        CREATE INDEX IF NOT EXISTS idx_aggregates_file_id ON aggregates(file_id);
      `;
      
      this.db.exec(createTablesSQL, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Database schema initialized');
          this.createTriggers().then(resolve).catch(reject);
        }
      });
    });
  }

  private async createTriggers(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      // First drop all existing triggers
      const dropTriggersSQL = `
        DROP TRIGGER IF EXISTS trigger_update_aggregates_on_event;
        DROP TRIGGER IF EXISTS trigger_maintain_files_and_aggregates;
      `;

      this.db!.exec(dropTriggersSQL, (err) => {
        if (err) {
          console.error('Failed to drop existing triggers:', {
            error: err.message,
            code: (err as any).code || 'UNKNOWN',
            timestamp: new Date().toISOString()
          });
          // Continue with trigger creation even if drop fails
          // This handles cases where triggers don't exist yet
        }

        // Create new trigger with proper UPSERT logic using file_path directly
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
              -- Count events from file_events table
              COUNT(*) as total_events,
              SUM(CASE WHEN fe.event_type = 'find' THEN 1 ELSE 0 END) as total_finds,
              SUM(CASE WHEN fe.event_type = 'create' THEN 1 ELSE 0 END) as total_creates,
              SUM(CASE WHEN fe.event_type = 'modify' THEN 1 ELSE 0 END) as total_modifies,
              SUM(CASE WHEN fe.event_type = 'delete' THEN 1 ELSE 0 END) as total_deletes,
              SUM(CASE WHEN fe.event_type = 'move' THEN 1 ELSE 0 END) as total_moves,
              SUM(CASE WHEN fe.event_type = 'restore' THEN 1 ELSE 0 END) as total_restores,
              
              -- Size statistics
              MIN(fe.file_size) as first_size,
              MAX(fe.file_size) as max_size,
              (SELECT file_size FROM events WHERE file_path = NEW.file_path ORDER BY timestamp DESC LIMIT 1) as last_size,
              
              -- Timestamp statistics
              MIN(strftime('%s', fe.timestamp)) as first_event_timestamp,
              MAX(strftime('%s', fe.timestamp)) as last_event_timestamp,
              strftime('%s', 'now') as last_updated
              
            FROM files f
            LEFT JOIN events fe ON f.file_path = fe.file_path
            WHERE f.file_path = NEW.file_path
            GROUP BY f.id;
          END;
        `;

        this.db!.exec(createTriggerSQL, (err) => {
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

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }

  async insertEvent(event: FileEvent): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }
      
      const sql = `
        INSERT INTO events (
          event_type, file_path, directory, filename, 
          file_size, timestamp, inode_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(
        sql, 
        [
          event.eventType,
          event.filePath,
          event.directory,
          event.filename,
          event.fileSize,
          event.timestamp.toISOString(),
          event.inodeNumber
        ],
        (err) => {
          if (err) reject(err);
          else {
            console.log('Event inserted:', event.filename);
            resolve();
          }
        }
      );
    });
  }

  async getRecentEvents(limit: number = 100, filePath?: string): Promise<FileEvent[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }
      
      let sql = `
        SELECT * FROM events 
      `;
      let params: any[] = [];
      
      if (filePath) {
        sql += ` WHERE file_path = ? `;
        params.push(filePath);
      }
      
      sql += ` ORDER BY timestamp DESC LIMIT ? `;
      params.push(limit);
      
      this.db.all(sql, params, (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const events: FileEvent[] = rows.map(row => ({
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

  async getAggregateData(filePath?: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

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
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

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

  async getEventTypeStatistics(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

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
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

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