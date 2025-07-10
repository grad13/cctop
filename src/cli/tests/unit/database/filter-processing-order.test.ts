import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseAdapterFunc000 } from '../../../src/database/database-adapter-func000';
import { Database } from '../../../../daemon/src/database/database';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Filter Processing Order', () => {
  let adapter: DatabaseAdapterFunc000;
  let daemonDb: Database;
  let dbPath: string;
  let testDir: string;

  beforeEach(async () => {
    // Create test environment
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cctop-filter-test-'));
    dbPath = path.join(testDir, 'test-activity.db');
    
    // Create FUNC-000 compliant database using daemon Database class
    daemonDb = new Database(dbPath);
    await daemonDb.connect();
    
    // Now create CLI adapter for read-only access
    adapter = new DatabaseAdapterFunc000(dbPath);
    await adapter.connect();
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.disconnect();
    }
    if (daemonDb) {
      await daemonDb.close();
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
      await insertTestEvents(daemonDb, testEvents);

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

      await insertTestEvents(daemonDb, testEvents);

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

      await insertTestEvents(daemonDb, testEvents);

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


// テストデータ挿入ヘルパー関数
async function insertTestEvents(daemonDb: Database, events: any[]): Promise<void> {
  for (const event of events) {
    await daemonDb.insertEvent({
      // Convert to FileEvent format
      eventType: event.event_type,
      filePath: path.join('/test', event.file_name),
      fileName: event.file_name,              // ← FUNC-000準拠：追加必要
      directory: '/test',                     // ← FUNC-000準拠：追加必要
      timestamp: new Date(event.timestamp),
    }, {
      inode: event.file_id || 12345,
      fileSize: 1024,
      lineCount: 50,
      blockCount: 5
    });
  }
}