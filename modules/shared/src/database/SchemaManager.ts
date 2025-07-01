/**
 * Database Schema Management
 */

import sqlite3 from 'sqlite3';

export class SchemaManager {
  constructor(private db: sqlite3.Database) {}

  async initializeSchema(): Promise<void> {
    return new Promise((resolve, reject) => {
      const createTablesSQL = `
        -- Events table
        CREATE TABLE IF NOT EXISTS events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_type TEXT NOT NULL CHECK (event_type IN ('find', 'create', 'modify', 'delete', 'move', 'restore')),
          file_path TEXT NOT NULL,
          directory TEXT NOT NULL,
          filename TEXT NOT NULL,
          file_size INTEGER DEFAULT 0,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          inode_number INTEGER NOT NULL
        );

        -- Files table
        CREATE TABLE IF NOT EXISTS files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          file_path TEXT UNIQUE NOT NULL,
          inode_number INTEGER NOT NULL,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Aggregates table
        CREATE TABLE IF NOT EXISTS aggregates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          file_id INTEGER NOT NULL,
          
          -- Event counts
          total_events INTEGER DEFAULT 0,
          total_finds INTEGER DEFAULT 0,
          total_creates INTEGER DEFAULT 0,
          total_modifies INTEGER DEFAULT 0,
          total_deletes INTEGER DEFAULT 0,
          total_moves INTEGER DEFAULT 0,
          total_restores INTEGER DEFAULT 0,
          
          -- File size tracking
          first_size INTEGER DEFAULT 0,
          max_size INTEGER DEFAULT 0,
          last_size INTEGER DEFAULT 0,
          
          -- Timestamps (Unix timestamps)
          first_event_timestamp INTEGER DEFAULT 0,
          last_event_timestamp INTEGER DEFAULT 0,
          
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
          resolve();
        }
      });
    });
  }
}