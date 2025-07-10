import { describe, it, expect, beforeEach } from 'vitest';
import { FilterStateManager, FilterState, EventData } from '../../../src/filters/FilterStateManager.js';

/**
 * FilterState management system test
 * Based on specified requirements
 * Tests implementation file src/filters/FilterStateManager.ts
 */

describe('FilterStateManager', () => {
  let manager: FilterStateManager;

  beforeEach(() => {
    manager = new FilterStateManager();
  });

  describe('Processing order test (most important)', () => {
    it('should exclude deleted files when delete events are filtered', () => {
      // Test data: specific examples
      const testEvents: EventData[] = [
        // ファイルA: Create → Modify → Delete (最新)
        { id: 1, file_id: 1, file_name: 'fileA.txt', event_type: 'Create', timestamp: '2025-01-01 10:00:00', directory: '/test' },
        { id: 2, file_id: 1, file_name: 'fileA.txt', event_type: 'Modify', timestamp: '2025-01-01 10:01:00', directory: '/test' },
        { id: 3, file_id: 1, file_name: 'fileA.txt', event_type: 'Delete', timestamp: '2025-01-01 10:02:00', directory: '/test' },
        
        // ファイルB: Create → Modify (生存)
        { id: 4, file_id: 2, file_name: 'fileB.txt', event_type: 'Create', timestamp: '2025-01-01 10:00:00', directory: '/test' },
        { id: 5, file_id: 2, file_name: 'fileB.txt', event_type: 'Modify', timestamp: '2025-01-01 10:01:00', directory: '/test' },
      ];

      // vanilla tableに追加
      manager.updateVanillaTable(testEvents);
      
      // unique mode設定
      manager.updateMode('unique');
      
      // Delete除外（event filterでDeleteを削除）
      manager.toggleEventFilter('Delete');
      
      // フィルタ適用
      const result = manager.applyFilters();
      
      // 検証：ファイルA全体が非表示（CreateもModifyも表示されない）
      const fileAInResult = result.find(event => event.file_id === 1);
      expect(fileAInResult).toBeUndefined();
      
      // ファイルBは表示される（最新がModifyでFilterに含まれる）
      const fileBInResult = result.find(event => event.file_id === 2);
      expect(fileBInResult).toBeDefined();
      expect(fileBInResult?.event_type).toBe('Modify');
      
      // 結果は1つのみ（ファイルBのModify）
      expect(result).toHaveLength(1);
    });

    it('should show all files when no events are filtered', () => {
      const testEvents: EventData[] = [
        { id: 1, file_id: 1, file_name: 'fileA.txt', event_type: 'Create', timestamp: '2025-01-01 10:00:00', directory: '/test' },
        { id: 2, file_id: 1, file_name: 'fileA.txt', event_type: 'Delete', timestamp: '2025-01-01 10:02:00', directory: '/test' },
        { id: 3, file_id: 2, file_name: 'fileB.txt', event_type: 'Modify', timestamp: '2025-01-01 10:01:00', directory: '/test' },
      ];

      manager.updateVanillaTable(testEvents);
      manager.updateMode('unique');
      
      // 全イベントタイプを含む（デフォルト状態）
      const result = manager.applyFilters();
      
      // 両ファイルが表示される
      expect(result).toHaveLength(2);
      
      const fileAResult = result.find(event => event.file_id === 1);
      expect(fileAResult?.event_type).toBe('Delete'); // 最新
      
      const fileBResult = result.find(event => event.file_id === 2);
      expect(fileBResult?.event_type).toBe('Modify'); // 最新
    });

    it('should handle complex file lifecycle correctly', () => {
      const testEvents: EventData[] = [
        // ファイル1: Create → Move → Delete
        { id: 1, file_id: 1, file_name: 'file1.txt', event_type: 'Create', timestamp: '2025-01-01 09:00:00', directory: '/test' },
        { id: 2, file_id: 1, file_name: 'file1.txt', event_type: 'Move', timestamp: '2025-01-01 09:30:00', directory: '/test' },
        { id: 3, file_id: 1, file_name: 'file1.txt', event_type: 'Delete', timestamp: '2025-01-01 10:00:00', directory: '/test' },
        
        // ファイル2: Create → Modify → Move
        { id: 4, file_id: 2, file_name: 'file2.txt', event_type: 'Create', timestamp: '2025-01-01 09:00:00', directory: '/test' },
        { id: 5, file_id: 2, file_name: 'file2.txt', event_type: 'Modify', timestamp: '2025-01-01 09:30:00', directory: '/test' },
        { id: 6, file_id: 2, file_name: 'file2.txt', event_type: 'Move', timestamp: '2025-01-01 10:00:00', directory: '/test' },
      ];

      manager.updateVanillaTable(testEvents);
      manager.updateMode('unique');
      
      // DeleteとMoveを除外
      manager.toggleEventFilter('Delete');
      manager.toggleEventFilter('Move');
      
      const result = manager.applyFilters();
      
      // ファイル1: 最新がDeleteなので全体が非表示
      // ファイル2: 最新がMoveなので全体が非表示
      expect(result).toHaveLength(0);
    });
  });

  describe('All Mode処理', () => {
    it('should apply event filter to all events in all mode', () => {
      const testEvents: EventData[] = [
        { id: 1, file_id: 1, file_name: 'file.txt', event_type: 'Create', timestamp: '2025-01-01 10:00:00', directory: '/test' },
        { id: 2, file_id: 1, file_name: 'file.txt', event_type: 'Modify', timestamp: '2025-01-01 10:01:00', directory: '/test' },
        { id: 3, file_id: 1, file_name: 'file.txt', event_type: 'Delete', timestamp: '2025-01-01 10:02:00', directory: '/test' },
      ];

      manager.updateVanillaTable(testEvents);
      manager.updateMode('all');
      
      // Deleteを除外
      manager.toggleEventFilter('Delete');
      
      const result = manager.applyFilters();
      
      // CreateとModifyのみ表示される
      expect(result).toHaveLength(2);
      expect(result.every(event => event.event_type !== 'Delete')).toBe(true);
    });
  });

  describe('Keyword Filter', () => {
    it('should filter by file name and directory', () => {
      const testEvents: EventData[] = [
        { id: 1, file_id: 1, file_name: 'important.txt', event_type: 'Create', timestamp: '2025-01-01 10:00:00', directory: '/test' },
        { id: 2, file_id: 2, file_name: 'other.txt', event_type: 'Create', timestamp: '2025-01-01 10:01:00', directory: '/important' },
        { id: 3, file_id: 3, file_name: 'normal.txt', event_type: 'Create', timestamp: '2025-01-01 10:02:00', directory: '/test' },
      ];

      manager.updateVanillaTable(testEvents);
      manager.updateKeywordFilter('important');
      
      const result = manager.applyFilters();
      
      // ファイル名またはディレクトリに"important"を含むものだけ
      expect(result).toHaveLength(2);
      expect(result.some(event => event.file_name.includes('important'))).toBe(true);
      expect(result.some(event => event.directory.includes('important'))).toBe(true);
    });
  });

  describe('状態管理', () => {
    it('should reset filters correctly', () => {
      // 状態を変更
      manager.updateMode('unique');
      manager.toggleEventFilter('Delete');
      manager.updateKeywordFilter('test');
      
      // リセット
      manager.resetFilters();
      
      const state = manager.getState();
      expect(state.mode).toBe('all');
      expect(state.eventFilters).toEqual(['Create', 'Modify', 'Delete', 'Move', 'Find', 'Restore']);
      expect(state.keywordFilter).toBe('');
    });

    it('should toggle event filters correctly', () => {
      const initialState = manager.getState();
      expect(initialState.eventFilters).toContain('Delete');
      
      // Deleteを除外
      manager.toggleEventFilter('Delete');
      expect(manager.getState().eventFilters).not.toContain('Delete');
      
      // Deleteを再追加
      manager.toggleEventFilter('Delete');
      expect(manager.getState().eventFilters).toContain('Delete');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty vanilla table', () => {
      const result = manager.applyFilters();
      expect(result).toHaveLength(0);
    });

    it('should handle files with only filtered events', () => {
      const testEvents: EventData[] = [
        { id: 1, file_id: 1, file_name: 'file.txt', event_type: 'Delete', timestamp: '2025-01-01 10:00:00', directory: '/test' },
      ];

      manager.updateVanillaTable(testEvents);
      manager.updateMode('unique');
      manager.toggleEventFilter('Delete'); // Delete除外
      
      const result = manager.applyFilters();
      expect(result).toHaveLength(0);
    });

    it('should maintain chronological order', () => {
      const testEvents: EventData[] = [
        { id: 1, file_id: 1, file_name: 'file1.txt', event_type: 'Create', timestamp: '2025-01-01 08:00:00', directory: '/test' },
        { id: 2, file_id: 2, file_name: 'file2.txt', event_type: 'Create', timestamp: '2025-01-01 10:00:00', directory: '/test' },
        { id: 3, file_id: 3, file_name: 'file3.txt', event_type: 'Create', timestamp: '2025-01-01 09:00:00', directory: '/test' },
      ];

      manager.updateVanillaTable(testEvents);
      
      const result = manager.applyFilters();
      
      // 時系列降順でソートされていることを確認
      expect(result[0].timestamp).toBe('2025-01-01 10:00:00'); // 最新
      expect(result[1].timestamp).toBe('2025-01-01 09:00:00'); // 中間
      expect(result[2].timestamp).toBe('2025-01-01 08:00:00'); // 最古
    });
  });
});