import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DynamicDataLoader, EventData, LoadingState } from '../../src/loading/DynamicDataLoader.js';

/**
 * Dynamic data loading test
 * Tests trigger conditions and load strategies
 * Tests implementation file src/loading/DynamicDataLoader.ts
 */

describe('Dynamic Data Loading System', () => {
  let loader: DynamicDataLoader;

  beforeEach(() => {
    loader = new DynamicDataLoader();
  });

  describe('画面Fill不足トリガー', () => {
    it('should trigger loading when screen rows are insufficient', async () => {
      // 画面に5行しか表示されていない状態（20行表示可能）
      loader.updateScreenState(5, 0);
      
      const triggered = await loader.checkScreenFillTrigger();
      
      expect(triggered).toBe(true);
      expect(loader.getLoadCallCount()).toBe(1);
      
      const state = loader.getLoadingState();
      expect(state.totalAvailableRows).toBeGreaterThan(5);
    });

    it('should not trigger when screen is already filled', async () => {
      // 画面がfull状態（20行表示）
      loader.updateScreenState(20, 0);
      
      const triggered = await loader.checkScreenFillTrigger();
      
      expect(triggered).toBe(false);
      expect(loader.getLoadCallCount()).toBe(0);
    });

    it('should not trigger when end of data is reached', async () => {
      // end of data状態を正しく設定
      loader.setLoadingState({
        endOfDataReached: true,
        hasMore: false
      });
      loader.updateScreenState(5, 0);
      
      const triggered = await loader.checkScreenFillTrigger();
      
      expect(triggered).toBe(false);
      expect(loader.getLoadCallCount()).toBe(0);
    });
  });

  describe('下端選択トリガー', () => {
    it('should trigger loading when selection reaches bottom', async () => {
      // 初期データ読み込み
      await loader.checkScreenFillTrigger(); // 初期読み込み
      
      const state = loader.getLoadingState();
      const bottomIndex = state.visibleRows - 1;
      
      // 選択を最下部に移動
      loader.updateScreenState(state.visibleRows, bottomIndex);
      
      const triggered = await loader.checkBottomSelectionTrigger();
      
      expect(triggered).toBe(true);
      expect(loader.getLoadCallCount()).toBe(2); // 初期 + 下端トリガー
    });

    it('should not trigger when selection is not at bottom', async () => {
      await loader.checkScreenFillTrigger(); // 初期読み込み
      
      const state = loader.getLoadingState();
      const middleIndex = Math.floor(state.visibleRows / 2);
      
      loader.updateScreenState(state.visibleRows, middleIndex);
      
      const triggered = await loader.checkBottomSelectionTrigger();
      
      expect(triggered).toBe(false);
      expect(loader.getLoadCallCount()).toBe(1); // 初期読み込みのみ
    });

    it('should not trigger when end of data is reached', async () => {
      // end of data状態を正しく設定
      loader.setLoadingState({
        endOfDataReached: true,
        hasMore: false
      });
      loader.updateScreenState(20, 19); // 最下部選択
      
      const triggered = await loader.checkBottomSelectionTrigger();
      
      expect(triggered).toBe(false);
      expect(loader.getLoadCallCount()).toBe(0);
    });
  });

  describe('100msポーリングトリガー', () => {
    it('should trigger loading on polling when more data available', async () => {
      const triggered = await loader.check100msPollingTrigger();
      
      expect(triggered).toBe(true);
      expect(loader.getLoadCallCount()).toBe(1);
    });

    it('should not trigger when already loading', async () => {
      // 読み込み中状態をシミュレート
      loader.setLoadingState({ isLoading: true });
      
      const triggered = await loader.check100msPollingTrigger();
      
      expect(triggered).toBe(false);
      expect(loader.getLoadCallCount()).toBe(0);
    });

    it('should not trigger when no more data available', async () => {
      loader.setLoadingState({ hasMore: false });
      
      const triggered = await loader.check100msPollingTrigger();
      
      expect(triggered).toBe(false);
      expect(loader.getLoadCallCount()).toBe(0);
    });
  });

  describe('ロード戦略', () => {
    it('should load initial 100 events on first load', async () => {
      await loader.checkScreenFillTrigger();
      
      const vanillaTable = loader.getVanillaTable();
      expect(vanillaTable.length).toBe(100); // 初回100件
    });

    it('should implement progressive loading up to 1000 events', async () => {
      // 段階的読み込みをシミュレート（順次実行で競合を避ける）
      for (let i = 0; i < 12; i++) { // 100 + 100*11 = 1200件を試行
        await loader.check100msPollingTrigger();
        
        // early termination if end reached
        if (loader.getLoadingState().endOfDataReached) break;
      }
      
      const vanillaTable = loader.getVanillaTable();
      expect(vanillaTable.length).toBeLessThanOrEqual(1000); // 最大1000件制限
      
      const state = loader.getLoadingState();
      expect(state.endOfDataReached).toBe(true); // 制限到達でend of data
    });

    it('should detect end of data when no more events available', async () => {
      // 大量読み込みで終端到達をテスト
      while (loader.getLoadingState().hasMore) {
        await loader.check100msPollingTrigger();
        
        // 無限ループ防止
        if (loader.getLoadCallCount() > 20) break;
      }
      
      const state = loader.getLoadingState();
      expect(state.endOfDataReached).toBe(true);
      expect(state.hasMore).toBe(false);
    });
  });

  describe('vanilla table容量管理', () => {
    it('should integrate new events with existing vanilla table', async () => {
      // 複数回の読み込み
      await loader.checkScreenFillTrigger(); // 初回
      const firstLoadSize = loader.getVanillaTable().length;
      
      await loader.check100msPollingTrigger(); // 追加
      const secondLoadSize = loader.getVanillaTable().length;
      
      expect(secondLoadSize).toBeGreaterThan(firstLoadSize);
      
      // 重複がないことを確認
      const vanillaTable = loader.getVanillaTable();
      const ids = vanillaTable.map(event => event.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it('should maintain chronological order in vanilla table', async () => {
      await loader.checkScreenFillTrigger();
      
      const vanillaTable = loader.getVanillaTable();
      
      // timestampで順序確認
      for (let i = 1; i < vanillaTable.length; i++) {
        const prevTime = new Date(vanillaTable[i-1].timestamp).getTime();
        const currentTime = new Date(vanillaTable[i].timestamp).getTime();
        
        // 新しいもの順（降順）であることを確認
        expect(prevTime).toBeGreaterThanOrEqual(currentTime);
      }
    });
  });

  describe('統合フロー', () => {
    it('should handle multiple trigger conditions in sequence', async () => {
      // 1. 画面Fill不足トリガー
      loader.updateScreenState(5, 0);
      await loader.checkScreenFillTrigger();
      
      // 2. 選択を下部に移動 → 下端トリガー
      const state1 = loader.getLoadingState();
      loader.updateScreenState(state1.visibleRows, state1.visibleRows - 1);
      await loader.checkBottomSelectionTrigger();
      
      // 3. ポーリングトリガー
      await loader.check100msPollingTrigger();
      
      expect(loader.getLoadCallCount()).toBe(3);
      
      const finalState = loader.getLoadingState();
      expect(finalState.totalAvailableRows).toBeGreaterThan(100);
    });

    it('should handle rapid user interactions without duplicate loading', async () => {
      // 高速な選択移動をシミュレート
      loader.updateScreenState(20, 0);
      
      // 複数の下端トリガーを短時間で実行
      const triggers = [];
      for (let i = 0; i < 5; i++) {
        loader.updateScreenState(20, 19); // 最下部選択
        triggers.push(loader.checkBottomSelectionTrigger());
      }
      
      await Promise.all(triggers);
      
      // 重複読み込みが発生していないことを確認
      expect(loader.getLoadCallCount()).toBeLessThanOrEqual(2); // 初期読み込み + 1回の追加読み込み
    });

    it('should properly manage loading state during concurrent operations', async () => {
      // 同時トリガー実行
      const operations = [
        loader.checkScreenFillTrigger(),
        loader.check100msPollingTrigger(),
        loader.checkBottomSelectionTrigger()
      ];
      
      await Promise.all(operations);
      
      // 最終的にloading状態が解除されていることを確認
      const finalState = loader.getLoadingState();
      expect(finalState.isLoading).toBe(false);
      
      // データ整合性確認
      const vanillaTable = loader.getVanillaTable();
      expect(vanillaTable.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty database scenario', async () => {
      // 空のDBをシミュレート
      loader.setDatabaseLoadFunction(async () => []);
      
      const triggered = await loader.checkScreenFillTrigger();
      
      expect(triggered).toBe(true); // 実行は試行される
      
      const state = loader.getLoadingState();
      expect(state.endOfDataReached).toBe(true); // すぐにend of data
      expect(state.hasMore).toBe(false);
    });

    it('should handle loading errors gracefully', async () => {
      // エラーをシミュレート
      loader.setDatabaseLoadFunction(async () => {
        throw new Error('Database connection failed');
      });
      
      // エラーが発生してもシステムがクラッシュしないことを確認
      await loader.checkScreenFillTrigger();
      
      // loading状態が適切にリセットされることを確認（エラーハンドリング）
      const state = loader.getLoadingState();
      expect(state.isLoading).toBe(false);
    });

    it('should reset state correctly', () => {
      // 状態を変更
      loader.updateScreenState(20, 10);
      loader.getLoadingState().hasMore = false;
      loader.getLoadingState().endOfDataReached = true;
      
      loader.reset();
      
      const resetState = loader.getLoadingState();
      expect(resetState.selectedRowIndex).toBe(0);
      expect(resetState.hasMore).toBe(true);
      expect(resetState.endOfDataReached).toBe(false);
      expect(loader.getVanillaTable()).toHaveLength(0);
      expect(loader.getLoadCallCount()).toBe(0);
    });
  });
});