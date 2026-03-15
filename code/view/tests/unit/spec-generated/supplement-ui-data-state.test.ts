/**
 * UIDataState Tests
 * Tests for data loading state management (pagination, loading flags, data cache)
 * Based on: documents/spec/view/supplement-ui-data-state.md (SPEC-V-SUP-024)
 * @created 2026-03-14
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { UIDataState } from '../../../src/ui/state/UIDataState';
import { EventRow } from '../../../src/types/event-row';

function createEventRow(id: number): EventRow {
  return {
    id,
    timestamp: `2026-03-14T00:00:0${id}`,
    filename: `file${id}.ts`,
    directory: '/src',
    event_type: 'modify',
    size: 1024,
    lines: 50,
    blocks: 8,
    inode: 10000 + id,
    elapsed_ms: 100,
  };
}

describe('UIDataState', () => {
  let state: UIDataState;

  beforeEach(() => {
    state = new UIDataState();
  });

  describe('getEvents / setEvents', () => {
    it('should return empty array initially', () => {
      expect(state.getEvents()).toEqual([]);
    });

    it('should replace all events and update totalLoaded', () => {
      const events = [createEventRow(1), createEventRow(2), createEventRow(3)];
      state.setEvents(events);

      expect(state.getEvents()).toEqual(events);
      expect(state.getTotalLoaded()).toBe(3);
    });

    it('should replace previous events completely', () => {
      state.setEvents([createEventRow(1), createEventRow(2)]);
      state.setEvents([createEventRow(3)]);

      expect(state.getEvents()).toHaveLength(1);
      expect(state.getEvents()[0].id).toBe(3);
      expect(state.getTotalLoaded()).toBe(1);
    });
  });

  describe('appendEvents', () => {
    it('should concatenate to existing events', () => {
      state.setEvents([createEventRow(1)]);
      state.appendEvents([createEventRow(2), createEventRow(3)]);

      expect(state.getEvents()).toHaveLength(3);
      expect(state.getTotalLoaded()).toBe(3);
    });

    it('should update totalLoaded after append', () => {
      state.setEvents([createEventRow(1), createEventRow(2)]);
      expect(state.getTotalLoaded()).toBe(2);

      state.appendEvents([createEventRow(3)]);
      expect(state.getTotalLoaded()).toBe(3);
    });

    it('should append to empty events array', () => {
      state.appendEvents([createEventRow(1)]);

      expect(state.getEvents()).toHaveLength(1);
      expect(state.getTotalLoaded()).toBe(1);
    });
  });

  describe('getCurrentOffset / setCurrentOffset / incrementOffset', () => {
    it('should return 0 initially', () => {
      expect(state.getCurrentOffset()).toBe(0);
    });

    it('should set current offset', () => {
      state.setCurrentOffset(50);
      expect(state.getCurrentOffset()).toBe(50);
    });

    it('should clamp negative offset to 0', () => {
      state.setCurrentOffset(-10);
      expect(state.getCurrentOffset()).toBe(0);
    });

    it('should increment offset by amount', () => {
      state.setCurrentOffset(10);
      state.incrementOffset(5);
      expect(state.getCurrentOffset()).toBe(15);
    });
  });

  describe('getTotalLoaded', () => {
    it('should return 0 initially', () => {
      expect(state.getTotalLoaded()).toBe(0);
    });

    it('should reflect events count after setEvents', () => {
      state.setEvents([createEventRow(1), createEventRow(2)]);
      expect(state.getTotalLoaded()).toBe(2);
    });
  });

  describe('hasMoreDataToLoad / setHasMoreData', () => {
    it('should return true initially', () => {
      expect(state.hasMoreDataToLoad()).toBe(true);
    });

    it('should set hasMoreData flag', () => {
      state.setHasMoreData(false);
      expect(state.hasMoreDataToLoad()).toBe(false);

      state.setHasMoreData(true);
      expect(state.hasMoreDataToLoad()).toBe(true);
    });
  });

  describe('isLoadingMoreData / setLoadingMore', () => {
    it('should return false initially', () => {
      expect(state.isLoadingMoreData()).toBe(false);
    });

    it('should set loading more flag', () => {
      state.setLoadingMore(true);
      expect(state.isLoadingMoreData()).toBe(true);

      state.setLoadingMore(false);
      expect(state.isLoadingMoreData()).toBe(false);
    });
  });

  describe('shouldLoadMoreData', () => {
    it('should return true when selectedIndex is within 3 rows of bottom', () => {
      // selectedIndex >= totalEvents - 3 AND hasMoreData AND !isLoadingMore
      expect(state.shouldLoadMoreData(7, 10)).toBe(true);  // 7 >= 10-3=7
      expect(state.shouldLoadMoreData(8, 10)).toBe(true);  // 8 >= 7
      expect(state.shouldLoadMoreData(9, 10)).toBe(true);  // 9 >= 7
    });

    it('should return false when selectedIndex is more than 3 rows from bottom', () => {
      expect(state.shouldLoadMoreData(5, 10)).toBe(false);  // 5 < 7
      expect(state.shouldLoadMoreData(0, 10)).toBe(false);
    });

    it('should return false when hasMoreData is false', () => {
      state.setHasMoreData(false);
      expect(state.shouldLoadMoreData(9, 10)).toBe(false);
    });

    it('should return false when isLoadingMore is true', () => {
      state.setLoadingMore(true);
      expect(state.shouldLoadMoreData(9, 10)).toBe(false);
    });

    it('should return false when both hasMoreData is false and isLoadingMore is true', () => {
      state.setHasMoreData(false);
      state.setLoadingMore(true);
      expect(state.shouldLoadMoreData(9, 10)).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      // Set various state
      state.setEvents([createEventRow(1), createEventRow(2)]);
      state.setCurrentOffset(50);
      state.setHasMoreData(false);
      state.setLoadingMore(true);

      state.reset();

      expect(state.getEvents()).toEqual([]);
      expect(state.getCurrentOffset()).toBe(0);
      expect(state.getTotalLoaded()).toBe(0);
      expect(state.hasMoreDataToLoad()).toBe(true);
      expect(state.isLoadingMoreData()).toBe(false);
    });
  });

  describe('getEventsCount', () => {
    it('should return 0 initially', () => {
      expect(state.getEventsCount()).toBe(0);
    });

    it('should return number of events', () => {
      state.setEvents([createEventRow(1), createEventRow(2), createEventRow(3)]);
      expect(state.getEventsCount()).toBe(3);
    });
  });

  describe('getDataInfo', () => {
    it('should return data state info object', () => {
      state.setEvents([createEventRow(1)]);
      state.setCurrentOffset(10);
      state.setHasMoreData(false);
      state.setLoadingMore(true);

      const info = state.getDataInfo();

      expect(info).toEqual({
        eventsCount: 1,
        currentOffset: 10,
        totalLoaded: 1,
        hasMoreData: false,
        isLoadingMore: true,
      });
    });

    it('should return initial state info', () => {
      const info = state.getDataInfo();

      expect(info).toEqual({
        eventsCount: 0,
        currentOffset: 0,
        totalLoaded: 0,
        hasMoreData: true,
        isLoadingMore: false,
      });
    });
  });
});
