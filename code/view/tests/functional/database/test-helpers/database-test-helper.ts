/**
 * Database Test Helper
 * Uses better-sqlite3 (sync) to create production-compliant schemas and insert test data.
 * FileEventReader uses sqlite3 (async, READONLY), so data must be written via separate connection.
 * @created 2026-03-15
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface TestEvent {
  timestamp: number;       // Unix epoch
  eventType: string;       // 'Find', 'Create', 'Modify', 'Delete', 'Move', 'Restore'
  fileName: string;
  directory: string;
  inode?: number;
  fileSize?: number;
  lineCount?: number;
  blockCount?: number;
}

export class DatabaseTestHelper {
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

  /**
   * Create a production-compliant database with FUNC-000 schema
   */
  createTestDb(dbPath?: string): void {
    const targetPath = dbPath || this.dbPath;
    const db = new Database(targetPath);

    db.pragma('foreign_keys = ON');

    db.exec(`
      CREATE TABLE IF NOT EXISTS event_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL UNIQUE,
        description TEXT
      );

      INSERT OR IGNORE INTO event_types (code, name, description) VALUES
        ('find', 'Find', 'Initial file discovery'),
        ('create', 'Create', 'File creation'),
        ('modify', 'Modify', 'File modification'),
        ('delete', 'Delete', 'File deletion'),
        ('move', 'Move', 'File move/rename'),
        ('restore', 'Restore', 'File restoration');

      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        event_type_id INTEGER NOT NULL,
        file_name TEXT NOT NULL,
        directory TEXT NOT NULL,
        FOREIGN KEY (event_type_id) REFERENCES event_types(id)
      );

      CREATE TABLE IF NOT EXISTS measurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        inode INTEGER,
        file_size INTEGER,
        line_count INTEGER,
        block_count INTEGER,
        FOREIGN KEY (event_id) REFERENCES events(id)
      );
    `);

    db.close();
  }

  /**
   * Insert test events into an existing database
   */
  insertTestEvents(events: TestEvent[], dbPath?: string): void {
    const targetPath = dbPath || this.dbPath;
    const db = new Database(targetPath);

    const insertEvent = db.prepare(`
      INSERT INTO events (timestamp, event_type_id, file_name, directory)
      VALUES (?, (SELECT id FROM event_types WHERE name = ?), ?, ?)
    `);

    const insertMeasurement = db.prepare(`
      INSERT INTO measurements (event_id, inode, file_size, line_count, block_count)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((evts: TestEvent[]) => {
      for (const evt of evts) {
        const result = insertEvent.run(evt.timestamp, evt.eventType, evt.fileName, evt.directory);
        const eventId = result.lastInsertRowid;
        insertMeasurement.run(
          eventId,
          evt.inode ?? 0,
          evt.fileSize ?? 0,
          evt.lineCount ?? 0,
          evt.blockCount ?? 0
        );
      }
    });

    insertMany(events);
    db.close();
  }

  /**
   * Create a database with sample test data
   */
  createTestDbWithSampleData(dbPath?: string): void {
    this.createTestDb(dbPath);

    const now = Math.floor(Date.now() / 1000);
    const sampleEvents: TestEvent[] = [
      { timestamp: now - 300, eventType: 'Find', fileName: 'app.ts', directory: '/src', inode: 1001, fileSize: 2048, lineCount: 50, blockCount: 4 },
      { timestamp: now - 200, eventType: 'Create', fileName: 'utils.ts', directory: '/src/utils', inode: 1002, fileSize: 1024, lineCount: 30, blockCount: 2 },
      { timestamp: now - 100, eventType: 'Modify', fileName: 'app.ts', directory: '/src', inode: 1001, fileSize: 2560, lineCount: 65, blockCount: 5 },
      { timestamp: now - 50, eventType: 'Delete', fileName: 'old.ts', directory: '/src', inode: 1003, fileSize: 512, lineCount: 10, blockCount: 1 },
      { timestamp: now, eventType: 'Create', fileName: 'new-feature.ts', directory: '/src/features', inode: 1004, fileSize: 4096, lineCount: 120, blockCount: 8 },
    ];

    this.insertTestEvents(sampleEvents, dbPath);
  }

  /**
   * Create an empty database (schema only, no data)
   */
  createEmptyTestDb(dbPath?: string): void {
    this.createTestDb(dbPath);
  }
}
