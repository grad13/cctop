/**
 * Common test setup for database adapter tests
 * Shared utilities and setup/teardown logic
 */

import { DatabaseAdapter } from '../../../src/database/database-adapter';
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
    await this.setupTestData(adapter);
  }

  private async setupTestData(adapter: DatabaseAdapter): Promise<void> {
    // Create sample test data
    const testEvents = [
      {
        id: 1,
        timestamp: '2025-07-04 15:30:45',
        event_type: 'create',
        filename: 'test1.ts',
        directory: 'src/components',
        lines: 100,
        blocks: 5
      },
      {
        id: 2,
        timestamp: '2025-07-04 15:31:00',
        event_type: 'modify',
        filename: 'test2.js',
        directory: 'lib/utils',
        lines: 50,
        blocks: 3
      },
      {
        id: 3,
        timestamp: '2025-07-04 15:31:15',
        event_type: 'find',
        filename: 'test3.md',
        directory: 'docs',
        lines: 25,
        blocks: 2
      }
    ];

    // Insert test data if tables exist
    try {
      for (const event of testEvents) {
        await adapter.database.prepare(`
          INSERT OR IGNORE INTO events (id, timestamp, event_type, filename, directory, lines, blocks)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(event.id, event.timestamp, event.event_type, event.filename, event.directory, event.lines, event.blocks);
      }
    } catch (error) {
      // Tables might not exist yet, that's ok for some tests
    }
  }

  async verifyTableExists(adapter: DatabaseAdapter, tableName: string): Promise<boolean> {
    try {
      const result = await adapter.database.prepare(`
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
      const result = await adapter.database.prepare(`
        SELECT COUNT(*) as count FROM event_types
      `).get();
      return result && result.count >= 6; // Should have at least 6 event types
    } catch (error) {
      return false;
    }
  }

  async verifyForeignKeysEnabled(adapter: DatabaseAdapter): Promise<boolean> {
    try {
      const result = await adapter.database.prepare(`
        PRAGMA foreign_keys
      `).get();
      return result && result.foreign_keys === 1;
    } catch (error) {
      return false;
    }
  }

  async verifyIndexExists(adapter: DatabaseAdapter, indexName: string): Promise<boolean> {
    try {
      const result = await adapter.database.prepare(`
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
      const result = await adapter.database.prepare(`
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