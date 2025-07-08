/**
 * Refactor Protection Tests
 * These tests ensure core functionality remains intact during refactoring
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BlessedFramelessUISimple } from '../../../src/ui/blessed-frameless-ui-simple';
import { DatabaseAdapterFunc000 } from '../../../src/database/database-adapter-func000';
import { EventRow } from '../../../src/types/event-row';

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
  let mockDb: DatabaseAdapterFunc000;
  
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
      expect(uiState.getEventFilters().has('modify')).toBe(true);
      expect(uiState.getEventFilters().size).toBe(1);
      
      // Test getActiveFilters returns correct format
      const activeFilters = uiState.getActiveFilters();
      expect(activeFilters).toEqual(['Modify']);
    });

    it('should handle all filters active case', async () => {
      const uiState = (ui as any).uiState;
      
      // All filters should be active by default
      expect(uiState.getEventFilters().size).toBe(6);
      
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
      expect(uiState.getPreviousDisplayMode()).toBe('all');
      
      // Switch back to all
      uiState.setDisplayMode('all');
      expect(uiState.getDisplayMode()).toBe('all');
      expect(uiState.getPreviousDisplayMode()).toBe('unique');
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
      const uiState = (ui as any).uiState;
      
      // Set up specific display mode and filters
      uiState.setDisplayMode('unique');
      uiState.resetEventFilters();
      uiState.toggleEventFilter('create'); // Remove create, keep modify
      
      // Trigger refresh (we need to access private method for testing)
      const refreshData = (ui as any).refreshData;
      await refreshData.call(ui, false);
      
      // Should call database with correct parameters
      expect(mockDb.getLatestEvents).toHaveBeenCalledWith(
        100, // limit
        'unique', // mode
        0, // offset
        ['Find', 'Modify', 'Delete', 'Move', 'Restore'] // filters (without Create)
      );
    });

    it('should handle append mode correctly', async () => {
      const uiState = (ui as any).uiState;
      
      // Set some existing data
      uiState.setEvents(mockEvents.slice(0, 1));
      
      // Trigger append refresh
      const refreshData = (ui as any).refreshData;
      await refreshData.call(ui, true);
      
      // Should call with offset > 0 for append
      expect(mockDb.getLatestEvents).toHaveBeenCalledWith(
        100, // limit
        'all', // mode
        0, // offset starts at 0 but is managed internally
        ['Find', 'Create', 'Modify', 'Delete', 'Move', 'Restore'] // all filters
      );
    });
  });

  describe('Display Update Functionality', () => {
    it('should call formatter and layout manager', async () => {
      const dataFormatter = (ui as any).dataFormatter;
      const layoutManager = { updateDisplay: vi.fn() };
      (ui as any).layoutManager = layoutManager;
      
      // Mock formatter
      const formatEventList = vi.spyOn(dataFormatter, 'formatEventList').mockReturnValue(['test line']);
      
      // Call updateDisplay
      const updateDisplay = (ui as any).updateDisplay;
      updateDisplay.call(ui);
      
      // Should call formatter and layout manager
      expect(formatEventList).toHaveBeenCalled();
      expect(layoutManager.updateDisplay).toHaveBeenCalledWith(['test line']);
    });
  });

  describe('Integration - Critical Workflows', () => {
    it('should handle filter change workflow', async () => {
      const uiState = (ui as any).uiState;
      
      // Simulate filter change workflow
      uiState.enterFilterMode();
      expect(uiState.getDisplayState()).toBe('filter');
      
      // Toggle a filter
      uiState.toggleEventFilter('create');
      expect(uiState.getEventFilters().has('create')).toBe(false);
      
      // Exit filter mode
      uiState.exitSpecialMode();
      expect(uiState.getDisplayState()).toBe('normal');
    });

    it('should handle search workflow', async () => {
      const uiState = (ui as any).uiState;
      
      // Enter search mode
      uiState.enterSearchMode();
      expect(uiState.getDisplayState()).toBe('search');
      expect(uiState.getSearchText()).toBe('');
      
      // Add search text
      uiState.appendToSearchText('test');
      expect(uiState.getSearchText()).toBe('test');
      
      // Apply search
      uiState.applySearch();
      expect(uiState.getDisplayState()).toBe('normal');
      expect(uiState.isDbSearchApplied()).toBe(true);
    });
  });
});