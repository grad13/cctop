/**
 * navigation-behavior.test
 * @created 2026-03-13
 * @checked -
 * @updated 2026-03-13
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { UIState } from '../../../src/ui/UIState';
import { EventRow } from '../../../src/types/event-row';

describe('Navigation Behavior', () => {
  let uiState: UIState;
  
  const mockEvents: EventRow[] = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    timestamp: 1719899271 + i,
    filename: `file${i + 1}.ts`,
    directory: '/src',
    event_type: 'modify',
    size: 1024,
    lines: 50,
    blocks: 2,
    inode: 12345,
    elapsed_ms: 1000
  }));

  beforeEach(() => {
    uiState = new UIState();
    uiState.setEvents(mockEvents);
  });

  describe('Bottom boundary behavior', () => {
    it('should not wrap to top when pressing down at bottom', () => {
      // Move to last item
      uiState.setSelectedIndex(9);
      expect(uiState.getSelectedIndex()).toBe(9);
      
      // Try to move down
      uiState.moveSelectionDown();
      
      // Should still be at last item
      expect(uiState.getSelectedIndex()).toBe(9);
    });

    it('should allow moving up from bottom', () => {
      // Move to last item
      uiState.setSelectedIndex(9);
      
      // Move up
      uiState.moveSelectionUp();
      
      // Should be at second to last
      expect(uiState.getSelectedIndex()).toBe(8);
    });
  });

});

describe('Search Mode Behavior', () => {
  let uiState: UIState;

  beforeEach(() => {
    uiState = new UIState();
  });

  describe('Local search during typing', () => {
    it('should start with empty search pattern when entering search mode', () => {
      uiState.startEditing('keyword_filter');
      expect(uiState.getDisplayState()).toBe('keyword_filter');
      expect(uiState.getSearchText()).toBe('');
    });

    it('should allow local filtering while typing', () => {
      uiState.startEditing('keyword_filter');
      uiState.appendToSearchPattern('test');
      expect(uiState.getSearchText()).toBe('test');
    });

    it('should update search results when backspacing', () => {
      uiState.startEditing('keyword_filter');
      uiState.appendToSearchPattern('test');
      uiState.backspaceSearchPattern();
      expect(uiState.getSearchText()).toBe('tes');
    });
  });
});