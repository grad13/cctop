import { describe, it, expect, beforeEach } from 'vitest';
import { ESCOperationManager, FilterState } from '../../src/input/ESCOperationManager.js';

/**
 * ESC operation test
 * Tests two different ESC behaviors
 * Tests implementation file src/input/ESCOperationManager.ts
 */

describe('ESC Operations', () => {
  let escManager: ESCOperationManager;

  beforeEach(() => {
    escManager = new ESCOperationManager();
  });

  describe('編集モード中のESC操作', () => {
    it('should restore previous state when ESC is pressed during event filter editing', () => {
      // 初期状態でフィルターを設定
      escManager.updateState({
        mode: 'unique',
        eventFilters: ['Create', 'Modify'], // Deleteを除外
        keywordFilter: 'important'
      });

      const stateBeforeEdit = escManager.getCurrentState();

      // Event Filter編集モードに入る
      escManager.enterEditingMode('eventFilter');
      expect(escManager.getCurrentMode()).toBe('editing');

      // 編集中に状態を変更
      escManager.updateState({
        eventFilters: ['Create'] // さらにModifyも除外
      });

      // ESC押下で編集破棄
      const restoredState = escManager.executeEscape();

      // 編集前の状態に戻ることを確認
      expect(restoredState).toEqual(stateBeforeEdit);
      expect(restoredState.eventFilters).toEqual(['Create', 'Modify']);
      expect(escManager.getCurrentMode()).toBe('normal');
    });

    it('should restore previous state when ESC is pressed during keyword filter editing', () => {
      // 初期状態を設定
      escManager.updateState({
        mode: 'all',
        eventFilters: ['Create', 'Modify', 'Delete'],
        keywordFilter: 'test'
      });

      const stateBeforeEdit = escManager.getCurrentState();

      // Keyword Filter編集モードに入る
      escManager.enterEditingMode('keywordFilter');

      // 編集中にキーワードを変更
      escManager.updateState({
        keywordFilter: 'important-changed'
      });

      // ESC押下で編集破棄
      const restoredState = escManager.executeEscape();

      // 編集前の状態に戻ることを確認
      expect(restoredState).toEqual(stateBeforeEdit);
      expect(restoredState.keywordFilter).toBe('test');
      expect(escManager.getCurrentMode()).toBe('normal');
    });

    it('should handle multiple edit sessions with proper state restoration', () => {
      // 複数回の編集セッションテスト
      
      // 1回目の編集
      escManager.updateState({
        mode: 'unique',
        keywordFilter: 'session1'
      });

      escManager.enterEditingMode('keywordFilter');
      escManager.updateState({ keywordFilter: 'temp1' });
      const firstRestore = escManager.executeEscape();
      expect(firstRestore.keywordFilter).toBe('session1');

      // 2回目の編集
      escManager.updateState({ keywordFilter: 'session2' });
      escManager.enterEditingMode('keywordFilter');
      escManager.updateState({ keywordFilter: 'temp2' });
      const secondRestore = escManager.executeEscape();
      expect(secondRestore.keywordFilter).toBe('session2');
    });
  });

  describe('Normal Mode中のESC操作', () => {
    it('should reset all filters to default state when ESC is pressed in normal mode', () => {
      // 複雑な状態を設定
      escManager.updateState({
        mode: 'unique',
        eventFilters: ['Create', 'Modify'], // 一部除外
        keywordFilter: 'complex-filter'
      });

      // Normal ModeでESC押下
      const resetState = escManager.executeEscape();

      // 初期化状態: all mode + no filters
      const expectedDefaultState = {
        mode: 'all',
        eventFilters: ['Create', 'Modify', 'Delete', 'Move', 'Find', 'Restore'],
        keywordFilter: ''
      };

      expect(resetState).toEqual(expectedDefaultState);
      expect(escManager.getCurrentMode()).toBe('normal');
    });

    it('should reset to default even from complex filtered state', () => {
      // 複数のフィルターが適用された複雑な状態
      escManager.updateState({
        mode: 'unique',
        eventFilters: ['Create'], // 大部分除外
        keywordFilter: 'very-specific-search-term'
      });

      // Normal ModeでESC押下
      const resetState = escManager.executeEscape();

      // 全て初期状態に戻る
      expect(resetState.mode).toBe('all');
      expect(resetState.eventFilters).toHaveLength(6); // 全イベントタイプ
      expect(resetState.keywordFilter).toBe('');
    });

    it('should not affect normal mode ESC when no editing session is active', () => {
      // 編集セッションなしでESC実行
      escManager.updateState({
        mode: 'unique',
        eventFilters: ['Create', 'Modify'],
        keywordFilter: 'test'
      });

      const resetState = escManager.executeEscape();

      // 初期状態にリセット
      expect(resetState.mode).toBe('all');
      expect(resetState.eventFilters).toEqual(['Create', 'Modify', 'Delete', 'Move', 'Find', 'Restore']);
      expect(resetState.keywordFilter).toBe('');
    });
  });

  describe('モード状態管理', () => {
    it('should correctly track editing vs normal mode transitions', () => {
      // 初期状態: normal
      expect(escManager.getCurrentMode()).toBe('normal');

      // 編集モードに入る
      escManager.enterEditingMode('eventFilter');
      expect(escManager.getCurrentMode()).toBe('editing');

      // ESCで編集終了 → normal mode
      escManager.executeEscape();
      expect(escManager.getCurrentMode()).toBe('normal');

      // 再度編集モード
      escManager.enterEditingMode('keywordFilter');
      expect(escManager.getCurrentMode()).toBe('editing');

      // ESCで編集終了
      escManager.executeEscape();
      expect(escManager.getCurrentMode()).toBe('normal');
    });

    it('should maintain mode consistency across multiple operations', () => {
      // 複数の操作にわたってモード整合性を維持
      const operations = [
        () => escManager.enterEditingMode('eventFilter'),
        () => escManager.updateState({ eventFilters: ['Create'] }),
        () => escManager.executeEscape(), // 編集破棄
        () => escManager.enterEditingMode('keywordFilter'),
        () => escManager.updateState({ keywordFilter: 'test' }),
        () => escManager.executeEscape(), // 編集破棄
        () => escManager.executeEscape()  // 全クリア
      ];

      for (const operation of operations) {
        operation();
        // 各操作後もモードが適切に管理されている
        expect(['normal', 'editing']).toContain(escManager.getCurrentMode());
      }

      // 最終的にnormal modeであることを確認
      expect(escManager.getCurrentMode()).toBe('normal');
    });
  });

  describe('Edge Cases', () => {
    it('should handle ESC when no previous state exists', () => {
      // previousStateがnullの状態でESC
      escManager.enterEditingMode('eventFilter');
      
      // previousStateを強制的にクリア（エッジケース）
      (escManager as any).previousState = null;
      
      const result = escManager.executeEscape();
      
      // エラーが発生せず、現在の状態が維持される
      expect(result).toBeDefined();
      expect(escManager.getCurrentMode()).toBe('normal');
    });

    it('should handle rapid ESC operations', () => {
      // 連続ESC操作
      escManager.updateState({ keywordFilter: 'test' });
      
      const result1 = escManager.executeEscape(); // 1回目
      const result2 = escManager.executeEscape(); // 2回目（即座）
      
      // 両方とも初期状態になる
      expect(result1.keywordFilter).toBe('');
      expect(result2.keywordFilter).toBe('');
      expect(escManager.getCurrentMode()).toBe('normal');
    });

    it('should preserve state integrity during complex edit sequences', () => {
      // 複雑な編集シーケンス
      escManager.updateState({ mode: 'unique', keywordFilter: 'base' });
      
      // 1. 編集開始
      escManager.enterEditingMode('keywordFilter');
      escManager.updateState({ keywordFilter: 'edit1' });
      
      // 2. 編集キャンセル
      escManager.executeEscape();
      expect(escManager.getCurrentState().keywordFilter).toBe('base');
      
      // 3. 再度編集
      escManager.enterEditingMode('keywordFilter');
      escManager.updateState({ keywordFilter: 'edit2' });
      
      // 4. 編集確定（ESCではなく通常確定の想定）
      (escManager as any).currentMode = 'normal';
      (escManager as any).previousState = null;
      
      // 5. 全クリア
      const finalState = escManager.executeEscape();
      expect(finalState.keywordFilter).toBe('');
      expect(finalState.mode).toBe('all');
    });
  });
});