/**
 * UIKeyHandler Input Tests (split from supplement-ui-key-handler.test.ts)
 * Tests: Filter Keys, Debounced Search, Character Input Filtering, Key State Guards
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

  describe('Filter Keys', () => {
    it('should toggle create filter on c key in event_type_filter', () => {
      uiState.setDisplayState('event_type_filter');
      const wasEnabled = uiState.getEventTypeFilters().isEventTypeEnabled('create');
      screen._simulateKey('c');
      expect(uiState.getEventTypeFilters().isEventTypeEnabled('create')).toBe(!wasEnabled);
    });

    it('should toggle modify filter on m key in event_type_filter', () => {
      uiState.setDisplayState('event_type_filter');
      screen._simulateKey('m');
      expect(uiState.getEventTypeFilters().isEventTypeEnabled('modify')).toBe(false);
    });

    it('should toggle delete filter on d key in event_type_filter', () => {
      uiState.setDisplayState('event_type_filter');
      screen._simulateKey('d');
      expect(uiState.getEventTypeFilters().isEventTypeEnabled('delete')).toBe(false);
    });

    it('should toggle move filter on v key in event_type_filter', () => {
      uiState.setDisplayState('event_type_filter');
      screen._simulateKey('v');
      expect(uiState.getEventTypeFilters().isEventTypeEnabled('move')).toBe(false);
    });

    it('should toggle restore filter on r key in event_type_filter', () => {
      uiState.setDisplayState('event_type_filter');
      screen._simulateKey('r');
      expect(uiState.getEventTypeFilters().isEventTypeEnabled('restore')).toBe(false);
    });

    it('should not toggle filters when not in event_type_filter state', () => {
      uiState.setDisplayState('stream_live');
      screen._simulateKey('c');
      expect(uiState.getEventTypeFilters().isEventTypeEnabled('create')).toBe(true);
    });
  });

  describe('Debounced Search', () => {
    it('should trigger debounced search on character input in keyword_filter', () => {
      uiState.setDisplayState('keyword_filter');
      screen._simulateKeypress('a', { name: 'a', ctrl: false, meta: false });

      expect(uiState.getSearchPattern()).toBe('a');
      expect(callbacks.updateDynamicControl).toHaveBeenCalled();

      expect(callbacks.refreshData).not.toHaveBeenCalled();

      vi.advanceTimersByTime(300);
      expect(callbacks.refreshData).toHaveBeenCalled();
    });

    it('should reset selection to index 0 on each keystroke', () => {
      uiState.setDisplayState('keyword_filter');
      uiState.setSelectedIndex(5);

      screen._simulateKeypress('b', { name: 'b', ctrl: false, meta: false });

      expect(uiState.getSelectedIndex()).toBe(0);
    });

    it('should handle backspace in keyword_filter', () => {
      uiState.setDisplayState('keyword_filter');
      uiState.setSearchPattern('test');

      screen._simulateKeypress('', { name: 'backspace', ctrl: false, meta: false });

      expect(uiState.getSearchPattern()).toBe('tes');
    });

    it('should debounce multiple keystrokes (only last triggers refresh)', () => {
      uiState.setDisplayState('keyword_filter');

      screen._simulateKeypress('a', { name: 'a', ctrl: false, meta: false });
      vi.advanceTimersByTime(100);
      screen._simulateKeypress('b', { name: 'b', ctrl: false, meta: false });
      vi.advanceTimersByTime(100);
      screen._simulateKeypress('c', { name: 'c', ctrl: false, meta: false });

      expect(callbacks.refreshData).not.toHaveBeenCalled();

      vi.advanceTimersByTime(300);
      expect(callbacks.refreshData).toHaveBeenCalledTimes(1);
    });
  });

  describe('Character Input Filtering', () => {
    it('should accept printable ASCII characters (charCode 32-126)', () => {
      uiState.setDisplayState('keyword_filter');

      screen._simulateKeypress(' ', { name: 'space', ctrl: false, meta: false });
      expect(uiState.getSearchPattern()).toBe(' ');
    });

    it('should accept tilde (charCode 126)', () => {
      uiState.setDisplayState('keyword_filter');

      screen._simulateKeypress('~', { name: '~', ctrl: false, meta: false });
      expect(uiState.getSearchPattern()).toBe('~');
    });

    it('should reject control characters (\\r, \\n)', () => {
      uiState.setDisplayState('keyword_filter');

      screen._simulateKeypress('\r', { name: 'return', ctrl: false, meta: false });
      screen._simulateKeypress('\n', { name: 'linefeed', ctrl: false, meta: false });
      expect(uiState.getSearchPattern()).toBe('');
    });

    it('should ignore ctrl-modified keys', () => {
      uiState.setDisplayState('keyword_filter');

      screen._simulateKeypress('a', { name: 'a', ctrl: true, meta: false });
      expect(uiState.getSearchPattern()).toBe('');
    });

    it('should ignore meta-modified keys', () => {
      uiState.setDisplayState('keyword_filter');

      screen._simulateKeypress('a', { name: 'a', ctrl: false, meta: true });
      expect(uiState.getSearchPattern()).toBe('');
    });

    it('should not accept characters outside keyword_filter state', () => {
      uiState.setDisplayState('stream_live');

      screen._simulateKeypress('a', { name: 'a', ctrl: false, meta: false });
      expect(uiState.getSearchPattern()).toBe('');
    });
  });

  describe('Key State Guards', () => {
    it('should block most keys in keyword_filter state', () => {
      uiState.setDisplayState('keyword_filter');

      screen._simulateKey('q');
      expect(callbacks.stop).not.toHaveBeenCalled();

      screen._simulateKey('x');
      expect(callbacks.refreshData).not.toHaveBeenCalled();

      screen._simulateKey('space');
      expect(uiState.getDisplayState()).toBe('keyword_filter');
    });
  });
});
