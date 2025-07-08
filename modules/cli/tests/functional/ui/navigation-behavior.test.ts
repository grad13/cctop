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

  describe('Near bottom detection', () => {
    it('should detect when near bottom', () => {
      // Set to position 5 (within 5 items of end with 10 total)
      uiState.setSelectedIndex(5);
      expect(uiState.isNearBottom()).toBe(true);
    });

    it('should not detect as near bottom when at top', () => {
      uiState.setSelectedIndex(0);
      expect(uiState.isNearBottom()).toBe(false);
    });
  });
});

describe('Search Mode Behavior', () => {
  let uiState: UIState;

  beforeEach(() => {
    uiState = new UIState();
  });

  describe('Local search during typing', () => {
    it('should reset DB search flag when entering search mode', () => {
      // First apply a DB search
      uiState.setSearchText('test');
      uiState.applySearch();
      expect(uiState.isDbSearchApplied()).toBe(true);
      
      // Enter search mode again
      uiState.enterSearchMode();
      
      // DB search flag should be reset
      expect(uiState.isDbSearchApplied()).toBe(false);
    });

    it('should allow local filtering while typing', () => {
      const events: EventRow[] = [
        { id: 1, filename: 'test.ts', directory: '/', event_type: 'modify', timestamp: 1, size: 0, lines: 0, blocks: 0, inode: 0, elapsed_ms: 0 },
        { id: 2, filename: 'index.js', directory: '/', event_type: 'modify', timestamp: 2, size: 0, lines: 0, blocks: 0, inode: 0, elapsed_ms: 0 },
        { id: 3, filename: 'readme.md', directory: '/', event_type: 'modify', timestamp: 3, size: 0, lines: 0, blocks: 0, inode: 0, elapsed_ms: 0 }
      ];
      
      uiState.enterSearchMode();
      uiState.setSearchText('test');
      
      // Should filter locally (not DB search)
      const filtered = uiState.applyFilters(events);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].filename).toBe('test.ts');
    });

    it('should update search results when backspacing', () => {
      const events: EventRow[] = [
        { id: 1, filename: 'test.ts', directory: '/', event_type: 'modify', timestamp: 1, size: 0, lines: 0, blocks: 0, inode: 0, elapsed_ms: 0 },
        { id: 2, filename: 'testing.js', directory: '/', event_type: 'modify', timestamp: 2, size: 0, lines: 0, blocks: 0, inode: 0, elapsed_ms: 0 },
        { id: 3, filename: 'readme.md', directory: '/', event_type: 'modify', timestamp: 3, size: 0, lines: 0, blocks: 0, inode: 0, elapsed_ms: 0 }
      ];
      
      uiState.enterSearchMode();
      uiState.setSearchText('testing');
      
      // Should match only 'testing.js'
      let filtered = uiState.applyFilters(events);
      expect(filtered).toHaveLength(1);
      
      // Backspace to 'test'
      uiState.setSearchText('test');
      
      // Should now match both 'test.ts' and 'testing.js'
      filtered = uiState.applyFilters(events);
      expect(filtered).toHaveLength(2);
    });
  });
});