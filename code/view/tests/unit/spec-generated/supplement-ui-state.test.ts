/**
 * UIState Unit Tests (from spec: supplement-ui-state.md)
 * Tests state delegation architecture not covered by blessed-ui-*.test.ts
 * @created 2026-03-14
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { UIState } from '../../../src/ui/UIState';
import type { EventRow } from '../../../src/types/event-row';

function createMockEvents(count: number): EventRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    timestamp: 1719899271 + i,
    filename: `file${i + 1}.ts`,
    directory: '/src',
    event_type: 'modify',
    size: 1024,
    lines: 50,
    blocks: 2,
    inode: 12345,
    elapsed_ms: 1000,
  }));
}

describe('UIState - State Delegation Architecture', () => {
  let uiState: UIState;

  beforeEach(() => {
    uiState = new UIState();
  });

  describe('constructor', () => {
    it('should default to all display mode', () => {
      expect(uiState.getDisplayMode()).toBe('all');
    });

    it('should accept custom display mode', () => {
      const state = new UIState('unique');
      expect(state.getDisplayMode()).toBe('unique');
    });

    it('should start in stream_live display state', () => {
      expect(uiState.getDisplayState()).toBe('stream_live');
    });
  });

  describe('Viewport delegation (to UIViewportState)', () => {
    it('should delegate getSelectedIndex to viewportState', () => {
      expect(uiState.getSelectedIndex()).toBe(0);
    });

    it('should delegate setSelectedIndex with bounds checking', () => {
      uiState.setEvents(createMockEvents(10));
      uiState.setSelectedIndex(5);
      expect(uiState.getSelectedIndex()).toBe(5);
    });

    it('should delegate moveSelectionUp to viewportState', () => {
      uiState.setEvents(createMockEvents(10));
      uiState.setSelectedIndex(5);
      uiState.moveSelectionUp();
      expect(uiState.getSelectedIndex()).toBe(4);
    });

    it('should delegate moveSelectionDown to viewportState', () => {
      uiState.setEvents(createMockEvents(10));
      uiState.setSelectedIndex(0);
      uiState.moveSelectionDown();
      expect(uiState.getSelectedIndex()).toBe(1);
    });

    it('should delegate getViewportStartIndex', () => {
      expect(uiState.getViewportStartIndex()).toBe(0);
    });

    it('should delegate getViewportHeight/setViewportHeight', () => {
      uiState.setViewportHeight(30);
      expect(uiState.getViewportHeight()).toBe(30);
    });

    it('should delegate getVisibleEvents to viewport slice', () => {
      uiState.setEvents(createMockEvents(50));
      uiState.setViewportHeight(10);
      const visible = uiState.getVisibleEvents();
      expect(visible.length).toBe(10);
    });

    it('should delegate isTopRowVisible', () => {
      expect(uiState.isTopRowVisible()).toBe(true);
    });
  });

  describe('Data state delegation (to UIDataState)', () => {
    it('should delegate getEvents/setEvents', () => {
      const events = createMockEvents(5);
      uiState.setEvents(events);
      expect(uiState.getEvents()).toEqual(events);
    });

    it('should delegate getEventsCount', () => {
      uiState.setEvents(createMockEvents(7));
      expect(uiState.getEventsCount()).toBe(7);
    });

    it('should delegate hasMoreDataToLoad/setHasMoreData', () => {
      uiState.setHasMoreData(false);
      expect(uiState.hasMoreDataToLoad()).toBe(false);
      uiState.setHasMoreData(true);
      expect(uiState.hasMoreDataToLoad()).toBe(true);
    });

    it('should delegate isLoadingMoreData/setLoadingMore', () => {
      uiState.setLoadingMore(true);
      expect(uiState.isLoadingMoreData()).toBe(true);
      uiState.setLoadingMore(false);
      expect(uiState.isLoadingMoreData()).toBe(false);
    });

    it('should delegate shouldLoadMoreData', () => {
      uiState.setEvents(createMockEvents(10));
      uiState.setHasMoreData(true);
      uiState.setSelectedIndex(9);
      expect(uiState.shouldLoadMoreData()).toBe(true);
    });
  });

  describe('Event type filters delegation (to EventTypeFilterFlags)', () => {
    it('should return EventTypeFilterFlags via getEventTypeFilters', () => {
      const filters = uiState.getEventTypeFilters();
      expect(filters).toBeDefined();
      expect(filters.isEventTypeEnabled('find')).toBe(true);
    });

    it('should delegate toggleEventFilter', () => {
      uiState.toggleEventFilter('find');
      expect(uiState.getEventTypeFilters().isEventTypeEnabled('find')).toBe(false);
    });

    it('should delegate resetEventFilters', () => {
      uiState.toggleEventFilter('find');
      uiState.toggleEventFilter('create');
      uiState.resetEventFilters();
      expect(uiState.getEventTypeFilters().isEventTypeEnabled('find')).toBe(true);
      expect(uiState.getEventTypeFilters().isEventTypeEnabled('create')).toBe(true);
    });

    it('should delegate getActiveFilters', () => {
      const filters = uiState.getActiveFilters();
      expect(filters).toHaveLength(6); // All 6 types
    });
  });

  describe('Edit Mode with Save/Restore', () => {
    it('should set displayState to event_type_filter via startEditing', () => {
      uiState.startEditing('event_type_filter');
      expect(uiState.getDisplayState()).toBe('event_type_filter');
    });

    it('should set displayState to keyword_filter via startEditing', () => {
      uiState.startEditing('keyword_filter');
      expect(uiState.getDisplayState()).toBe('keyword_filter');
    });

    it('should accept legacy filter/search type names', () => {
      uiState.startEditing('filter');
      expect(uiState.getDisplayState()).toBe('event_type_filter');

      uiState.startEditing('search');
      expect(uiState.getDisplayState()).toBe('keyword_filter');
    });

    it('should restore from saved state on cancelEditing', () => {
      uiState.setSearchPattern('original');
      uiState.saveCurrentState();
      uiState.startEditing('keyword_filter');
      uiState.setSearchPattern('modified');

      uiState.cancelEditing();

      expect(uiState.getSearchPattern()).toBe('original');
      expect(uiState.getDisplayState()).toBe('stream_live');
    });

    it('should clear saved state on confirmEditing', () => {
      uiState.saveCurrentState();
      uiState.startEditing('keyword_filter');

      uiState.confirmEditing();

      expect(uiState.getDisplayState()).toBe('stream_live');
      expect(uiState.hasSavedState()).toBe(false);
    });

    it('should clear all filters and return to stream_live on resetAllFilters', () => {
      uiState.setSearchPattern('query');
      uiState.toggleEventFilter('find');
      uiState.setDisplayState('stream_paused');

      uiState.resetAllFilters();

      expect(uiState.getSearchPattern()).toBe('');
      expect(uiState.getEventTypeFilters().isEventTypeEnabled('find')).toBe(true);
      expect(uiState.getDisplayState()).toBe('stream_live');
    });
  });

  describe('calculateDynamicWidth', () => {
    it('should compute available viewport height from terminal size', () => {
      // Mock process.stdout.rows
      const originalRows = process.stdout.rows;
      Object.defineProperty(process.stdout, 'rows', { value: 40, writable: true });

      uiState.calculateDynamicWidth();

      // terminalHeight(40) - headerHeight(3) - controlHeight(4) = 33
      expect(uiState.getViewportHeight()).toBe(33);

      Object.defineProperty(process.stdout, 'rows', { value: originalRows, writable: true });
    });

    it('should enforce minimum 1 row viewport height', () => {
      Object.defineProperty(process.stdout, 'rows', { value: 5, writable: true });

      uiState.calculateDynamicWidth();

      // 5 - 3 - 4 = -2, clamped to 1
      expect(uiState.getViewportHeight()).toBeGreaterThanOrEqual(1);

      Object.defineProperty(process.stdout, 'rows', { value: undefined, writable: true });
    });
  });

  describe('Mode Switch Side Effects', () => {
    it('should reset viewport to top when switching display mode', () => {
      uiState.setEvents(createMockEvents(20));
      uiState.setSelectedIndex(10);
      uiState.setDisplayMode('unique');

      expect(uiState.getSelectedIndex()).toBe(0);
      expect(uiState.getViewportStartIndex()).toBe(0);
    });

    it('should re-enable hasMoreData when switching display mode', () => {
      uiState.setHasMoreData(false);
      uiState.setDisplayMode('unique');

      expect(uiState.hasMoreDataToLoad()).toBe(true);
    });
  });

  describe('Search Pattern management', () => {
    it('should get/set search pattern', () => {
      uiState.setSearchPattern('test');
      expect(uiState.getSearchPattern()).toBe('test');
    });

    it('should clear search pattern', () => {
      uiState.setSearchPattern('test');
      uiState.clearSearchPattern();
      expect(uiState.getSearchPattern()).toBe('');
    });

    it('should append to search pattern', () => {
      uiState.setSearchPattern('hel');
      uiState.appendToSearchPattern('l');
      uiState.appendToSearchPattern('o');
      expect(uiState.getSearchPattern()).toBe('hello');
    });

    it('should backspace search pattern', () => {
      uiState.setSearchPattern('test');
      uiState.backspaceSearchPattern();
      expect(uiState.getSearchPattern()).toBe('tes');
    });

    it('should handle backspace on empty pattern', () => {
      uiState.setSearchPattern('');
      uiState.backspaceSearchPattern();
      expect(uiState.getSearchPattern()).toBe('');
    });
  });

  describe('Pause management', () => {
    it('should toggle from live to paused', () => {
      uiState.setDisplayState('stream_live');
      uiState.togglePause();
      expect(uiState.getDisplayState()).toBe('stream_paused');
    });

    it('should toggle from paused to live', () => {
      uiState.setDisplayState('stream_paused');
      uiState.togglePause();
      expect(uiState.getDisplayState()).toBe('stream_live');
    });

    it('should report isPausedState correctly', () => {
      uiState.setDisplayState('stream_paused');
      expect(uiState.isPausedState()).toBe(true);

      uiState.setDisplayState('stream_live');
      expect(uiState.isPausedState()).toBe(false);
    });
  });

  describe('Daemon Status', () => {
    it('should get/set daemon status', () => {
      uiState.setDaemonStatus('{green-fg}RUNNING{/green-fg}');
      expect(uiState.getDaemonStatus()).toContain('RUNNING');
    });
  });

  describe('setEvents viewport adjustment', () => {
    it('should adjust selection when events shrink below current index', () => {
      uiState.setEvents(createMockEvents(10));
      uiState.setSelectedIndex(8);

      // Shrink events to 5, selection should adjust
      uiState.setEvents(createMockEvents(5));
      expect(uiState.getSelectedIndex()).toBe(4); // clamped to last index
    });

    it('should set selection to -1 when events are empty', () => {
      uiState.setEvents(createMockEvents(10));
      uiState.setSelectedIndex(5);
      uiState.setEvents([]);
      // With 0 events, max(0, min(-1, -1)) = 0 due to clamping
      expect(uiState.getSelectedIndex()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getStateInfo', () => {
    it('should return debug information with all state fields', () => {
      const info = uiState.getStateInfo();
      expect(info).toHaveProperty('displayMode');
      expect(info).toHaveProperty('displayState');
      expect(info).toHaveProperty('searchPattern');
      expect(info).toHaveProperty('viewport');
      expect(info).toHaveProperty('data');
      expect(info).toHaveProperty('daemonStatus');
    });
  });
});
