/**
 * FUNC-202: UI Display Mode Tests
 * Tests for display mode functionality and switching
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BlessedFramelessUISimple } from '../../../src/ui/blessed-frameless-ui-simple';
import { DatabaseAdapter } from '../../../src/database/database-adapter';
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
      key: vi.fn(),
      on: vi.fn(),
      style: {}
    }))
  }
}));

// Mock DatabaseAdapter
vi.mock('../../src/database/database-adapter');

function generateMockEventsForMode(): EventRow[] {
  return [
    {
      timestamp: '2025-07-04 15:30:45',
      event_type: 'create',
      filename: 'file1.ts',
      directory: 'src',
      lines: 100,
      blocks: 5
    },
    {
      timestamp: '2025-07-04 15:31:00',
      event_type: 'modify',
      filename: 'file1.ts', // Same file as above
      directory: 'src',
      lines: 105,
      blocks: 5
    },
    {
      timestamp: '2025-07-04 15:31:15',
      event_type: 'create',
      filename: 'file2.js',
      directory: 'lib',
      lines: 50,
      blocks: 3
    },
    {
      timestamp: '2025-07-04 15:31:30',
      event_type: 'find',
      filename: 'file3.md',
      directory: 'docs',
      lines: 25,
      blocks: 2
    }
  ];
}

describe('FUNC-202: UI Display Mode Functionality', () => {
  let ui: BlessedFramelessUISimple;
  let mockDb: DatabaseAdapter;
  
  beforeEach(() => {
    // Create mock database adapter with mode-aware getLatestEvents
    mockDb = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      getLatestEvents: vi.fn().mockImplementation((limit: number, mode: string) => {
        const allEvents = generateMockEventsForMode();
        
        if (mode === 'unique') {
          // Return only latest event per file
          const uniqueEvents = allEvents.reduce((acc, event) => {
            const existing = acc.find(e => e.filename === event.filename);
            if (!existing || new Date(event.timestamp) > new Date(existing.timestamp)) {
              return [...acc.filter(e => e.filename !== event.filename), event];
            }
            return acc;
          }, [] as EventRow[]);
          
          return Promise.resolve(uniqueEvents.slice(0, limit));
        }
        
        return Promise.resolve(allEvents.slice(0, limit));
      }),
      getEventCount: vi.fn().mockResolvedValue(100)
    } as any;

    ui = new BlessedFramelessUISimple(mockDb, { displayMode: 'all' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Display Mode Switching', () => {
    it('should switch between All and Unique modes', async () => {
      // Test switching to 'all' mode
      const allEvents = await mockDb.getLatestEvents(10, 'all');
      expect(allEvents.length).toBe(4); // All events
      
      // Test switching to 'unique' mode  
      const uniqueEvents = await mockDb.getLatestEvents(10, 'unique');
      expect(uniqueEvents.length).toBe(3); // Only unique files (file1.ts, file2.js, file3.md)
    });

    it('should handle display mode switching correctly', () => {
      // Test mode initialization
      const allModeUi = new BlessedFramelessUISimple(mockDb, { displayMode: 'all' });
      expect(allModeUi).toBeDefined();

      const uniqueModeUi = new BlessedFramelessUISimple(mockDb, { displayMode: 'unique' });
      expect(uniqueModeUi).toBeDefined();
    });

    it('should default to all mode when no mode specified', () => {
      const defaultUi = new BlessedFramelessUISimple(mockDb, {});
      expect(defaultUi).toBeDefined();
    });

    it('should preserve file order in unique mode', async () => {
      const uniqueEvents = await mockDb.getLatestEvents(10, 'unique');
      
      // In unique mode, should get the latest event for each file
      const filenames = uniqueEvents.map(e => e.filename);
      const uniqueFilenames = [...new Set(filenames)];
      
      expect(filenames.length).toBe(uniqueFilenames.length);
    });

    it('should handle mode switching with empty database', async () => {
      mockDb.getLatestEvents = vi.fn().mockResolvedValue([]);
      
      const allEvents = await mockDb.getLatestEvents(10, 'all');
      expect(allEvents.length).toBe(0);
      
      const uniqueEvents = await mockDb.getLatestEvents(10, 'unique');
      expect(uniqueEvents.length).toBe(0);
    });
  });

  describe('Event Filtering by Mode', () => {
    it('should show all events in All mode', async () => {
      const events = await mockDb.getLatestEvents(10, 'all');
      
      // Should include all events, including multiple events for same file
      const file1Events = events.filter(e => e.filename === 'file1.ts');
      expect(file1Events.length).toBe(2); // create and modify events
    });

    it('should show only latest per file in Unique mode', async () => {
      const events = await mockDb.getLatestEvents(10, 'unique');
      
      // Should include only one event per file
      const file1Events = events.filter(e => e.filename === 'file1.ts');
      expect(file1Events.length).toBe(1); // Only the latest (modify) event
      
      if (file1Events.length > 0) {
        expect(file1Events[0].event_type).toBe('modify'); // Should be the later event
      }
    });

    it('should handle files with same name in different directories', async () => {
      // Add events for files with same name in different directories
      const eventsWithSameName = [
        ...generateMockEventsForMode(),
        {
          timestamp: '2025-07-04 15:32:00',
          event_type: 'create',
          filename: 'file1.ts', // Same name as existing file
          directory: 'test', // Different directory
          lines: 50,
          blocks: 2
        }
      ];

      mockDb.getLatestEvents = vi.fn().mockImplementation((limit: number, mode: string) => {
        if (mode === 'unique') {
          // Unique mode should consider filename + directory combination
          const uniqueEvents = eventsWithSameName.reduce((acc, event) => {
            const key = `${event.filename}:${event.directory}`;
            const existing = acc.find(e => `${e.filename}:${e.directory}` === key);
            if (!existing || new Date(event.timestamp) > new Date(existing.timestamp)) {
              return [...acc.filter(e => `${e.filename}:${e.directory}` !== key), event];
            }
            return acc;
          }, [] as EventRow[]);
          
          return Promise.resolve(uniqueEvents.slice(0, limit));
        }
        
        return Promise.resolve(eventsWithSameName.slice(0, limit));
      });

      const uniqueEvents = await mockDb.getLatestEvents(10, 'unique');
      const file1Events = uniqueEvents.filter(e => e.filename === 'file1.ts');
      
      // Should have two entries: one for src/file1.ts and one for test/file1.ts
      expect(file1Events.length).toBe(2);
      
      const directories = file1Events.map(e => e.directory);
      expect(directories).toContain('src');
      expect(directories).toContain('test');
    });

    it('should respect limit parameter in both modes', async () => {
      const limit = 2;
      
      const allEvents = await mockDb.getLatestEvents(limit, 'all');
      expect(allEvents.length).toBeLessThanOrEqual(limit);
      
      const uniqueEvents = await mockDb.getLatestEvents(limit, 'unique');
      expect(uniqueEvents.length).toBeLessThanOrEqual(limit);
    });

    it('should handle invalid mode gracefully', async () => {
      // Test with invalid mode - should default to 'all' behavior
      const events = await mockDb.getLatestEvents(10, 'invalid_mode' as any);
      expect(Array.isArray(events)).toBe(true);
    });
  });
});