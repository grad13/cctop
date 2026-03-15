/**
 * Runtime Control Management - Performance Tests (Supplement)
 * Spec: documents/spec/view/runtime-control-management.md
 * Covers: Section 7 (Performance Requirements), Section 2 (Pause/Resume control)
 *
 * Existing coverage: blessed-ui-*.test.ts cover basic UI init and mode switching.
 * This file adds: Pause/Resume performance (<50ms), Refresh completion (<500ms),
 * state transition accuracy, error recovery.
 *
 * @created 2026-03-14
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UIState } from '../../../src/ui/UIState';
import { UIDataManager } from '../../../src/ui/UIDataManager';

describe('Runtime Control Management - Performance & State', () => {

  describe('Pause/Resume performance (<50ms)', () => {
    let uiState: UIState;

    beforeEach(() => {
      uiState = new UIState('all');
    });

    it('should toggle pause within 50ms', () => {
      const start = performance.now();
      uiState.togglePause();
      const elapsed = performance.now() - start;

      expect(uiState.isPausedState()).toBe(true);
      expect(elapsed).toBeLessThan(50);
    });

    it('should toggle resume within 50ms', () => {
      uiState.togglePause(); // pause first

      const start = performance.now();
      uiState.togglePause(); // resume
      const elapsed = performance.now() - start;

      expect(uiState.isPausedState()).toBe(false);
      expect(elapsed).toBeLessThan(50);
    });

    it('should toggle pause and resume rapidly 100 times within 50ms total', () => {
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        uiState.togglePause();
      }
      const elapsed = performance.now() - start;

      // 100 toggles should still be well under 50ms
      expect(elapsed).toBeLessThan(50);
      // Even number of toggles returns to original state
      expect(uiState.isPausedState()).toBe(false);
    });
  });

  describe('State transition accuracy: RUNNING <-> PAUSED', () => {
    let uiState: UIState;

    beforeEach(() => {
      uiState = new UIState('all');
    });

    it('should start in RUNNING (stream_live) state', () => {
      expect(uiState.getDisplayState()).toBe('stream_live');
      expect(uiState.isPausedState()).toBe(false);
    });

    it('should transition to PAUSED on first toggle', () => {
      uiState.togglePause();
      expect(uiState.getDisplayState()).toBe('stream_paused');
      expect(uiState.isPausedState()).toBe(true);
    });

    it('should transition back to RUNNING on second toggle', () => {
      uiState.togglePause();
      uiState.togglePause();
      expect(uiState.getDisplayState()).toBe('stream_live');
      expect(uiState.isPausedState()).toBe(false);
    });

    it('should persist pause state across other operations', () => {
      uiState.togglePause();
      expect(uiState.isPausedState()).toBe(true);

      // Other operations should not affect pause state
      uiState.setEvents([{
        timestamp: '2025-07-04 15:30:45',
        event_type: 'modify',
        filename: 'test.ts',
        directory: 'src',
        lines: 10,
        blocks: 1,
      }]);
      expect(uiState.isPausedState()).toBe(true);

      // Display mode change should not affect pause
      // (In real implementation, mode switch may reset to stream_live,
      //  but the spec says user operations remain active during pause)
    });
  });

  describe('Manual Refresh completion (<500ms)', () => {
    it('should complete UIDataManager.refreshData within 500ms with mock DB', async () => {
      const mockDb = {
        getLatestEvents: vi.fn().mockResolvedValue([
          {
            timestamp: '2025-07-04 15:30:45',
            event_type: 'modify',
            filename: 'test.ts',
            directory: 'src',
            lines: 10,
            blocks: 1,
          },
        ]),
        getEventsAfterId: vi.fn().mockResolvedValue([]),
        searchEvents: vi.fn().mockResolvedValue([]),
        disconnect: vi.fn().mockResolvedValue(undefined),
      } as any;

      const uiState = new UIState('all');
      const dataManager = new UIDataManager(mockDb, uiState);

      const start = performance.now();
      await dataManager.refreshData();
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(500);
      expect(uiState.getEventsCount()).toBeGreaterThanOrEqual(0);
    });

    it('should allow manual refresh during pause state', async () => {
      const mockDb = {
        getLatestEvents: vi.fn().mockResolvedValue([{
          timestamp: '2025-07-04 15:30:45',
          event_type: 'create',
          filename: 'new.ts',
          directory: 'src',
          lines: 5,
          blocks: 1,
        }]),
        getEventsAfterId: vi.fn().mockResolvedValue([]),
        searchEvents: vi.fn().mockResolvedValue([]),
        disconnect: vi.fn().mockResolvedValue(undefined),
      } as any;

      const uiState = new UIState('all');
      uiState.togglePause(); // Enter paused state

      const dataManager = new UIDataManager(mockDb, uiState);

      // Manual refresh should still work while paused
      await dataManager.refreshData();
      expect(uiState.getEventsCount()).toBe(1);
    });
  });

  describe('Data collection continues during pause', () => {
    let uiState: UIState;

    beforeEach(() => {
      uiState = new UIState('all');
    });

    it('should report isPausedState true when paused', () => {
      uiState.togglePause();
      expect(uiState.isPausedState()).toBe(true);
    });

    it('should allow setting events while paused (data collection continues)', () => {
      uiState.togglePause();

      uiState.setEvents([
        {
          timestamp: '2025-07-04 15:30:45',
          event_type: 'modify',
          filename: 'test.ts',
          directory: 'src',
          lines: 10,
          blocks: 1,
        },
      ]);

      expect(uiState.getEventsCount()).toBe(1);
      expect(uiState.isPausedState()).toBe(true);
    });
  });

  describe('UIDataManager concurrency control', () => {
    it('should prevent concurrent refreshes', async () => {
      let resolveFirst: () => void;
      const firstPromise = new Promise<void>(r => { resolveFirst = r; });
      let callCount = 0;

      const mockDb = {
        getLatestEvents: vi.fn().mockImplementation(async () => {
          callCount++;
          if (callCount === 1) {
            await firstPromise;
          }
          return [{
            timestamp: '2025-07-04 15:30:45',
            event_type: 'modify',
            filename: 'test.ts',
            directory: 'src',
            lines: 10,
            blocks: 1,
          }];
        }),
        getEventsAfterId: vi.fn().mockResolvedValue([]),
        searchEvents: vi.fn().mockResolvedValue([]),
        disconnect: vi.fn().mockResolvedValue(undefined),
      } as any;

      const uiState = new UIState('all');
      const dataManager = new UIDataManager(mockDb, uiState);

      // Start first refresh (will be blocked)
      const refresh1 = dataManager.refreshData();
      // Start second refresh while first is running
      const refresh2 = dataManager.refreshData();

      // Resolve the first refresh
      resolveFirst!();
      await refresh1;
      await refresh2;

      // Second refresh should have been skipped due to concurrency control
      expect(callCount).toBe(1);
    });
  });
});
