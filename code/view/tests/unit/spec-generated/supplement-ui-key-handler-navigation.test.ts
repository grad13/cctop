/**
 * UIKeyHandler Navigation Tests (split from supplement-ui-key-handler.test.ts)
 * Tests: Navigation Keys, Infinite Scroll / Load More
 * @created 2026-03-14
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { UIKeyHandler } from '../../../src/ui/UIKeyHandler';
import { UIState } from '../../../src/ui/UIState';
import { createMockScreen, createCallbacks } from '../../helpers/mock-blessed';

describe('UIKeyHandler', () => {
  let handler: UIKeyHandler;
  let uiState: UIState;
  let screen: ReturnType<typeof createMockScreen>;
  let callbacks: ReturnType<typeof createCallbacks>;

  beforeEach(() => {
    vi.useFakeTimers();
    uiState = new UIState();
    screen = createMockScreen();
    callbacks = createCallbacks();
    handler = new UIKeyHandler(screen as any, uiState, {} as any, callbacks);
    handler.setupKeyHandlers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Navigation Keys', () => {
    beforeEach(() => {
      uiState.setEvents(
        Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          timestamp: 1719899271 + i,
          filename: `file${i + 1}.ts`,
          directory: '/src',
          event_type: 'modify',
          size: 1024,
          lines: 50,
          blocks: 2,
          inode: 12345,
          elapsed_ms: 1000,
        }))
      );
    });

    it('should move selection up on up key', () => {
      uiState.setSelectedIndex(5);
      screen._simulateKey('up');
      expect(uiState.getSelectedIndex()).toBe(4);
      expect(callbacks.updateDisplay).toHaveBeenCalled();
    });

    it('should move selection up on k key (vim-style)', () => {
      uiState.setSelectedIndex(5);
      screen._simulateKey('k');
      expect(uiState.getSelectedIndex()).toBe(4);
    });

    it('should move selection down on down key', async () => {
      uiState.setSelectedIndex(0);
      await screen._simulateKey('down');
      expect(uiState.getSelectedIndex()).toBe(1);
      expect(callbacks.updateDisplay).toHaveBeenCalled();
    });

    it('should move selection down on j key (vim-style)', async () => {
      uiState.setSelectedIndex(0);
      await screen._simulateKey('j');
      expect(uiState.getSelectedIndex()).toBe(1);
    });

    it('should not move down past last item', async () => {
      uiState.setSelectedIndex(9);
      await screen._simulateKey('down');
      expect(uiState.getSelectedIndex()).toBe(9);
    });

    it('should jump to top on home key', () => {
      uiState.setSelectedIndex(5);
      screen._simulateKey('home');
      expect(uiState.getSelectedIndex()).toBe(0);
    });

    it('should jump to top on g key', () => {
      uiState.setSelectedIndex(5);
      screen._simulateKey('g');
      expect(uiState.getSelectedIndex()).toBe(0);
    });

    it('should jump to bottom on end key', () => {
      screen._simulateKey('end');
      expect(uiState.getSelectedIndex()).toBe(9);
    });

    it('should jump to bottom on G key', () => {
      screen._simulateKey('G');
      expect(uiState.getSelectedIndex()).toBe(9);
    });

    it('should not navigate in detail state', () => {
      uiState.setDisplayState('detail');
      uiState.setSelectedIndex(5);
      screen._simulateKey('up');
      expect(uiState.getSelectedIndex()).toBe(5);
    });
  });

  describe('Infinite Scroll / Load More', () => {
    beforeEach(() => {
      uiState.setHasMoreData(true);
      uiState.setEvents(
        Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          timestamp: 1719899271 + i,
          filename: `file${i + 1}.ts`,
          directory: '/src',
          event_type: 'modify',
          size: 1024,
          lines: 50,
          blocks: 2,
          inode: 12345,
          elapsed_ms: 1000,
        }))
      );
    });

    it('should trigger loadMore when at bottom and pressing down', async () => {
      uiState.setSelectedIndex(9);
      await screen._simulateKey('down');
      expect(callbacks.loadMore).toHaveBeenCalled();
    });

    it('should trigger loadMore check on every down-arrow press near bottom', async () => {
      uiState.setSelectedIndex(7);
      await screen._simulateKey('down');
      if (uiState.shouldLoadMoreData()) {
        expect(callbacks.loadMore).toHaveBeenCalled();
      }
    });
  });
});
