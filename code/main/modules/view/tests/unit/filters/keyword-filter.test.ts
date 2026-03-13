import { describe, it, expect, beforeEach } from 'vitest';
import { KeywordSearchManager, EventData, SearchResult } from '../../../src/filters/KeywordSearchManager.js';

/**
 * Keyword search test
 * Tests DB search on [Enter] key and vanilla table integration
 * Tests implementation file src/filters/KeywordSearchManager.ts
 */

describe('Keyword Search System', () => {
  let keywordManager: KeywordSearchManager;

  beforeEach(() => {
    keywordManager = new KeywordSearchManager();
  });

  describe('[Enter]時のDB検索（HO仕様）', () => {
    it('should execute DB search and integrate results into vanilla table on Enter', async () => {
      // 初期vanilla table
      const initialEvents: EventData[] = [
        { id: 1, file_id: 1, file_name: 'existing.txt', event_type: 'Create', timestamp: '2025-01-01 10:00:00', directory: '/test' }
      ];
      keywordManager.initializeVanillaTable(initialEvents);

      // [Enter]でDB検索実行
      const searchResults = await keywordManager.executeKeywordSearch('important');

      // DB検索結果が取得されることを確認
      expect(searchResults.length).toBeGreaterThan(0);
      
      // vanilla tableに統合されることを確認
      const vanillaTable = keywordManager.getVanillaTable();
      expect(vanillaTable.length).toBeGreaterThan(initialEvents.length);
      
      // 重複が発生していないことを確認
      const ids = vanillaTable.map(event => event.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it('should not execute search for empty keyword', async () => {
      const initialSize = keywordManager.getVanillaTableSize();
      
      const results = await keywordManager.executeKeywordSearch('');
      
      expect(results).toHaveLength(0);
      expect(keywordManager.getVanillaTableSize()).toBe(initialSize);
    });

    it('should cache search results for performance', async () => {
      await keywordManager.executeKeywordSearch('important');
      
      const cache = keywordManager.getSearchResultsCache();
      expect(cache.has('important')).toBe(true);
      expect(cache.get('important')?.length).toBeGreaterThan(0);
    });

    it('should maintain search history', async () => {
      await keywordManager.executeKeywordSearch('test');
      await keywordManager.executeKeywordSearch('important');
      await keywordManager.executeKeywordSearch('config');
      
      const history = keywordManager.getSearchHistory();
      expect(history).toEqual(['test', 'important', 'config']);
    });

    it('should not duplicate search terms in history', async () => {
      await keywordManager.executeKeywordSearch('important');
      await keywordManager.executeKeywordSearch('test');
      await keywordManager.executeKeywordSearch('important'); // 重複
      
      const history = keywordManager.getSearchHistory();
      expect(history).toEqual(['important', 'test']); // 重複なし
    });
  });

  describe('vanilla table容量管理', () => {
    it('should optimize vanilla table when exceeding capacity', async () => {
      // 大量のイベントでvanilla tableを満杯にする
      const manyEvents: EventData[] = [];
      for (let i = 0; i < 1050; i++) { // MAX_VANILLA_EVENTS(1000)を超える
        manyEvents.push({
          id: i,
          file_id: i,
          file_name: `file-${i}.txt`,
          event_type: 'Create',
          timestamp: `2025-01-01 ${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00`,
          directory: '/test'
        });
      }
      
      keywordManager.initializeVanillaTable(manyEvents);
      
      // 検索実行で新しいイベント追加
      await keywordManager.executeKeywordSearch('important');
      
      // 容量制限内に収まっていることを確認
      expect(keywordManager.getVanillaTableSize()).toBeLessThanOrEqual(1000);
    });

    it('should remove oldest events during optimization', async () => {
      // 時系列の異なるイベントを作成
      const events: EventData[] = [
        { id: 1, file_id: 1, file_name: 'old.txt', event_type: 'Create', timestamp: '2024-01-01 10:00:00', directory: '/test' },
        { id: 2, file_id: 2, file_name: 'newer.txt', event_type: 'Create', timestamp: '2025-01-01 10:00:00', directory: '/test' },
      ];
      
      // MAX_VANILLA_EVENTSを小さく設定してテスト
      (keywordManager as any).MAX_VANILLA_EVENTS = 3;
      keywordManager.initializeVanillaTable(events);
      
      // 新しいイベントを追加（容量オーバー）
      await keywordManager.executeKeywordSearch('important');
      
      const remainingEvents = keywordManager.getVanillaTable();
      
      // 古いイベントが削除されていることを確認
      const hasOldEvent = remainingEvents.some(event => event.timestamp.startsWith('2024'));
      expect(hasOldEvent).toBe(false);
    });
  });

  describe('リアルタイムフィルタリング', () => {
    it('should filter vanilla table by keyword in real-time', () => {
      // テストデータを設定
      const events: EventData[] = [
        { id: 1, file_id: 1, file_name: 'important-file.txt', event_type: 'Create', timestamp: '2025-01-01 10:00:00', directory: '/test' },
        { id: 2, file_id: 2, file_name: 'normal.txt', event_type: 'Create', timestamp: '2025-01-01 10:01:00', directory: '/docs/important' },
        { id: 3, file_id: 3, file_name: 'config.json', event_type: 'Create', timestamp: '2025-01-01 10:02:00', directory: '/regular' },
      ];
      
      keywordManager.initializeVanillaTable(events);
      
      // キーワードフィルタリング実行
      const filtered = keywordManager.applyKeywordFilter('important');
      
      // ファイル名またはディレクトリに'important'を含むもののみ
      expect(filtered).toHaveLength(2);
      expect(filtered.every(event => 
        event.file_name.includes('important') || event.directory.includes('important')
      )).toBe(true);
    });

    it('should return all events when keyword is empty', () => {
      const events: EventData[] = [
        { id: 1, file_id: 1, file_name: 'file1.txt', event_type: 'Create', timestamp: '2025-01-01 10:00:00', directory: '/test' },
        { id: 2, file_id: 2, file_name: 'file2.txt', event_type: 'Create', timestamp: '2025-01-01 10:01:00', directory: '/test' },
      ];
      
      keywordManager.initializeVanillaTable(events);
      
      const filtered = keywordManager.applyKeywordFilter('');
      
      expect(filtered).toHaveLength(events.length);
      expect(filtered).toEqual(events);
    });

    it('should handle whitespace-only keywords', () => {
      const events: EventData[] = [
        { id: 1, file_id: 1, file_name: 'file.txt', event_type: 'Create', timestamp: '2025-01-01 10:00:00', directory: '/test' }
      ];
      
      keywordManager.initializeVanillaTable(events);
      
      const filtered = keywordManager.applyKeywordFilter('   ');
      
      expect(filtered).toEqual(events); // 全て返す
    });
  });

  describe('統合フロー', () => {
    it('should integrate DB search + real-time filtering correctly', async () => {
      // 初期vanilla table
      const initialEvents: EventData[] = [
        { id: 1, file_id: 1, file_name: 'local-important.txt', event_type: 'Create', timestamp: '2025-01-01 09:00:00', directory: '/local' }
      ];
      keywordManager.initializeVanillaTable(initialEvents);

      // [Enter]でDB検索実行（'important'を検索）
      await keywordManager.executeKeywordSearch('important');

      // リアルタイムフィルタリング適用（'important'でフィルタ）
      const filteredResults = keywordManager.applyKeywordFilter('important');

      // 初期データ + DB検索結果の両方から'important'を含むものが取得される
      expect(filteredResults.length).toBeGreaterThan(1);
      expect(filteredResults.every(event =>
        event.file_name.includes('important') || event.directory.includes('important')
      )).toBe(true);

      // 初期データも含まれることを確認
      const hasLocalEvent = filteredResults.some(event => event.file_name === 'local-important.txt');
      expect(hasLocalEvent).toBe(true);
    });

    it('should maintain data integrity across multiple search operations', async () => {
      // 複数回のDB検索
      await keywordManager.executeKeywordSearch('important');
      await keywordManager.executeKeywordSearch('config');
      await keywordManager.executeKeywordSearch('test');

      const vanillaTable = keywordManager.getVanillaTable();
      
      // 重複がないことを確認
      const ids = vanillaTable.map(event => event.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);

      // 各検索結果が適切に統合されていることを確認
      const hasImportantResults = vanillaTable.some(event => 
        event.file_name.includes('important') || event.directory.includes('important')
      );
      const hasConfigResults = vanillaTable.some(event => 
        event.file_name.includes('config')
      );
      
      expect(hasImportantResults).toBe(true);
      expect(hasConfigResults).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in search keywords', async () => {
      const results = await keywordManager.executeKeywordSearch('test-file.txt');
      
      // エラーが発生しないことを確認
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle very long keywords', async () => {
      const longKeyword = 'a'.repeat(1000);
      
      const results = await keywordManager.executeKeywordSearch(longKeyword);
      
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(0); // 該当なし
    });

    it('should handle concurrent search operations gracefully', async () => {
      // 同時検索実行
      const [results1, results2, results3] = await Promise.all([
        keywordManager.executeKeywordSearch('important'),
        keywordManager.executeKeywordSearch('config'),
        keywordManager.executeKeywordSearch('test')
      ]);

      // 全て正常に完了することを確認
      expect(Array.isArray(results1)).toBe(true);
      expect(Array.isArray(results2)).toBe(true);
      expect(Array.isArray(results3)).toBe(true);

      // データ整合性確認
      const vanillaTable = keywordManager.getVanillaTable();
      const ids = vanillaTable.map(event => event.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it('should clear all data correctly', () => {
      // データを設定
      keywordManager.initializeVanillaTable([
        { id: 1, file_id: 1, file_name: 'test.txt', event_type: 'Create', timestamp: '2025-01-01 10:00:00', directory: '/test' }
      ]);

      keywordManager.clearAll();

      // 全てがクリアされることを確認
      expect(keywordManager.getVanillaTableSize()).toBe(0);
      expect(keywordManager.getSearchHistory()).toHaveLength(0);
      expect(keywordManager.getSearchResultsCache().size).toBe(0);
    });
  });
});