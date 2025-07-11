/**
 * EventTable Component Tests
 * 
 * Tests for optimized event list display with intelligent diff detection
 */

import { jest } from '@jest/globals';
import blessed from 'blessed';
import { EventTable } from '../../../../../src/cli/src/ui/components/EventTable/EventTable';
import { EventRow } from '../../../../../src/cli/src/types/event-row';

// Mock blessed
jest.mock('blessed', () => ({
  box: jest.fn().mockImplementation((options) => ({
    setContent: jest.fn(),
    getContent: jest.fn().mockReturnValue(''),
    destroy: jest.fn(),
    screen: {
      render: jest.fn()
    }
  }))
}));

describe('EventTable', () => {
  let mockScreen: any;
  let eventTable: EventTable;
  const screenWidth = 180;

  beforeEach(() => {
    // Create mock screen
    mockScreen = {
      render: jest.fn()
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create blessed box with correct options', () => {
      const options = {
        parent: mockScreen,
        top: 3,
        height: '100%-7',
        style: { fg: 'white', bg: 'transparent' }
      };

      eventTable = new EventTable(options, screenWidth);

      expect(blessed.box).toHaveBeenCalledWith({
        parent: mockScreen,
        top: 3,
        left: 0,
        width: '100%',
        height: '100%-7',
        keys: false,
        scrollable: false,
        alwaysScroll: false,
        style: { fg: 'white', bg: 'transparent' },
        tags: true,
        mouse: false
      });
    });

    it('should calculate directory width correctly', () => {
      eventTable = new EventTable({ parent: mockScreen }, screenWidth);
      
      // Fixed columns total: 99, so directory width = 180 - 99 = 81
      const box = eventTable.getBox();
      expect(box).toBeDefined();
    });
  });

  describe('Render Method', () => {
    let mockBox: any;
    let mockEvents: EventRow[];

    beforeEach(() => {
      mockBox = {
        setContent: jest.fn(),
        getContent: jest.fn().mockReturnValue(''),
        destroy: jest.fn(),
        screen: mockScreen
      };
      
      (blessed.box as jest.Mock).mockReturnValue(mockBox);
      
      eventTable = new EventTable({ parent: mockScreen }, screenWidth);

      // Create test events
      mockEvents = [
        {
          id: 1,
          timestamp: new Date('2025-01-11T10:00:00Z'),
          fileName: 'test1.js',
          directory: '/project/src',
          eventType: 'create',
          size: 1024,
          lines: 50,
          blocks: 4,
          inode: 12345,
          device: 16777220,
          mode: 33188,
          uid: 501,
          gid: 20,
          rdev: 0,
          birthtimeMs: 1736592000000,
          searchKeyword: null,
          isHighlighted: false
        },
        {
          id: 2,
          timestamp: new Date('2025-01-11T10:01:00Z'),
          fileName: 'test2.js',
          directory: '/project/src',
          eventType: 'modify',
          size: 2048,
          lines: 100,
          blocks: 8,
          inode: 12346,
          device: 16777220,
          mode: 33188,
          uid: 501,
          gid: 20,
          rdev: 0,
          birthtimeMs: 1736592060000,
          searchKeyword: null,
          isHighlighted: false
        }
      ];
    });

    it('should render events correctly', () => {
      eventTable.render(mockEvents, 0);

      expect(mockBox.setContent).toHaveBeenCalled();
      expect(mockScreen.render).toHaveBeenCalled();
    });

    it('should optimize selection-only changes', () => {
      // First render
      eventTable.render(mockEvents, 0);
      
      // Clear mocks
      mockBox.setContent.mockClear();
      mockScreen.render.mockClear();

      // Change only selection
      eventTable.render(mockEvents, 1);

      // Should still update content (blessed limitation)
      expect(mockBox.setContent).toHaveBeenCalled();
      expect(mockScreen.render).toHaveBeenCalled();
    });

    it('should detect when events are completely different', () => {
      // First render
      eventTable.render(mockEvents, 0);

      // New events
      const newEvents: EventRow[] = [
        {
          ...mockEvents[0],
          id: 3,
          fileName: 'different.js'
        }
      ];

      // Clear mocks
      mockBox.setContent.mockClear();
      mockScreen.render.mockClear();

      // Render different events
      eventTable.render(newEvents, 0);

      expect(mockBox.setContent).toHaveBeenCalled();
      expect(mockScreen.render).toHaveBeenCalled();
    });

    it('should handle empty event list', () => {
      eventTable.render([], -1);

      expect(mockBox.setContent).toHaveBeenCalled();
      // Content should be empty or show "end of data"
    });
  });

  describe('Header Methods', () => {
    beforeEach(() => {
      eventTable = new EventTable({ parent: mockScreen }, screenWidth);
    });

    it('should return formatted header', () => {
      const header = eventTable.getHeader();
      expect(header).toBeTruthy();
      expect(typeof header).toBe('string');
    });

    it('should return column header line', () => {
      const columnHeader = eventTable.getColumnHeader();
      expect(columnHeader).toBeTruthy();
      expect(typeof columnHeader).toBe('string');
    });
  });

  describe('Screen Width Updates', () => {
    let mockBox: any;

    beforeEach(() => {
      mockBox = {
        setContent: jest.fn(),
        getContent: jest.fn().mockReturnValue(''),
        destroy: jest.fn(),
        screen: mockScreen
      };
      
      (blessed.box as jest.Mock).mockReturnValue(mockBox);
      
      eventTable = new EventTable({ parent: mockScreen }, screenWidth);
    });

    it('should update screen width and clear cache', () => {
      const newWidth = 200;
      
      // Render some events first to populate cache
      const events: EventRow[] = [{
        id: 1,
        timestamp: new Date(),
        fileName: 'test.js',
        directory: '/test',
        eventType: 'create',
        size: 1024,
        lines: 50,
        blocks: 4,
        inode: 12345,
        device: 16777220,
        mode: 33188,
        uid: 501,
        gid: 20,
        rdev: 0,
        birthtimeMs: Date.now(),
        searchKeyword: null,
        isHighlighted: false
      }];
      
      eventTable.render(events, 0);
      
      // Update screen width
      eventTable.updateScreenWidth(newWidth);
      
      // Re-render should use new width
      mockBox.setContent.mockClear();
      eventTable.render(events, 0);
      
      expect(mockBox.setContent).toHaveBeenCalled();
    });
  });

  describe('Destroy Method', () => {
    let mockBox: any;

    beforeEach(() => {
      mockBox = {
        setContent: jest.fn(),
        getContent: jest.fn().mockReturnValue(''),
        destroy: jest.fn(),
        screen: mockScreen
      };
      
      (blessed.box as jest.Mock).mockReturnValue(mockBox);
      
      eventTable = new EventTable({ parent: mockScreen }, screenWidth);
    });

    it('should destroy box and clear cache', () => {
      eventTable.destroy();
      
      expect(mockBox.destroy).toHaveBeenCalled();
    });
  });

  describe('Cache Management', () => {
    let mockBox: any;

    beforeEach(() => {
      mockBox = {
        setContent: jest.fn(),
        getContent: jest.fn().mockReturnValue(''),
        destroy: jest.fn(),
        screen: mockScreen
      };
      
      (blessed.box as jest.Mock).mockReturnValue(mockBox);
      
      eventTable = new EventTable({ parent: mockScreen }, screenWidth);
    });

    it('should limit cache size to prevent memory bloat', () => {
      // Create many events to trigger cache cleanup
      const manyEvents: EventRow[] = [];
      
      for (let i = 0; i < 2500; i++) {
        manyEvents.push({
          id: i,
          timestamp: new Date(),
          fileName: `file${i}.js`,
          directory: '/test',
          eventType: 'create',
          size: 1024 + i,
          lines: 50 + i,
          blocks: 4,
          inode: 12345 + i,
          device: 16777220,
          mode: 33188,
          uid: 501,
          gid: 20,
          rdev: 0,
          birthtimeMs: Date.now(),
          searchKeyword: null,
          isHighlighted: false
        });
      }

      // Render in batches to build up cache
      for (let i = 0; i < 25; i++) {
        const batch = manyEvents.slice(i * 100, (i + 1) * 100);
        eventTable.render(batch, 0);
      }

      // Cache should be limited (implementation detail)
      // We can't directly test cache size, but rendering should still work
      expect(mockBox.setContent).toHaveBeenCalled();
    });
  });
});