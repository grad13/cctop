/**
 * Refactor Protection Tests
 * These tests ensure core functionality remains intact during refactoring
 * @created 2026-03-13
 * @checked -
 * @updated 2026-03-13
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BlessedFramelessUISimple } from '../../../src/ui/BlessedFramelessUI';
import { FileEventReader } from '../../../src/database/FileEventReader';
import { EventRow } from '../../../src/types/event-row';
import { UIDataManager } from '../../../src/ui/UIDataManager';
import { UIState } from '../../../src/ui/UIState';

// Mock blessed module
vi.mock('blessed', () => ({
  default: {
    screen: vi.fn(() => ({
      title: '',
      key: vi.fn(),
      render: vi.fn(),
      destroy: vi.fn(),
      on: vi.fn(),
      program: {
        hideCursor: vi.fn(),
        showCursor: vi.fn()
      }
    })),
    box: vi.fn(() => ({
      setContent: vi.fn(),
      style: {},
      on: vi.fn()
    })),
    list: vi.fn(() => ({
      setItems: vi.fn(),
      style: {},
      on: vi.fn(),
      focus: vi.fn(),
      select: vi.fn()
    })),
    parseTags: vi.fn((text) => text)
  }
}));

// Mock sqlite3
vi.mock('sqlite3', () => ({
  default: {
    Database: vi.fn(),
    OPEN_READONLY: 1
  }
}));

describe('Refactor Protection - Core Functions', () => {
  let ui: BlessedFramelessUISimple;
  let mockDb: FileEventReader;
  
  const mockEvents: EventRow[] = [
    {
      id: 1,
      timestamp: '2025-07-07T10:00:00Z',
      filename: 'test1.ts',
      directory: '/src',
      event_type: 'Modify',
      size: 100,
      lines: 10,
      blocks: 1,
      inode: 1001,
      elapsed_ms: 0
    },
    {
      id: 2,
      timestamp: '2025-07-07T10:01:00Z',
      filename: 'test2.ts',
      directory: '/src',
      event_type: 'Create',
      size: 200,
      lines: 20,
      blocks: 2,
      inode: 1002,
      elapsed_ms: 0
    },
    {
      id: 3,
      timestamp: '2025-07-07T10:02:00Z',
      filename: 'test1.ts',
      directory: '/src',
      event_type: 'Modify',
      size: 150,
      lines: 15,
      blocks: 1,
      inode: 1001,
      elapsed_ms: 0
    }
  ];

  beforeEach(() => {
    // Mock database adapter
    mockDb = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      getLatestEvents: vi.fn().mockResolvedValue(mockEvents),
      searchEvents: vi.fn().mockResolvedValue(mockEvents.slice(0, 1)),
      query: vi.fn().mockResolvedValue([])
    } as any;

    ui = new BlessedFramelessUISimple(mockDb, { displayMode: 'all' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Event Filter Functionality', () => {
    it('should correctly filter events by type', async () => {
      // Test that event filters work
      const uiState = (ui as any).uiState;
      
      // Set filter to only 'Modify' events
      uiState.resetEventFilters();
      uiState.toggleEventFilter('create');
      uiState.toggleEventFilter('delete');
      uiState.toggleEventFilter('find');
      uiState.toggleEventFilter('move');
      uiState.toggleEventFilter('restore');
      
      // Should only have 'modify' filter
      const filters = uiState.getEventTypeFilters();
      expect(filters.isEventTypeEnabled('modify')).toBe(true);
      expect(filters.getActiveFilters().length).toBe(1);
      
      // Test getActiveFilters returns correct format
      const activeFilters = uiState.getActiveFilters();
      expect(activeFilters).toEqual(['Modify']);
    });

    it('should handle all filters active case', async () => {
      const uiState = (ui as any).uiState;
      
      // All filters should be active by default
      expect(uiState.getEventTypeFilters().getActiveFilters().length).toBe(6);
      
      const activeFilters = uiState.getActiveFilters();
      expect(activeFilters).toEqual(['Find', 'Create', 'Modify', 'Delete', 'Move', 'Restore']);
    });
  });

  describe('Display Mode Functionality', () => {
    it('should support switching between all and unique modes', async () => {
      const uiState = (ui as any).uiState;

      // Start in 'all' mode
      expect(uiState.getDisplayMode()).toBe('all');

      // Switch to unique
      uiState.setDisplayMode('unique');
      expect(uiState.getDisplayMode()).toBe('unique');

      // Switch back to all
      uiState.setDisplayMode('all');
      expect(uiState.getDisplayMode()).toBe('all');
    });

    it('should reset selection and viewport on mode change', async () => {
      const uiState = (ui as any).uiState;
      
      // Set some initial state
      uiState.setSelectedIndex(5);
      
      // Switch mode
      uiState.setDisplayMode('unique');
      
      // Should reset selection
      expect(uiState.getSelectedIndex()).toBe(0);
      expect(uiState.getViewportStartIndex()).toBe(0);
    });
  });

  describe('Data Refresh Functionality', () => {
    it('should call database with correct parameters', async () => {
      const uiState = new UIState('all');

      // Remove create filter
      uiState.toggleEventFilter('create');

      const dataManager = new UIDataManager(mockDb as any, uiState);
      await dataManager.refreshData(false);

      // refreshAllMode calls getLatestEvents with 'all' mode
      expect(mockDb.getLatestEvents).toHaveBeenCalledWith(
        100,
        'all',
        0,
        expect.arrayContaining(['Find', 'Modify', 'Delete', 'Move', 'Restore'])
      );
    });

    it('should handle append mode correctly', async () => {
      const uiState = new UIState('all');
      uiState.setEvents(mockEvents.slice(0, 1));

      const dataManager = new UIDataManager(mockDb as any, uiState);
      await dataManager.refreshData(true);

      // Append mode: offset = existing events count (1)
      expect(mockDb.getLatestEvents).toHaveBeenCalledWith(
        100,
        'all',
        1,
        expect.arrayContaining(['Find', 'Create', 'Modify', 'Delete', 'Move', 'Restore'])
      );
    });
  });

  describe('Display Update Functionality', () => {
    it('should call layout manager update', async () => {
      const layoutManager = { updateDisplay: vi.fn() };
      (ui as any).layoutManager = layoutManager;
      
      // Call updateDisplay
      const updateDisplay = (ui as any).updateDisplay;
      updateDisplay.call(ui);
      
      // Should call layout manager
      expect(layoutManager.updateDisplay).toHaveBeenCalled();
    });
  });

  describe('Integration - Critical Workflows', () => {
    it('should handle filter change workflow', async () => {
      const uiState = (ui as any).uiState;

      // Simulate filter change workflow
      uiState.startEditing('event_type_filter');
      expect(uiState.getDisplayState()).toBe('event_type_filter');

      // Toggle a filter
      uiState.toggleEventFilter('create');
      expect(uiState.getEventTypeFilters().isEventTypeEnabled('create')).toBe(false);

      // Exit filter mode
      uiState.confirmEditing();
      expect(uiState.getDisplayState()).toBe('stream_live');
    });

    it('should handle search workflow', async () => {
      const uiState = (ui as any).uiState;

      // Enter search mode
      uiState.startEditing('keyword_filter');
      expect(uiState.getDisplayState()).toBe('keyword_filter');
      expect(uiState.getSearchText()).toBe('');

      // Add search text
      uiState.appendToSearchPattern('test');
      expect(uiState.getSearchText()).toBe('test');

      // Confirm search
      uiState.confirmEditing();
      expect(uiState.getDisplayState()).toBe('stream_live');
    });
  });
});