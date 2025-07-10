/**
 * Common test setup for database adapter tests
 * Shared utilities and setup/teardown logic
 */

import { DatabaseAdapter } from '../../../../src/database/database-adapter.ts';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface DatabaseTestContext {
  adapter: DatabaseAdapter;
  dbPath: string;
  testDir: string;
}

export class DatabaseTestSetup {
  private testDir: string = '';
  private dbPath: string = '';

  createTestEnvironment(): { testDir: string; dbPath: string } {
    this.testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cctop-db-test-'));
    this.dbPath = path.join(this.testDir, 'test-activity.db');
    return { testDir: this.testDir, dbPath: this.dbPath };
  }

  cleanupTestEnvironment(): void {
    if (this.testDir && fs.existsSync(this.testDir)) {
      fs.rmSync(this.testDir, { recursive: true, force: true });
    }
  }

  createDatabaseAdapter(dbPath?: string): DatabaseAdapter {
    return new DatabaseAdapter(dbPath || this.dbPath);
  }

  async createTestDatabase(adapter: DatabaseAdapter): Promise<void> {
    await adapter.connect();
    await this.setupFunc000Schema(adapter);
  }

  private async setupFunc000Schema(adapter: DatabaseAdapter): Promise<void> {
    const db = adapter.getDatabase();
    if (!db) return;

    // Create FUNC-000 compliant schema for testing
    const schemaSQL = [
      // Enable foreign keys
      `PRAGMA foreign_keys = ON`,
      
      // Event types table
      `CREATE TABLE IF NOT EXISTS event_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,
      
      // Files table
      `CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        directory TEXT NOT NULL,
        full_path TEXT NOT NULL UNIQUE,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,
      
      // Events table
      `CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        event_type TEXT NOT NULL,
        filename TEXT NOT NULL,
        directory TEXT,
        lines INTEGER,
        blocks INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (event_type) REFERENCES event_types(name)
      )`,
      
      // Other required tables
      `CREATE TABLE IF NOT EXISTS directories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        path TEXT NOT NULL UNIQUE,
        created_at TEXT DEFAULT (datetime('now'))
      )`,
      
      `CREATE TABLE IF NOT EXISTS file_contents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER NOT NULL,
        content_hash TEXT,
        size INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (file_id) REFERENCES files(id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS activity_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_time TEXT NOT NULL,
        end_time TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,
      
      `CREATE TABLE IF NOT EXISTS event_aggregates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        event_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (session_id) REFERENCES activity_sessions(id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS measurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        inode INTEGER,
        file_size INTEGER,
        line_count INTEGER,
        block_count INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (event_id) REFERENCES events(id)
      )`,
      
      // Insert basic event types
      `INSERT OR IGNORE INTO event_types (name, description) VALUES 
        ('find', 'File discovered'),
        ('create', 'File created'),
        ('modify', 'File modified'),
        ('delete', 'File deleted'),
        ('move', 'File moved'),
        ('restore', 'File restored')`,
      
      // Create indexes
      `CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp)`,
      `CREATE INDEX IF NOT EXISTS idx_events_filename ON events(filename)`,
      `CREATE INDEX IF NOT EXISTS idx_events_directory ON events(directory)`,
      `CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type)`,
      `CREATE INDEX IF NOT EXISTS idx_files_filename ON files(filename)`,
      `CREATE INDEX IF NOT EXISTS idx_file_contents_file_id ON file_contents(file_id)`,
      
      // Create views
      `CREATE VIEW IF NOT EXISTS latest_file_events AS
        SELECT f.filename, e.event_type, e.timestamp, e.lines, e.blocks
        FROM events e
        JOIN files f ON e.filename = f.filename
        WHERE e.id IN (
          SELECT MAX(id) FROM events GROUP BY filename
        )`,
      
      `CREATE VIEW IF NOT EXISTS event_summary AS
        SELECT event_type, COUNT(*) as count
        FROM events
        GROUP BY event_type`,
      
      // Create triggers
      `CREATE TRIGGER IF NOT EXISTS update_file_stats
        AFTER INSERT ON events
        BEGIN
          UPDATE files SET updated_at = datetime('now')
          WHERE filename = NEW.filename;
        END`,
      
      `CREATE TRIGGER IF NOT EXISTS log_event_changes
        AFTER INSERT ON events
        BEGIN
          UPDATE event_aggregates SET event_count = event_count + 1
          WHERE session_id = (SELECT MAX(id) FROM activity_sessions);
        END`
    ];

    // Execute all schema statements
    for (const sql of schemaSQL) {
      await new Promise<void>((resolve, reject) => {
        db.run(sql, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }

  async verifyTableExists(adapter: DatabaseAdapter, tableName: string): Promise<boolean> {
    try {
      const result = await adapter.getDatabase().prepare(`
        SELECT COUNT(*) as count 
        FROM sqlite_master 
        WHERE type='table' AND name=?
      `).get(tableName);
      return result && result.count > 0;
    } catch (error) {
      return false;
    }
  }

  async verifyEventTypesData(adapter: DatabaseAdapter): Promise<boolean> {
    try {
      const result = await adapter.getDatabase().prepare(`
        SELECT COUNT(*) as count FROM event_types
      `).get();
      return result && result.count >= 6; // Should have at least 6 event types
    } catch (error) {
      return false;
    }
  }

  async verifyForeignKeysEnabled(adapter: DatabaseAdapter): Promise<boolean> {
    try {
      const result = await adapter.getDatabase().prepare(`
        PRAGMA foreign_keys
      `).get();
      return result && result.foreign_keys === 1;
    } catch (error) {
      return false;
    }
  }

  async verifyIndexExists(adapter: DatabaseAdapter, indexName: string): Promise<boolean> {
    try {
      const result = await adapter.getDatabase().prepare(`
        SELECT COUNT(*) as count 
        FROM sqlite_master 
        WHERE type='index' AND name=?
      `).get(indexName);
      return result && result.count > 0;
    } catch (error) {
      return false;
    }
  }

  async getEventCount(adapter: DatabaseAdapter): Promise<number> {
    try {
      const result = await adapter.getDatabase().prepare(`
        SELECT COUNT(*) as count FROM events
      `).get();
      return result ? result.count : 0;
    } catch (error) {
      return 0;
    }
  }

  createNonExistentDbPath(): string {
    return path.join(this.testDir, 'non-existent.db');
  }

  corruptDatabase(): void {
    if (fs.existsSync(this.dbPath)) {
      fs.writeFileSync(this.dbPath, 'corrupted database content');
    }
  }

  removeDatabase(): void {
    if (fs.existsSync(this.dbPath)) {
      fs.unlinkSync(this.dbPath);
    }
  }
}