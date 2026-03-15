/**
 * Filter State Management - Unit Tests (Supplement)
 * Spec: documents/spec/view/filter-state-management.md
 * Covers: Section 5 (FilterStateManager), Section 6 (Display Set Generation),
 *         Section 7 (Vanilla State), Section 8 (Reset Triggers)
 *
 * Existing coverage: blessed-ui-*.test.ts cover display mode switching at UI level.
 * This file adds: FilterStateManager (UIState) unit tests for operation history,
 * state reset, mode switching, filter combinations.
 *
 * @created 2026-03-14
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { UIState } from '../../../src/ui/UIState';
import { EventTypeFilterFlags } from '../../../src/ui/EventTypeFilterFlags';

describe('Filter State Management - UIState Unit Tests', () => {

  describe('Initial (Vanilla) State', () => {
    it('should initialize with all mode', () => {
      const state = new UIState();
      expect(state.getDisplayMode()).toBe('all');
    });

    it('should initialize with no event filters (all enabled)', () => {
      const state = new UIState();
      const filters = state.getEventTypeFilters();
      expect(filters.countActiveFilters()).toBe(6);
    });

    it('should initialize with empty keyword filter', () => {
      const state = new UIState();
      expect(state.getSearchPattern()).toBe('');
    });

    it('should initialize with empty events', () => {
      const state = new UIState();
      expect(state.getEventsCount()).toBe(0);
      expect(state.getEvents()).toEqual([]);
    });
  });

  describe('Mode Switching (updateMode)', () => {
    let state: UIState;

    beforeEach(() => {
      state = new UIState('all');
    });

    it('should switch from all to unique mode', () => {
      state.setDisplayMode('unique');
      expect(state.getDisplayMode()).toBe('unique');
    });

    it('should switch from unique to all mode', () => {
      state.setDisplayMode('unique');
      state.setDisplayMode('all');
      expect(state.getDisplayMode()).toBe('all');
    });

    it('should reset hasMoreData on mode switch', () => {
      state.setHasMoreData(false);
      state.setDisplayMode('unique');
      expect(state.hasMoreDataToLoad()).toBe(true);
    });
  });

  describe('Event Filter Operations (addEventFilter / removeEventFilter)', () => {
    let state: UIState;

    beforeEach(() => {
      state = new UIState();
    });

    it('should toggle event filter off', () => {
      state.toggleEventFilter('delete');
      const filters = state.getEventTypeFilters();
      expect(filters.isEventTypeEnabled('delete')).toBe(false);
      expect(filters.countActiveFilters()).toBe(5);
    });

    it('should toggle event filter back on', () => {
      state.toggleEventFilter('delete');
      state.toggleEventFilter('delete');
      const filters = state.getEventTypeFilters();
      expect(filters.isEventTypeEnabled('delete')).toBe(true);
      expect(filters.countActiveFilters()).toBe(6);
    });

    it('should toggle multiple filters independently', () => {
      state.toggleEventFilter('delete');
      state.toggleEventFilter('move');
      const filters = state.getEventTypeFilters();
      expect(filters.isEventTypeEnabled('delete')).toBe(false);
      expect(filters.isEventTypeEnabled('move')).toBe(false);
      expect(filters.isEventTypeEnabled('create')).toBe(true);
      expect(filters.countActiveFilters()).toBe(4);
    });

    it('should return active filters for DB query', () => {
      state.toggleEventFilter('delete');
      state.toggleEventFilter('find');
      const active = state.getActiveFilters();
      expect(active).not.toContain('Delete');
      expect(active).not.toContain('Find');
      expect(active).toContain('Create');
      expect(active).toContain('Modify');
      expect(active).toContain('Move');
      expect(active).toContain('Restore');
    });
  });

  describe('Keyword Filter Operations (setKeywordFilter)', () => {
    let state: UIState;

    beforeEach(() => {
      state = new UIState();
    });

    it('should set keyword filter', () => {
      state.setSearchPattern('test');
      expect(state.getSearchPattern()).toBe('test');
    });

    it('should clear keyword filter', () => {
      state.setSearchPattern('test');
      state.clearSearchPattern();
      expect(state.getSearchPattern()).toBe('');
    });

    it('should append characters to search pattern', () => {
      state.appendToSearchPattern('t');
      state.appendToSearchPattern('e');
      state.appendToSearchPattern('s');
      state.appendToSearchPattern('t');
      expect(state.getSearchPattern()).toBe('test');
    });

    it('should backspace from search pattern', () => {
      state.setSearchPattern('test');
      state.backspaceSearchPattern();
      expect(state.getSearchPattern()).toBe('tes');
    });

    it('should handle backspace on empty search pattern', () => {
      state.backspaceSearchPattern();
      expect(state.getSearchPattern()).toBe('');
    });
  });

  describe('Reset to Vanilla State', () => {
    let state: UIState;

    beforeEach(() => {
      state = new UIState();
    });

    it('should reset all filters on resetAllFilters', () => {
      state.toggleEventFilter('delete');
      state.setSearchPattern('test');
      state.resetAllFilters();

      expect(state.getEventTypeFilters().countActiveFilters()).toBe(6);
      expect(state.getSearchPattern()).toBe('');
      expect(state.getDisplayState()).toBe('stream_live');
    });

    it('should reset event filters only on resetEventFilters', () => {
      state.toggleEventFilter('delete');
      state.toggleEventFilter('create');
      state.setSearchPattern('test');

      state.resetEventFilters();

      expect(state.getEventTypeFilters().countActiveFilters()).toBe(6);
      expect(state.getSearchPattern()).toBe('test'); // Keyword not affected
    });
  });

  describe('Save / Restore State (ESC Behavior)', () => {
    let state: UIState;

    beforeEach(() => {
      state = new UIState();
    });

    it('should save and restore state on edit cancel', () => {
      // Set up some state
      state.toggleEventFilter('delete');
      state.setSearchPattern('original');

      // Enter edit mode (saves state internally via startEditing)
      state.saveCurrentState();
      state.startEditing('event_type_filter');

      // Make changes in edit mode
      state.toggleEventFilter('create');
      state.setSearchPattern('changed');

      // Cancel editing (should restore)
      state.cancelEditing();

      // State should be restored
      expect(state.getEventTypeFilters().isEventTypeEnabled('delete')).toBe(false);
      expect(state.getEventTypeFilters().isEventTypeEnabled('create')).toBe(true);
      expect(state.getSearchPattern()).toBe('original');
      expect(state.getDisplayState()).toBe('stream_live');
    });

    it('should keep edits on confirm', () => {
      state.saveCurrentState();
      state.startEditing('event_type_filter');

      state.toggleEventFilter('modify');
      state.confirmEditing();

      // Changes should persist
      expect(state.getEventTypeFilters().isEventTypeEnabled('modify')).toBe(false);
      expect(state.getDisplayState()).toBe('stream_live');
    });

    it('should report hasSavedState correctly', () => {
      expect(state.hasSavedState()).toBe(false);

      state.saveCurrentState();
      expect(state.hasSavedState()).toBe(true);

      state.clearSavedState();
      expect(state.hasSavedState()).toBe(false);
    });
  });

  describe('EventTypeFilterFlags clone independence', () => {
    it('should clone filters independently', () => {
      const original = new EventTypeFilterFlags();
      original.flipDeleteFlag();

      const cloned = original.clone();
      cloned.flipCreateFlag();

      expect(original.isEventTypeEnabled('create')).toBe(true);
      expect(original.isEventTypeEnabled('delete')).toBe(false);
      expect(cloned.isEventTypeEnabled('create')).toBe(false);
      expect(cloned.isEventTypeEnabled('delete')).toBe(false);
    });
  });

  describe('Mode switch consistency', () => {
    let state: UIState;

    beforeEach(() => {
      state = new UIState();
    });

    it('should preserve event filters across mode switches', () => {
      state.toggleEventFilter('delete');

      state.setDisplayMode('unique');
      expect(state.getEventTypeFilters().isEventTypeEnabled('delete')).toBe(false);

      state.setDisplayMode('all');
      expect(state.getEventTypeFilters().isEventTypeEnabled('delete')).toBe(false);
    });

    it('should preserve keyword filter across mode switches', () => {
      state.setSearchPattern('test');

      state.setDisplayMode('unique');
      expect(state.getSearchPattern()).toBe('test');

      state.setDisplayMode('all');
      expect(state.getSearchPattern()).toBe('test');
    });
  });
});
