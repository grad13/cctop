/**
 * esc-operations.test
 * Tests ESC behavior using UIState directly
 * @created 2026-03-13
 * @checked -
 * @updated 2026-03-15
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { UIState } from '../../src/ui/UIState';

/**
 * ESC operation test
 * Tests two different ESC behaviors via UIState:
 * 1. During editing: cancelEditing() restores saved state
 * 2. In normal mode: resetAllFilters() clears all filters
 */

describe('ESC Operations', () => {
  let uiState: UIState;

  beforeEach(() => {
    uiState = new UIState();
  });

  describe('ESC during editing mode', () => {
    it('should restore previous state when ESC is pressed during event filter editing', () => {
      // Set initial state
      uiState.setDisplayMode('unique');
      uiState.toggleEventFilter('Delete');  // Exclude Delete
      uiState.toggleEventFilter('Move');    // Exclude Move
      uiState.toggleEventFilter('Find');    // Exclude Find
      uiState.toggleEventFilter('Restore'); // Exclude Restore
      uiState.setSearchPattern('important');

      const filtersBefore = uiState.getActiveFilters().slice();
      const searchBefore = uiState.getSearchPattern();

      // Enter event filter editing mode (saves state automatically)
      uiState.startEditing('event_type_filter');
      expect(uiState.getDisplayState()).toBe('event_type_filter');

      // Modify filters during editing
      uiState.toggleEventFilter('Modify'); // Further exclude Modify

      // ESC cancels editing → restores saved state
      uiState.cancelEditing();

      expect(uiState.getActiveFilters()).toEqual(filtersBefore);
      expect(uiState.getSearchPattern()).toBe(searchBefore);
      expect(uiState.getDisplayState()).toBe('stream_live');
    });

    it('should restore previous state when ESC is pressed during keyword filter editing', () => {
      // Set initial state
      uiState.setSearchPattern('test');

      // Enter keyword filter editing mode
      uiState.startEditing('keyword_filter');
      expect(uiState.getDisplayState()).toBe('keyword_filter');

      // Modify search during editing
      uiState.setSearchPattern('important-changed');

      // ESC cancels editing
      uiState.cancelEditing();

      expect(uiState.getSearchPattern()).toBe('test');
      expect(uiState.getDisplayState()).toBe('stream_live');
    });

    it('should handle multiple edit sessions with proper state restoration', () => {
      // First edit session
      uiState.setSearchPattern('session1');

      uiState.startEditing('keyword_filter');
      uiState.setSearchPattern('temp1');
      uiState.cancelEditing();
      expect(uiState.getSearchPattern()).toBe('session1');

      // Second edit session
      uiState.setSearchPattern('session2');

      uiState.startEditing('keyword_filter');
      uiState.setSearchPattern('temp2');
      uiState.cancelEditing();
      expect(uiState.getSearchPattern()).toBe('session2');
    });
  });

  describe('ESC in normal mode (reset all)', () => {
    it('should reset all filters to default state when ESC is pressed in normal mode', () => {
      // Set complex state
      uiState.setDisplayMode('unique');
      uiState.toggleEventFilter('Delete');
      uiState.toggleEventFilter('Move');
      uiState.setSearchPattern('complex-filter');

      // resetAllFilters = normal mode ESC
      uiState.resetAllFilters();

      // All filters should be active (6 event types)
      expect(uiState.getActiveFilters()).toHaveLength(6);
      expect(uiState.getSearchPattern()).toBe('');
      expect(uiState.getDisplayState()).toBe('stream_live');
    });

    it('should reset to default even from complex filtered state', () => {
      // Heavy filtering
      uiState.setDisplayMode('unique');
      uiState.toggleEventFilter('Modify');
      uiState.toggleEventFilter('Delete');
      uiState.toggleEventFilter('Move');
      uiState.toggleEventFilter('Find');
      uiState.toggleEventFilter('Restore');
      uiState.setSearchPattern('very-specific-search-term');

      uiState.resetAllFilters();

      expect(uiState.getActiveFilters()).toHaveLength(6);
      expect(uiState.getSearchPattern()).toBe('');
    });

    it('should not affect normal mode ESC when no editing session is active', () => {
      uiState.toggleEventFilter('Delete');
      uiState.toggleEventFilter('Move');
      uiState.setSearchPattern('test');

      uiState.resetAllFilters();

      expect(uiState.getActiveFilters()).toHaveLength(6);
      expect(uiState.getSearchPattern()).toBe('');
    });
  });

  describe('Mode state management', () => {
    it('should correctly track editing vs normal mode transitions', () => {
      // Initial: stream_live
      expect(uiState.getDisplayState()).toBe('stream_live');

      // Enter event filter editing
      uiState.startEditing('event_type_filter');
      expect(uiState.getDisplayState()).toBe('event_type_filter');

      // ESC cancels → stream_live
      uiState.cancelEditing();
      expect(uiState.getDisplayState()).toBe('stream_live');

      // Enter keyword filter editing
      uiState.startEditing('keyword_filter');
      expect(uiState.getDisplayState()).toBe('keyword_filter');

      // ESC cancels → stream_live
      uiState.cancelEditing();
      expect(uiState.getDisplayState()).toBe('stream_live');
    });

    it('should maintain mode consistency across multiple operations', () => {
      const validStates = ['stream_live', 'event_type_filter', 'keyword_filter', 'stream_paused', 'detail'];

      const operations = [
        () => uiState.startEditing('event_type_filter'),
        () => uiState.toggleEventFilter('Create'),
        () => uiState.cancelEditing(),
        () => uiState.startEditing('keyword_filter'),
        () => uiState.setSearchPattern('test'),
        () => uiState.cancelEditing(),
        () => uiState.resetAllFilters()
      ];

      for (const operation of operations) {
        operation();
        expect(validStates).toContain(uiState.getDisplayState());
      }

      expect(uiState.getDisplayState()).toBe('stream_live');
    });
  });

  describe('Edge Cases', () => {
    it('should handle cancelEditing when no saved state exists', () => {
      // cancelEditing without startEditing (no saved state)
      uiState.setSearchPattern('test');
      uiState.cancelEditing();

      // Should not crash, display state goes to stream_live
      expect(uiState.getDisplayState()).toBe('stream_live');
    });

    it('should handle rapid resetAllFilters operations', () => {
      uiState.setSearchPattern('test');

      uiState.resetAllFilters();
      uiState.resetAllFilters();

      expect(uiState.getSearchPattern()).toBe('');
      expect(uiState.getActiveFilters()).toHaveLength(6);
    });

    it('should preserve state integrity during complex edit sequences', () => {
      // 1. Set base state
      uiState.setSearchPattern('base');

      // 2. Start editing, modify, cancel → restores to 'base'
      uiState.startEditing('keyword_filter');
      uiState.setSearchPattern('edit1');
      uiState.cancelEditing();
      expect(uiState.getSearchPattern()).toBe('base');

      // 3. Start editing again, modify, confirm → keeps 'edit2'
      uiState.startEditing('keyword_filter');
      uiState.setSearchPattern('edit2');
      uiState.confirmEditing();
      expect(uiState.getSearchPattern()).toBe('edit2');

      // 4. Reset all
      uiState.resetAllFilters();
      expect(uiState.getSearchPattern()).toBe('');
    });
  });
});
