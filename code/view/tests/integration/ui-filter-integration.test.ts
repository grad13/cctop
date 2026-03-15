/**
 * UI Filter Integration - Set-Theoretic Filter Combination Tests (Supplement)
 * Spec: documents/spec/view/ui-filter-integration.md
 * Covers: Section 2 (Set Theory Approach), Section 4 (Unique Mode Definition),
 *         Section 5 (Filter Details), Section 6 (ESC/Enter), Section 12 (Order Independence)
 *
 * Existing coverage: blessed-ui-*.test.ts cover basic mode switching at UI level.
 * This file adds: set-theoretic filter combination tests, unique+event filter
 * integration, deleted file exclusion, ESC reset.
 *
 * @created 2026-03-14
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { UIState } from '../../src/ui/UIState';
import { EventTypeFilterFlags } from '../../src/ui/EventTypeFilterFlags';

// Helper to create mock events
function createEvent(
  filename: string,
  eventType: string,
  directory: string = 'src',
  timestamp: string = '2025-07-04 15:30:45'
) {
  return {
    timestamp,
    event_type: eventType,
    filename,
    directory,
    lines: 10,
    blocks: 1,
  };
}

describe('UI Filter Integration - Set-Theoretic Combinations', () => {

  describe('All Mode filter processing', () => {
    let state: UIState;

    beforeEach(() => {
      state = new UIState('all');
    });

    it('should show all events when no filters applied', () => {
      const events = [
        createEvent('file1.ts', 'create'),
        createEvent('file1.ts', 'modify'),
        createEvent('file2.ts', 'delete'),
      ];
      state.setEvents(events);
      expect(state.getEventsCount()).toBe(3);
    });

    it('should allow filtering by event type in all mode', () => {
      state.toggleEventFilter('delete');
      const filters = state.getActiveFilters();
      expect(filters).not.toContain('Delete');
      expect(filters).toContain('Create');
      expect(filters).toContain('Modify');
    });
  });

  describe('Event filter + keyword filter AND condition', () => {
    let state: UIState;

    beforeEach(() => {
      state = new UIState('all');
    });

    it('should combine event filter and keyword filter as AND', () => {
      // Set event filter to exclude delete
      state.toggleEventFilter('delete');
      // Set keyword filter
      state.setSearchPattern('component');

      // Both filters should be active simultaneously
      expect(state.getEventTypeFilters().isEventTypeEnabled('delete')).toBe(false);
      expect(state.getSearchPattern()).toBe('component');
    });
  });

  describe('EventTypeFilterFlags comprehensive behavior', () => {
    let flags: EventTypeFilterFlags;

    beforeEach(() => {
      flags = new EventTypeFilterFlags();
    });

    it('should start with all 6 event types enabled', () => {
      expect(flags.countActiveFilters()).toBe(6);
      expect(flags.isEventTypeEnabled('find')).toBe(true);
      expect(flags.isEventTypeEnabled('create')).toBe(true);
      expect(flags.isEventTypeEnabled('modify')).toBe(true);
      expect(flags.isEventTypeEnabled('delete')).toBe(true);
      expect(flags.isEventTypeEnabled('move')).toBe(true);
      expect(flags.isEventTypeEnabled('restore')).toBe(true);
    });

    it('should return false for unknown event type', () => {
      expect(flags.isEventTypeEnabled('unknown')).toBe(false);
    });

    it('should toggle each event type independently', () => {
      flags.toggleEventType('find');
      expect(flags.isEventTypeEnabled('find')).toBe(false);
      expect(flags.isEventTypeEnabled('create')).toBe(true);

      flags.toggleEventType('create');
      expect(flags.isEventTypeEnabled('find')).toBe(false);
      expect(flags.isEventTypeEnabled('create')).toBe(false);
      expect(flags.countActiveFilters()).toBe(4);
    });

    it('should disable all event types when all toggled off', () => {
      flags.toggleEventType('find');
      flags.toggleEventType('create');
      flags.toggleEventType('modify');
      flags.toggleEventType('delete');
      flags.toggleEventType('move');
      flags.toggleEventType('restore');

      expect(flags.countActiveFilters()).toBe(0);
      expect(flags.getActiveFilters()).toEqual([]);
    });

    it('should reset all to enabled', () => {
      flags.toggleEventType('find');
      flags.toggleEventType('create');
      flags.resetAll();

      expect(flags.countActiveFilters()).toBe(6);
    });

    it('should produce correct DB query filter list', () => {
      flags.toggleEventType('delete');
      flags.toggleEventType('move');

      const active = flags.getActiveFilters();
      expect(active).toEqual(['Find', 'Create', 'Modify', 'Restore']);
    });

    it('should handle case-insensitive event type names', () => {
      flags.toggleEventType('DELETE');
      expect(flags.isEventTypeEnabled('delete')).toBe(false);
      expect(flags.isEventTypeEnabled('DELETE')).toBe(false);
    });
  });

  describe('ESC key behavior (Section 6)', () => {
    let state: UIState;

    beforeEach(() => {
      state = new UIState('all');
    });

    it('should discard edits on ESC in edit mode', () => {
      // Initial state with delete disabled
      state.toggleEventFilter('delete');

      // Enter edit mode
      state.saveCurrentState();
      state.startEditing('event_type_filter');

      // Make additional changes
      state.toggleEventFilter('create');

      // ESC: cancel editing
      state.cancelEditing();

      // Should restore to pre-edit state (delete disabled, create enabled)
      expect(state.getEventTypeFilters().isEventTypeEnabled('delete')).toBe(false);
      expect(state.getEventTypeFilters().isEventTypeEnabled('create')).toBe(true);
    });

    it('should clear all filters on ESC in normal mode', () => {
      // Set some filters
      state.toggleEventFilter('delete');
      state.setSearchPattern('test');

      // ESC in normal mode: reset all
      state.resetAllFilters();

      expect(state.getEventTypeFilters().countActiveFilters()).toBe(6);
      expect(state.getSearchPattern()).toBe('');
    });

    it('should keep edits on Enter in edit mode', () => {
      state.saveCurrentState();
      state.startEditing('event_type_filter');

      state.toggleEventFilter('modify');

      // Enter: confirm editing
      state.confirmEditing();

      expect(state.getEventTypeFilters().isEventTypeEnabled('modify')).toBe(false);
      expect(state.getDisplayState()).toBe('stream_live');
    });
  });

  describe('Filter independence and order independence (Section 12)', () => {
    it('should produce same result regardless of filter application order', () => {
      // Order 1: event filter first, then keyword
      const state1 = new UIState('all');
      state1.toggleEventFilter('delete');
      state1.setSearchPattern('test');

      // Order 2: keyword first, then event filter
      const state2 = new UIState('all');
      state2.setSearchPattern('test');
      state2.toggleEventFilter('delete');

      // Both should have same filter configuration
      expect(state1.getEventTypeFilters().isEventTypeEnabled('delete'))
        .toBe(state2.getEventTypeFilters().isEventTypeEnabled('delete'));
      expect(state1.getSearchPattern()).toBe(state2.getSearchPattern());
    });
  });

  describe('All 3 filters applied simultaneously', () => {
    it('should maintain all filter states when combined', () => {
      const state = new UIState('unique');

      // 1. Mode is unique
      expect(state.getDisplayMode()).toBe('unique');

      // 2. Event filter: exclude delete
      state.toggleEventFilter('delete');
      expect(state.getEventTypeFilters().isEventTypeEnabled('delete')).toBe(false);

      // 3. Keyword filter
      state.setSearchPattern('component');
      expect(state.getSearchPattern()).toBe('component');

      // All 3 filters active simultaneously
      expect(state.getDisplayMode()).toBe('unique');
      expect(state.getEventTypeFilters().countActiveFilters()).toBe(5);
      expect(state.getSearchPattern()).toBe('component');
    });
  });

  describe('Edge cases', () => {
    it('should handle file with only delete event in unique mode context', () => {
      const state = new UIState('unique');
      // When the only event for a file is 'delete' and delete is filtered out,
      // the file should not appear. This is verified at the data layer,
      // but we verify filter state allows this.
      state.toggleEventFilter('delete');
      expect(state.getEventTypeFilters().isEventTypeEnabled('delete')).toBe(false);
      expect(state.getActiveFilters()).not.toContain('Delete');
    });

    it('should handle reset after multiple filter operations', () => {
      const state = new UIState('unique');
      state.toggleEventFilter('delete');
      state.toggleEventFilter('create');
      state.toggleEventFilter('modify');
      state.setSearchPattern('deep');

      state.resetAllFilters();

      expect(state.getDisplayMode()).toBe('unique'); // Mode not reset by resetAllFilters
      expect(state.getEventTypeFilters().countActiveFilters()).toBe(6);
      expect(state.getSearchPattern()).toBe('');
    });
  });
});
