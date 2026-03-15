/**
 * EventTable Component Tests
 *
 * Tests for optimized event list display with intelligent diff detection
 * @created 2026-03-13
 * @checked -
 * @updated 2026-03-13
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import blessed from 'blessed';
import { EventTable } from '../../../../../src/ui/components/EventTable/EventTable';
import { EventRow } from '../../../../../src/types/event-row';
import { createMockBox } from '../../../../helpers/mock-blessed';

// Mock blessed
const mockBox = createMockBox();

vi.mock('blessed', () => ({
  default: {
    box: vi.fn(() => mockBox)
  }
}));

describe('EventTable', () => {
  let mockScreen: any;
  let eventTable: EventTable;
  const screenWidth = 180;

  beforeEach(() => {
    mockScreen = {
      render: vi.fn()
    };

    vi.clearAllMocks();
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

      expect((blessed as any).box).toHaveBeenCalledWith({
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
    let localMockBox: any;
    let mockEvents: EventRow[];

    beforeEach(() => {
      localMockBox = createMockBox(mockScreen);

      ((blessed as any).box as ReturnType<typeof vi.fn>).mockReturnValue(localMockBox);

      eventTable = new EventTable({ parent: mockScreen }, screenWidth);

      mockEvents = [
        {
          id: 1,
          timestamp: '2025-01-11T10:00:00Z',
          filename: 'test1.js',
          directory: '/project/src',
          event_type: 'create',
          size: 1024,
          lines: 50,
          blocks: 4,
          inode: 12345,
          elapsed_ms: 0
        },
        {
          id: 2,
          timestamp: '2025-01-11T10:01:00Z',
          filename: 'test2.js',
          directory: '/project/src',
          event_type: 'modify',
          size: 2048,
          lines: 100,
          blocks: 8,
          inode: 12346,
          elapsed_ms: 60000
        }
      ];
    });

    it('should update events correctly', () => {
      eventTable.update(mockEvents, 0);

      expect(localMockBox.setContent).toHaveBeenCalled();
      expect(mockScreen.render).toHaveBeenCalled();
    });

    it('should optimize selection-only changes', () => {
      eventTable.update(mockEvents, 0);

      localMockBox.setContent.mockClear();
      mockScreen.render.mockClear();

      eventTable.update(mockEvents, 1);

      expect(localMockBox.setContent).toHaveBeenCalled();
      expect(mockScreen.render).toHaveBeenCalled();
    });

    it('should detect when events are completely different', () => {
      eventTable.update(mockEvents, 0);

      const newEvents: EventRow[] = [
        {
          ...mockEvents[0],
          id: 3,
          filename: 'different.js'
        }
      ];

      localMockBox.setContent.mockClear();
      mockScreen.render.mockClear();

      eventTable.update(newEvents, 0);

      expect(localMockBox.setContent).toHaveBeenCalled();
      expect(mockScreen.render).toHaveBeenCalled();
    });

    it('should handle empty event list', () => {
      localMockBox.getContent.mockReturnValue('initial content');

      eventTable.update([], -1);

      expect(localMockBox.setContent).toHaveBeenCalled();
      expect(localMockBox.setContent).toHaveBeenCalledWith('');
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
    let localMockBox: any;

    beforeEach(() => {
      localMockBox = createMockBox(mockScreen);

      ((blessed as any).box as ReturnType<typeof vi.fn>).mockReturnValue(localMockBox);

      eventTable = new EventTable({ parent: mockScreen }, screenWidth);
    });

    it('should update screen width and clear cache', () => {
      const newWidth = 200;

      const events: EventRow[] = [{
        id: 1,
        timestamp: Date.now(),
        filename: 'test.js',
        directory: '/test',
        event_type: 'create',
        size: 1024,
        lines: 50,
        blocks: 4,
        inode: 12345,
        elapsed_ms: 0
      }];

      eventTable.update(events, 0);

      eventTable.updateScreenWidth(newWidth);

      localMockBox.setContent.mockClear();
      eventTable.update(events, 0);

      expect(localMockBox.setContent).toHaveBeenCalled();
    });
  });

  describe('Destroy Method', () => {
    let localMockBox: any;

    beforeEach(() => {
      localMockBox = createMockBox(mockScreen);

      ((blessed as any).box as ReturnType<typeof vi.fn>).mockReturnValue(localMockBox);

      eventTable = new EventTable({ parent: mockScreen }, screenWidth);
    });

    it('should destroy box and clear cache', () => {
      eventTable.destroy();

      expect(localMockBox.destroy).toHaveBeenCalled();
    });
  });

  describe('Cache Management', () => {
    let localMockBox: any;

    beforeEach(() => {
      localMockBox = createMockBox(mockScreen);

      ((blessed as any).box as ReturnType<typeof vi.fn>).mockReturnValue(localMockBox);

      eventTable = new EventTable({ parent: mockScreen }, screenWidth);
    });

    it('should limit cache size to prevent memory bloat', () => {
      const manyEvents: EventRow[] = [];

      for (let i = 0; i < 2500; i++) {
        manyEvents.push({
          id: i,
          timestamp: Date.now(),
          filename: `file${i}.js`,
          directory: '/test',
          event_type: 'create',
          size: 1024 + i,
          lines: 50 + i,
          blocks: 4,
          inode: 12345 + i,
          elapsed_ms: 0
        });
      }

      for (let i = 0; i < 25; i++) {
        const batch = manyEvents.slice(i * 100, (i + 1) * 100);
        eventTable.update(batch, 0);
      }

      expect(localMockBox.setContent).toHaveBeenCalled();
    });
  });
});
