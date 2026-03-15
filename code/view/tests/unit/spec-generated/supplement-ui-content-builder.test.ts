/**
 * UIContentBuilder Unit Tests (from spec: supplement-ui-content-builder.md)
 * Tests content generation rules not covered by blessed-ui-*.test.ts
 * @created 2026-03-14
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UIContentBuilder } from '../../../src/ui/UIContentBuilder';
import { UIState } from '../../../src/ui/UIState';
import type { EventTableViewport } from '../../../src/ui/interfaces/EventTableViewport';

// Mock the KeywordSearchManager
vi.mock('../../../src/search', () => ({
  KeywordSearchManager: {
    getDisplayText: vi.fn((text: string) => text),
  },
}));

function createMockEventTable(): EventTableViewport {
  return {
    getColumnHeader: vi.fn().mockReturnValue('TIME  EVENT  FILE  DIR'),
    updateContent: vi.fn(),
    updateScreenWidth: vi.fn(),
    refresh: vi.fn(),
    getBox: vi.fn(),
    getViewportInfo: vi.fn(),
    destroy: vi.fn(),
    setViewConfig: vi.fn(),
  };
}

describe('UIContentBuilder', () => {
  let builder: UIContentBuilder;
  let uiState: UIState;
  let mockEventTable: EventTableViewport;

  beforeEach(() => {
    uiState = new UIState();
    mockEventTable = createMockEventTable();
    builder = new UIContentBuilder(uiState, mockEventTable);
  });

  describe('buildHeaderContent', () => {
    it('should include version string and daemon status', () => {
      const content = builder.buildHeaderContent();
      expect(content).toContain('cctop v0.5.0.0');
      expect(content).toContain('{bold}');
      expect(content).toContain('{/bold}');
    });

    it('should include daemon status from UIState', () => {
      uiState.setDaemonStatus('{green-fg}Daemon: RUNNING{/green-fg}');
      const content = builder.buildHeaderContent();
      expect(content).toContain('Daemon: RUNNING');
    });

    it('should include column header from EventTable', () => {
      const content = builder.buildHeaderContent();
      expect(content).toContain('TIME  EVENT  FILE  DIR');
      expect(mockEventTable.getColumnHeader).toHaveBeenCalled();
    });

    it('should not show Keyword section when no search pattern', () => {
      uiState.setSearchPattern('');
      const content = builder.buildHeaderContent();
      expect(content).not.toContain('Keyword:');
    });

    it('should show Keyword section when search pattern is active', () => {
      uiState.setSearchPattern('test-query');
      const content = builder.buildHeaderContent();
      expect(content).toContain('Keyword: test-query');
    });
  });

  describe('buildCommandLine1', () => {
    it('should show standard keys in stream_live state', () => {
      uiState.setDisplayState('stream_live');
      const content = builder.buildCommandLine1();
      expect(content).toContain('[q] Exit');
      expect(content).toContain('[space]');
      expect(content).toContain('[x] Refresh');
      expect(content).toContain('[a] All');
      expect(content).toContain('[u] Unique');
    });

    it('should gray out q in keyword_filter state', () => {
      uiState.setDisplayState('keyword_filter');
      const content = builder.buildCommandLine1();
      expect(content).toContain('{gray-fg}[q] Exit');
    });

    it('should show Pause text when in stream_live state', () => {
      uiState.setDisplayState('stream_live');
      const content = builder.buildCommandLine1();
      expect(content).toContain('Pause');
    });

    it('should show Resume text when in stream_paused state', () => {
      uiState.setDisplayState('stream_paused');
      const content = builder.buildCommandLine1();
      expect(content).toContain('Resume');
    });

    it('should highlight All mode with green when displayMode is all', () => {
      uiState.setDisplayMode('all');
      uiState.setDisplayState('stream_live');
      const content = builder.buildCommandLine1();
      expect(content).toContain('{green-fg}[a] All{/green-fg}');
    });

    it('should highlight Unique mode with green when displayMode is unique', () => {
      uiState.setDisplayMode('unique');
      uiState.setDisplayState('stream_live');
      const content = builder.buildCommandLine1();
      expect(content).toContain('{green-fg}[u] Unique{/green-fg}');
    });

    it('should gray out mode keys in keyword_filter when not active', () => {
      uiState.setDisplayState('keyword_filter');
      uiState.setDisplayMode('all');
      const content = builder.buildCommandLine1();
      // Unique should be grayed since it is not the active mode
      expect(content).toContain('{gray-fg}[u] Unique{/gray-fg}');
    });
  });

  describe('buildKeyGuideContent', () => {
    it('should show filter guide in event_type_filter state', () => {
      uiState.setDisplayState('event_type_filter');
      const content = builder.buildKeyGuideContent();
      expect(content).toContain('[Enter] Confirm Filter');
      expect(content).toContain('[ESC] Cancel Back');
    });

    it('should show filter guide in keyword_filter state', () => {
      uiState.setDisplayState('keyword_filter');
      const content = builder.buildKeyGuideContent();
      expect(content).toContain('[Enter] Confirm Filter');
      expect(content).toContain('[ESC] Cancel Back');
    });

    it('should show reset guide in stream_live state', () => {
      uiState.setDisplayState('stream_live');
      const content = builder.buildKeyGuideContent();
      expect(content).toContain('[ESC] Reset All Filters');
    });

    it('should show reset guide in stream_paused state', () => {
      uiState.setDisplayState('stream_paused');
      const content = builder.buildKeyGuideContent();
      expect(content).toContain('[ESC] Reset All Filters');
    });

    it('should always show Select an Event guidance', () => {
      for (const state of ['stream_live', 'stream_paused', 'event_type_filter', 'keyword_filter'] as const) {
        uiState.setDisplayState(state);
        const content = builder.buildKeyGuideContent();
        expect(content).toContain('Select an Event');
      }
    });
  });

  describe('buildDynamicControlContent', () => {
    it('should show filter shortcuts in stream_live state', () => {
      uiState.setDisplayState('stream_live');
      const content = builder.buildDynamicControlContent();
      expect(content).toContain('[f] Event-Type Filter');
      expect(content).toContain('[/] Keyword Filter');
    });

    it('should show filter shortcuts in stream_paused state', () => {
      uiState.setDisplayState('stream_paused');
      const content = builder.buildDynamicControlContent();
      expect(content).toContain('[f] Event-Type Filter');
      expect(content).toContain('[/] Keyword Filter');
    });

    it('should show filter toggle buttons in event_type_filter state', () => {
      uiState.setDisplayState('event_type_filter');
      const content = builder.buildDynamicControlContent();
      expect(content).toContain('Find');
      expect(content).toContain('Create');
      expect(content).toContain('Modify');
      expect(content).toContain('Delete');
      expect(content).toContain('Move');
      expect(content).toContain('Restore');
    });

    it('should show enabled filters in yellow and disabled in gray', () => {
      uiState.setDisplayState('event_type_filter');
      uiState.toggleEventFilter('find'); // disable find

      const content = builder.buildDynamicControlContent();
      // Find should now be grayed
      expect(content).toContain('{gray-fg}[f] Find{/gray-fg}');
      // Create should still be yellow (enabled)
      expect(content).toContain('{yellow-fg}[c] Create{/yellow-fg}');
    });

    it('should show keyword input box in keyword_filter state', () => {
      uiState.setDisplayState('keyword_filter');
      uiState.setSearchPattern('hello');
      const content = builder.buildDynamicControlContent();
      expect(content).toContain('Keyword:');
      expect(content).toContain('hello');
      expect(content).toContain('[Shift+Enter] Search DB');
    });

    it('should pad keyword input to MAX_SEARCH_LENGTH', () => {
      uiState.setDisplayState('keyword_filter');
      uiState.setSearchPattern('hi');
      const content = builder.buildDynamicControlContent();
      // Should contain underscores as padding (40 - 2 = 38 underscores)
      expect(content).toContain('_'.repeat(38));
    });
  });
});
