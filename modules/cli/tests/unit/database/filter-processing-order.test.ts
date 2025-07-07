import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseAdapterFunc000 } from '../../src/database/database-adapter-func000';
import { createTestDatabase } from './test-helpers/database-test-setup';

describe('Filter Processing Order', () => {
  let adapter: DatabaseAdapterFunc000;
  let dbPath: string;

  beforeEach(async () => {
    const testDb = await createTestDatabase();
    adapter = testDb.adapter;
    dbPath = testDb.dbPath;
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.disconnect();
    }
  });

  describe('Unique Mode Filter Processing', () => {
    it('should exclude deleted files when delete events are filtered', async () => {
      // テストデータ作成：削除されたファイルと生存しているファイル
      const testEvents = [
        // File 1: Created → Modified → Deleted (削除されたファイル)
        { file_id: 1, file_name: 'deleted-file.txt', event_type: 'Create', timestamp: '2025-01-01 10:00:00' },
        { file_id: 1, file_name: 'deleted-file.txt', event_type: 'Modify', timestamp: '2025-01-01 10:01:00' },
        { file_id: 1, file_name: 'deleted-file.txt', event_type: 'Delete', timestamp: '2025-01-01 10:02:00' },
        
        // File 2: Created → Modified (生存しているファイル)
        { file_id: 2, file_name: 'active-file.txt', event_type: 'Create', timestamp: '2025-01-01 10:00:00' },
        { file_id: 2, file_name: 'active-file.txt', event_type: 'Modify', timestamp: '2025-01-01 10:01:00' },
        
        // File 3: Created only (生存しているファイル)
        { file_id: 3, file_name: 'new-file.txt', event_type: 'Create', timestamp: '2025-01-01 10:00:00' },
      ];

      // データベースにテストデータを挿入
      await insertTestEvents(adapter, testEvents);

      // Delete eventを除外したフィルターでテスト
      const resultWithDeleteFilter = await adapter.getEvents({
        keyword: '',
        filters: ['Create', 'Modify'], // Delete除外
        mode: 'unique',
        limit: 100,
        offset: 0
      });

      // 全イベントタイプを含むフィルターでテスト
      const resultWithoutDeleteFilter = await adapter.getEvents({
        keyword: '',
        filters: ['Create', 'Modify', 'Delete'], // 全て含む
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
        { file_id: 1, file_name: 'file1.txt', event_type: 'Create', timestamp: '2025-01-01 09:00:00' },
        { file_id: 2, file_name: 'file2.txt', event_type: 'Create', timestamp: '2025-01-01 10:00:00' },
        { file_id: 1, file_name: 'file1.txt', event_type: 'Delete', timestamp: '2025-01-01 11:00:00' },
        { file_id: 3, file_name: 'file3.txt', event_type: 'Create', timestamp: '2025-01-01 12:00:00' },
      ];

      await insertTestEvents(adapter, testEvents);

      const result = await adapter.getEvents({
        keyword: '',
        filters: ['Create', 'Modify'], // Delete除外
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
        { file_id: 1, file_name: 'only-delete.txt', event_type: 'Delete', timestamp: '2025-01-01 10:00:00' },
      ];

      await insertTestEvents(adapter, testEvents);

      const resultWithDeleteFilter = await adapter.getEvents({
        keyword: '',
        filters: ['Create', 'Modify'], // Delete除外
        mode: 'unique',
        limit: 100,
        offset: 0
      });

      const resultWithoutDeleteFilter = await adapter.getEvents({
        keyword: '',
        filters: ['Create', 'Modify', 'Delete'], // 全て含む
        mode: 'unique',
        limit: 100,
        offset: 0
      });

      expect(resultWithDeleteFilter).toHaveLength(0); // 除外される
      expect(resultWithoutDeleteFilter).toHaveLength(1); // 含まれる
    });
  });
});

// テストデータ挿入ヘルパー関数
async function insertTestEvents(adapter: DatabaseAdapterFunc000, events: any[]) {
  const db = (adapter as any).db;
  
  // event_typesテーブルの準備
  const eventTypes = ['Create', 'Modify', 'Delete', 'Move', 'Find', 'Restore'];
  for (const eventType of eventTypes) {
    await new Promise<void>((resolve, reject) => {
      db.run(
        'INSERT OR IGNORE INTO event_types (name) VALUES (?)',
        [eventType],
        (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // eventsテーブルにデータ挿入
  for (const event of events) {
    await new Promise<void>((resolve, reject) => {
      db.run(
        `INSERT INTO events (file_id, file_name, directory, event_type_id, timestamp) 
         VALUES (?, ?, ?, (SELECT id FROM event_types WHERE name = ?), ?)`,
        [event.file_id, event.file_name, '/test', event.event_type, event.timestamp],
        (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }
}