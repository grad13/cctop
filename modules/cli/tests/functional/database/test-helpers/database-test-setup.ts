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
    await this.setupTestData(adapter);
  }

  private async setupTestData(adapter: DatabaseAdapter): Promise<void> {
    // Create basic test table for connection tests
    try {
      const db = adapter.getDatabase();
      if (db) {
        await new Promise<void>((resolve, reject) => {
          db.run(`
            CREATE TABLE IF NOT EXISTS test_table (
              id INTEGER PRIMARY KEY,
              test_data TEXT
            )
          `, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        // Insert a simple test record
        await new Promise<void>((resolve, reject) => {
          db.run(`
            INSERT OR IGNORE INTO test_table (id, test_data) VALUES (1, 'test')
          `, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
    } catch (error) {
      // Tables creation failed, that's ok for some tests
      console.log('Test table creation failed:', error);
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