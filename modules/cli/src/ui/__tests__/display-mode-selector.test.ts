/**
 * Display Mode Selector Tests
 * Tests for all/unique mode functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BlessedFramelessUISimple } from '../blessed-frameless-ui-simple';
import { DatabaseAdapter } from '../../database/database-adapter';
import { EventRow } from '../../types/event-row';

// Mock blessed
vi.mock('blessed', () => ({
  screen: vi.fn(() => ({
    destroy: vi.fn(),
    append: vi.fn(),
    render: vi.fn(),
    key: vi.fn()
  })),
  box: vi.fn(() => ({
    setContent: vi.fn()
  })),
  list: vi.fn(() => ({
    setItems: vi.fn(),
    key: vi.fn()
  }))
}));

describe('Display Mode Selector', () => {
  let ui: BlessedFramelessUISimple;
  let mockDb: DatabaseAdapter;
  let mockEvents: EventRow[];

  beforeEach(() => {
    // Mock events
    mockEvents = [
      {
        id: 1,
        timestamp: '2025-07-04T10:00:00Z',
        filename: 'file1.ts',
        directory: '/src',
        event_type: 'modify',
        size: 1000,
        lines: 50,
        blocks: 10,
        inode: 12345,
        elapsed_ms: 100
      },
      {
        id: 2,
        timestamp: '2025-07-04T10:01:00Z',
        filename: 'file1.ts',
        directory: '/src',
        event_type: 'modify',
        size: 1100,
        lines: 55,
        blocks: 11,
        inode: 12345,
        elapsed_ms: 150
      },
      {
        id: 3,
        timestamp: '2025-07-04T10:02:00Z',
        filename: 'file2.ts',
        directory: '/src',
        event_type: 'create',
        size: 500,
        lines: 25,
        blocks: 5,
        inode: 12346,
        elapsed_ms: 50
      }
    ];

    // Mock database
    mockDb = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      getLatestEvents: vi.fn().mockImplementation((limit, mode) => {
        if (mode === 'unique') {
          // Return only latest event per file
          return Promise.resolve([mockEvents[1], mockEvents[2]]);
        }
        return Promise.resolve(mockEvents);
      })
    } as any;

    ui = new BlessedFramelessUISimple(mockDb, {
      displayMode: 'all'
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Database Integration', () => {
    it('should call getLatestEvents with "all" mode by default', async () => {
      await ui.start();
      
      expect(mockDb.getLatestEvents).toHaveBeenCalledWith(100, 'all');
    });

    it('should call getLatestEvents with "unique" mode when switched', async () => {
      await ui.start();
      
      // Simulate mode switch
      (ui as any).switchDisplayMode('unique');
      
      expect(mockDb.getLatestEvents).toHaveBeenCalledWith(100, 'unique');
    });
  });

  describe('Mode Switching', () => {
    it('should switch from all to unique mode', async () => {
      await ui.start();
      
      expect((ui as any).displayMode).toBe('all');
      
      (ui as any).switchDisplayMode('unique');
      
      expect((ui as any).displayMode).toBe('unique');
    });

    it('should not refresh if mode is already set', async () => {
      await ui.start();
      vi.clearAllMocks();
      
      (ui as any).switchDisplayMode('all');
      
      // Should not call getLatestEvents again
      expect(mockDb.getLatestEvents).not.toHaveBeenCalled();
    });
  });

  describe('Header Display', () => {
    it('should not show mode in header', () => {
      const header = (ui as any).buildHeaderContent();
      expect(header).not.toContain('Mode:');
    });

    it('should keep header consistent regardless of mode', () => {
      const headerAll = (ui as any).buildHeaderContent();
      (ui as any).displayMode = 'unique';
      const headerUnique = (ui as any).buildHeaderContent();
      
      // Remove dynamic parts (filters, search) for comparison
      const staticPartAll = headerAll.split('│')[0];
      const staticPartUnique = headerUnique.split('│')[0];
      
      expect(staticPartAll).toBe(staticPartUnique);
    });
  });
});