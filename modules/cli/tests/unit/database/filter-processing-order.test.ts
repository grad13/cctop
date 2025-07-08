import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseAdapterFunc000 } from '../../../src/database/database-adapter-func000';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Database as SqliteDatabase } from 'sqlite3';

describe('Filter Processing Order', () => {
  let adapter: DatabaseAdapterFunc000;
  let dbPath: string;
  let testDir: string;

  beforeEach(async () => {
    // Create test environment
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cctop-filter-test-'));
    dbPath = path.join(testDir, 'test-activity.db');
    
    // Create minimal FUNC-000 compliant schema
    await createTestSchema(dbPath);
    
    // Now create CLI adapter for read-only access
    adapter = new DatabaseAdapterFunc000(dbPath);
    await adapter.connect();
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.disconnect();
    }
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Unique Mode Filter Processing', () => {
    it('should exclude deleted files when delete events are filtered', async () => {
      // テストデータ作成：削除されたファイルと生存しているファイル
      const testEvents = [
        // File 1: Created → Modified → Deleted (削除されたファイル)
        { file_id: 1, file_name: 'deleted-file.txt', event_type: 'create', timestamp: '2025-01-01 10:00:00' },
        { file_id: 1, file_name: 'deleted-file.txt', event_type: 'modify', timestamp: '2025-01-01 10:01:00' },
        { file_id: 1, file_name: 'deleted-file.txt', event_type: 'delete', timestamp: '2025-01-01 10:02:00' },
        
        // File 2: Created → Modified (生存しているファイル)
        { file_id: 2, file_name: 'active-file.txt', event_type: 'create', timestamp: '2025-01-01 10:00:00' },
        { file_id: 2, file_name: 'active-file.txt', event_type: 'modify', timestamp: '2025-01-01 10:01:00' },
        
        // File 3: Created only (生存しているファイル)
        { file_id: 3, file_name: 'new-file.txt', event_type: 'create', timestamp: '2025-01-01 10:00:00' },
      ];

      // データベースにテストデータを挿入
      await insertTestEvents(dbPath, testEvents);

      // Delete eventを除外したフィルターでテスト
      const resultWithDeleteFilter = await adapter.searchEvents({
        keyword: '',
        filters: ['Create', 'Modify'], // Delete除外（大文字に修正）
        mode: 'unique',
        limit: 100,
        offset: 0
      });

      // 全イベントタイプを含むフィルターでテスト
      const resultWithoutDeleteFilter = await adapter.searchEvents({
        keyword: '',
        filters: ['Create', 'Modify', 'Delete'], // 全て含む（大文字に修正）
        mode: 'unique',
        limit: 100,
        offset: 0
      });

      // 検証
      expect(resultWithDeleteFilter).toHaveLength(2); // File 2のModify + File 3のCreate
      expect(resultWithoutDeleteFilter).toHaveLength(3); // File 1のDelete + File 2のModify + File 3のCreate
      
      // 削除されたファイルが適切に除外されていることを確認
      const deletedFileInFilteredResult = resultWithDeleteFilter.find(
        event => event.filename === 'deleted-file.txt'
      );
      expect(deletedFileInFilteredResult).toBeUndefined();
      
      // 削除されたファイルが全イベントフィルターには含まれることを確認
      const deletedFileInUnfilteredResult = resultWithoutDeleteFilter.find(
        event => event.filename === 'deleted-file.txt'
      );
      expect(deletedFileInUnfilteredResult).toBeDefined();
      expect(deletedFileInUnfilteredResult?.event_type).toBe('Delete');
    });

    it('should maintain correct order after filter processing', async () => {
      const testEvents = [
        // 複数ファイルの複雑な履歴
        { file_id: 1, file_name: 'file1.txt', event_type: 'create', timestamp: '2025-01-01 09:00:00' },
        { file_id: 2, file_name: 'file2.txt', event_type: 'create', timestamp: '2025-01-01 10:00:00' },
        { file_id: 1, file_name: 'file1.txt', event_type: 'delete', timestamp: '2025-01-01 11:00:00' },
        { file_id: 3, file_name: 'file3.txt', event_type: 'create', timestamp: '2025-01-01 12:00:00' },
      ];

      await insertTestEvents(dbPath, testEvents);

      const result = await adapter.searchEvents({
        keyword: '',
        filters: ['Create', 'Modify'], // Delete除外（大文字に修正）
        mode: 'unique',
        limit: 100,
        offset: 0
      });

      // 時系列順序の確認
      expect(result).toHaveLength(2); // file2とfile3のみ
      expect(result[0].timestamp).toBeGreaterThan(result[1].timestamp); // 降順
      expect(result[0].filename).toBe('file3.txt'); // 最新
      expect(result[1].filename).toBe('file2.txt'); // 次に新しい
    });
  });

  describe('Edge Cases', () => {
    it('should handle files with only delete events', async () => {
      const testEvents = [
        { file_id: 1, file_name: 'only-delete.txt', event_type: 'delete', timestamp: '2025-01-01 10:00:00' },
      ];

      await insertTestEvents(dbPath, testEvents);

      const resultWithDeleteFilter = await adapter.searchEvents({
        keyword: '',
        filters: ['Create', 'Modify'], // Delete除外（大文字に修正）
        mode: 'unique',
        limit: 100,
        offset: 0
      });

      const resultWithoutDeleteFilter = await adapter.searchEvents({
        keyword: '',
        filters: ['Create', 'Modify', 'Delete'], // 全て含む（大文字に修正）
        mode: 'unique',
        limit: 100,
        offset: 0
      });

      expect(resultWithDeleteFilter).toHaveLength(0); // 除外される
      expect(resultWithoutDeleteFilter).toHaveLength(1); // 含まれる
    });
  });
});

// スキーマ作成ヘルパー関数
async function createTestSchema(dbPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const db = new SqliteDatabase(dbPath);
    
    const schemaSQL = `
      PRAGMA foreign_keys = ON;
      
      CREATE TABLE IF NOT EXISTS event_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        directory TEXT NOT NULL,
        full_path TEXT NOT NULL UNIQUE,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        event_type TEXT NOT NULL,
        filename TEXT NOT NULL,
        directory TEXT,
        lines INTEGER,
        blocks INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (event_type) REFERENCES event_types(name)
      );
      
      CREATE TABLE IF NOT EXISTS measurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        inode INTEGER,
        file_size INTEGER,
        line_count INTEGER,
        block_count INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (event_id) REFERENCES events(id)
      );
      
      INSERT OR IGNORE INTO event_types (name, description) VALUES 
        ('find', 'File discovered'),
        ('create', 'File created'),
        ('modify', 'File modified'),
        ('delete', 'File deleted'),
        ('move', 'File moved'),
        ('restore', 'File restored');
    `;
    
    db.exec(schemaSQL, (err) => {
      db.close();
      if (err) reject(err);
      else resolve();
    });
  });
}

// テストデータ挿入ヘルパー関数
async function insertTestEvents(dbPath: string, events: any[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const db = new SqliteDatabase(dbPath);
    
    // 直列でイベント挿入
    const insertNextEvent = (index: number) => {
      if (index >= events.length) {
        db.close();
        resolve();
        return;
      }
      
      const event = events[index];
      const sql = `
        INSERT INTO events (timestamp, event_type, filename, directory, lines, blocks)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      db.run(sql, [
        event.timestamp,
        event.event_type,
        event.file_name,
        '/test',
        50, // lines
        5   // blocks
      ], (err) => {
        if (err) {
          db.close();
          reject(err);
        } else {
          insertNextEvent(index + 1);
        }
      });
    };
    
    insertNextEvent(0);
  });
}