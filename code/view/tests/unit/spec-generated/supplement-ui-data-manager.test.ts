/**
 * UIDataManager Unit Tests (from spec: supplement-ui-data-manager.md)
 * Tests concurrency control and refreshData strategies not covered by blessed-ui-*.test.ts
 * @created 2026-03-14
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UIDataManager } from '../../../src/ui/UIDataManager';
import { UIState } from '../../../src/ui/UIState';
import { createMockDb } from '../../helpers/mock-database';
import { createMockEvents } from '../../helpers/mock-events';

describe('UIDataManager', () => {
  let manager: UIDataManager;
  let mockDb: ReturnType<typeof createMockDb>;
  let uiState: UIState;

  beforeEach(() => {
    mockDb = createMockDb();
    uiState = new UIState();
    manager = new UIDataManager(mockDb, uiState);
  });

  describe('Concurrency Control', () => {
    it('should prevent concurrent refresh operations via isRefreshing flag', async () => {
      let resolveFirst: () => void;
      const firstCall = new Promise<void>((resolve) => {
        resolveFirst = resolve;
      });

      mockDb.getLatestEvents.mockImplementationOnce(() =>
        firstCall.then(() => [])
      );

      const firstRefresh = manager.refreshData();
      // Second call while first is in progress should return immediately
      const secondRefresh = manager.refreshData();

      resolveFirst!();
      await firstRefresh;
      await secondRefresh;

      // Only one call should have been made to the DB
      expect(mockDb.getLatestEvents).toHaveBeenCalledTimes(1);
    });

    it('should allow refresh after previous one completes', async () => {
      mockDb.getLatestEvents.mockResolvedValue([]);

      await manager.refreshData();
      await manager.refreshData();

      expect(mockDb.getLatestEvents).toHaveBeenCalledTimes(2);
    });

    it('should reuse existing loadMore promise for concurrent loadMore calls', async () => {
      uiState.setHasMoreData(true);
      uiState.setEvents(createMockEvents(5));

      let resolveLoad: () => void;
      const loadPromise = new Promise<void>((resolve) => {
        resolveLoad = resolve;
      });

      mockDb.getLatestEvents.mockImplementationOnce(() =>
        loadPromise.then(() => createMockEvents(3))
      );

      const first = manager.loadMore();
      const second = manager.loadMore();

      resolveLoad!();
      await first;
      await second;

      // Both calls should share the same promise; only one DB call
      expect(mockDb.getLatestEvents).toHaveBeenCalledTimes(1);
    });

    it('should skip auto-refresh during loadMore', async () => {
      uiState.setLoadingMore(true);
      mockDb.getLatestEvents.mockResolvedValue([]);

      await manager.refreshData(false);

      // Should not call DB since we are loading more
      expect(mockDb.getLatestEvents).not.toHaveBeenCalled();
    });

    it('should allow append refresh during loadMore', async () => {
      // append=true should not be skipped even during loadMore
      // But isRefreshing will still guard
      uiState.setLoadingMore(true);
      mockDb.getLatestEvents.mockResolvedValue([]);

      await manager.refreshData(true);

      expect(mockDb.getLatestEvents).toHaveBeenCalled();
    });
  });

  describe('refreshData strategy', () => {
    it('should use searchEvents when search pattern is active', async () => {
      uiState.setSearchPattern('test-query');
      mockDb.searchEvents.mockResolvedValue([{ id: 1 }]);

      await manager.refreshData();

      expect(mockDb.searchEvents).toHaveBeenCalledWith(
        expect.objectContaining({ keyword: 'test-query' })
      );
      expect(uiState.hasMoreDataToLoad()).toBe(false);
    });

    it('should pass mode and filters to searchEvents', async () => {
      uiState.setSearchPattern('query');
      uiState.setDisplayMode('unique');
      uiState.toggleEventFilter('find'); // disable find

      await manager.refreshData();

      expect(mockDb.searchEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          keyword: 'query',
          mode: 'unique',
          filters: expect.any(Array),
        })
      );
    });

    it('should use getLatestEvents with LIMIT 100 in all mode without search', async () => {
      uiState.setDisplayMode('all');
      uiState.setSearchPattern('');
      mockDb.getLatestEvents.mockResolvedValue(createMockEvents(50));

      await manager.refreshData();

      expect(mockDb.getLatestEvents).toHaveBeenCalledWith(
        100,
        'all',
        0,
        expect.any(Array)
      );
    });

    it('should set hasMoreData=true only when rawEvents.length equals limit', async () => {
      uiState.setDisplayMode('all');
      // Return exactly 100 events (= limit)
      mockDb.getLatestEvents.mockResolvedValue(createMockEvents(100));

      await manager.refreshData();

      expect(uiState.hasMoreDataToLoad()).toBe(true);
    });

    it('should set hasMoreData=false when rawEvents.length < limit', async () => {
      uiState.setDisplayMode('all');
      // Return less than 100 events
      mockDb.getLatestEvents.mockResolvedValue(createMockEvents(50));

      await manager.refreshData();

      expect(uiState.hasMoreDataToLoad()).toBe(false);
    });

    it('should append events in append mode for all mode', async () => {
      uiState.setDisplayMode('all');
      const initialEvents = createMockEvents(5);
      uiState.setEvents(initialEvents);

      const newEvents = createMockEvents(3);
      mockDb.getLatestEvents.mockResolvedValue(newEvents);

      await manager.refreshData(true);

      // Should have 5 + 3 = 8 events
      expect(uiState.getEventsCount()).toBe(8);
    });

    it('should use offset from current events count in append mode', async () => {
      uiState.setDisplayMode('all');
      uiState.setEvents(createMockEvents(50));
      mockDb.getLatestEvents.mockResolvedValue([]);

      await manager.refreshData(true);

      expect(mockDb.getLatestEvents).toHaveBeenCalledWith(
        100,
        'all',
        50, // offset = current events count
        expect.any(Array)
      );
    });
  });

  describe('performDatabaseSearch', () => {
    it('should execute searchEvents with current state', async () => {
      uiState.setSearchPattern('search-term');
      uiState.setDisplayMode('all');
      mockDb.searchEvents.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      await manager.performDatabaseSearch();

      expect(mockDb.searchEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          keyword: 'search-term',
          mode: 'all',
        })
      );
    });

    it('should set hasMoreData=false after DB search (no pagination)', async () => {
      uiState.setSearchPattern('test');
      mockDb.searchEvents.mockResolvedValue([{ id: 1 }]);

      await manager.performDatabaseSearch();

      expect(uiState.hasMoreDataToLoad()).toBe(false);
    });

    it('should handle empty search pattern by resetting events', async () => {
      uiState.setSearchPattern('');

      await manager.performDatabaseSearch();

      expect(mockDb.searchEvents).not.toHaveBeenCalled();
      expect(uiState.getEventsCount()).toBe(0);
      expect(uiState.hasMoreDataToLoad()).toBe(true);
    });

    it('should handle search error gracefully', async () => {
      uiState.setSearchPattern('error-query');
      mockDb.searchEvents.mockRejectedValue(new Error('DB error'));

      // Should not throw
      await expect(manager.performDatabaseSearch()).resolves.toBeUndefined();
      expect(uiState.getEventsCount()).toBe(0);
      expect(uiState.hasMoreDataToLoad()).toBe(false);
    });
  });

  describe('loadMore', () => {
    it('should not load when hasMoreData is false', async () => {
      uiState.setHasMoreData(false);

      await manager.loadMore();

      expect(mockDb.getLatestEvents).not.toHaveBeenCalled();
    });

    it('should set loadingMore flag during load and clear after', async () => {
      uiState.setHasMoreData(true);
      uiState.setEvents(createMockEvents(5));
      mockDb.getLatestEvents.mockResolvedValue(createMockEvents(3));

      const loadPromise = manager.loadMore();
      // Note: loadingMore is set synchronously by doLoadMore
      await loadPromise;

      // After completion, loading should be false
      expect(uiState.isLoadingMoreData()).toBe(false);
    });

    it('should set hasMoreData=false when no new events loaded', async () => {
      uiState.setHasMoreData(true);
      uiState.setEvents(createMockEvents(5));
      mockDb.getLatestEvents.mockResolvedValue([]); // No new events

      await manager.loadMore();

      expect(uiState.hasMoreDataToLoad()).toBe(false);
    });
  });

  describe('clearUniqueCache', () => {
    it('should be callable without errors', () => {
      expect(() => manager.clearUniqueCache()).not.toThrow();
    });
  });

  describe('reset', () => {
    it('should clear internal state', () => {
      manager.reset();
      const state = manager.getState();
      expect(state.isRefreshing).toBe(false);
      expect(state.hasLoadMore).toBe(false);
    });
  });

  describe('getState', () => {
    it('should return current data loading state', () => {
      const state = manager.getState();
      expect(state).toHaveProperty('isRefreshing');
      expect(state).toHaveProperty('hasLoadMore');
      expect(state).toHaveProperty('eventsCount');
      expect(state).toHaveProperty('totalLoaded');
    });
  });
});
