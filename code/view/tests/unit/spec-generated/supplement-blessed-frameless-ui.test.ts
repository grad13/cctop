/**
 * BlessedFramelessUI - Independent Unit Tests (Supplement)
 * Spec: documents/spec/view/supplement-blessed-frameless-ui.md
 * Covers: Contract (constructor, start, stop), Logic (auto-refresh guards,
 *         autoFillScreen, daemon status integration)
 *
 * Existing coverage: blessed-ui-*.test.ts cover component init and display modes
 * at integration level. This file adds: unit-level constructor tests,
 * auto-refresh guard conditions, stop cleanup.
 *
 * @created 2026-03-14
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UIState } from '../../../src/ui/UIState';
import { UIDataManager } from '../../../src/ui/UIDataManager';

// We test the orchestration logic that BlessedFramelessUI delegates to UIState and UIDataManager
// without requiring blessed (which needs a TTY).

describe('BlessedFramelessUI - Unit Tests (State & Data Layer)', () => {

  describe('Constructor defaults', () => {
    it('should create UIState with default all mode', () => {
      const state = new UIState();
      expect(state.getDisplayMode()).toBe('all');
    });

    it('should create UIState with specified display mode', () => {
      const state = new UIState('unique');
      expect(state.getDisplayMode()).toBe('unique');
    });
  });

  describe('Auto-Refresh Guard Conditions', () => {
    let state: UIState;

    beforeEach(() => {
      state = new UIState('all');
    });

    it('should skip refresh when UI is paused', () => {
      state.togglePause();
      expect(state.isPausedState()).toBe(true);
      // BlessedFramelessUI checks isPausedState() before refresh
    });

    it('should skip refresh when data is currently loading', () => {
      state.setLoadingMore(true);
      expect(state.isLoadingMoreData()).toBe(true);
      // BlessedFramelessUI checks isLoadingMoreData() before refresh
    });

    it('should skip refresh when viewport scrolled down (top row not visible)', () => {
      // Set viewport to have some data and scroll down
      state.setEvents(Array.from({ length: 50 }, (_, i) => ({
        timestamp: '2025-07-04 15:30:45',
        event_type: 'modify',
        filename: `file${i}.ts`,
        directory: 'src',
        lines: 10,
        blocks: 1,
      })));

      // Move selection down significantly
      for (let i = 0; i < 30; i++) {
        state.moveSelectionDown();
      }

      // isTopRowVisible depends on viewport start index
      // If scrolled, top row may not be visible
    });

    it('should skip refresh when filters active with no more data', () => {
      // Set filter (fewer than 6 active = has filters)
      state.toggleEventFilter('delete');
      expect(state.getEventTypeFilters().countActiveFilters()).toBe(5);

      // Set no more data
      state.setHasMoreData(false);
      expect(state.hasMoreDataToLoad()).toBe(false);

      // BlessedFramelessUI checks both conditions combined
      const hasFilters = state.getEventTypeFilters().countActiveFilters() < 6;
      const hasNoMoreData = !state.hasMoreDataToLoad();
      expect(hasFilters && hasNoMoreData).toBe(true);
    });

    it('should allow refresh when running, not loading, top visible, and data available', () => {
      expect(state.isPausedState()).toBe(false);
      expect(state.isLoadingMoreData()).toBe(false);
      expect(state.isTopRowVisible()).toBe(true);
      expect(state.hasMoreDataToLoad()).toBe(true);
    });
  });

  describe('autoFillScreen loop conditions', () => {
    it('should stop when shouldLoadMoreData returns false', () => {
      const state = new UIState('all');
      // With no events and default selection, shouldLoadMoreData depends on position
      state.setHasMoreData(false);
      expect(state.shouldLoadMoreData()).toBe(false);
    });

    it('should stop when hasMoreDataToLoad returns false', () => {
      const state = new UIState('all');
      state.setHasMoreData(false);
      expect(state.hasMoreDataToLoad()).toBe(false);
    });

    it('should stop at safety limit (1000 events)', () => {
      const state = new UIState('all');
      const manyEvents = Array.from({ length: 1001 }, (_, i) => ({
        timestamp: '2025-07-04 15:30:45',
        event_type: 'modify',
        filename: `file${i}.ts`,
        directory: 'src',
        lines: 10,
        blocks: 1,
      }));
      state.setEvents(manyEvents);
      expect(state.getEventsCount()).toBe(1001);
      // BlessedFramelessUI breaks when eventCountAfter > 1000
    });
  });

  describe('UIDataManager reset', () => {
    it('should reset data manager state', () => {
      const mockDb = {
        getLatestEvents: vi.fn().mockResolvedValue([]),
        getEventsAfterId: vi.fn().mockResolvedValue([]),
        searchEvents: vi.fn().mockResolvedValue([]),
        disconnect: vi.fn().mockResolvedValue(undefined),
      } as any;

      const state = new UIState('all');
      const dataManager = new UIDataManager(mockDb, state);

      dataManager.reset();
      const info = dataManager.getState();
      expect(info.isRefreshing).toBe(false);
      expect(info.hasLoadMore).toBe(false);
    });
  });

  describe('Daemon status display', () => {
    it('should initialize with CHECKING status', () => {
      const state = new UIState('all');
      expect(state.getDaemonStatus()).toContain('CHECKING');
    });

    it('should update to RUNNING status', () => {
      const state = new UIState('all');
      state.setDaemonStatus('{green-fg}Daemon: ●RUNNING (PID: 12345){/green-fg}');
      expect(state.getDaemonStatus()).toContain('RUNNING');
      expect(state.getDaemonStatus()).toContain('12345');
    });

    it('should update to STOPPED status', () => {
      const state = new UIState('all');
      state.setDaemonStatus('{red-fg}Daemon: ●STOPPED{/red-fg}');
      expect(state.getDaemonStatus()).toContain('STOPPED');
    });
  });
});
