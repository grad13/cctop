/**
 * UIKeyHandler Unit Tests (from spec: supplement-ui-key-handler.md)
 * Tests: getFilterKeyMap, Global Keys, Escape Key, Mode Keys
 * Navigation/Input tests split to separate files.
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

  describe('getFilterKeyMap', () => {
    it('should return map of filter keys to event types', () => {
      const map = handler.getFilterKeyMap();
      expect(map).toEqual({
        f: 'find',
        c: 'create',
        m: 'modify',
        d: 'delete',
        v: 'move',
        r: 'restore',
      });
    });
  });

  describe('Global Keys', () => {
    it('should call stop on q key in stream_live', async () => {
      uiState.setDisplayState('stream_live');
      await screen._simulateKey('q');
      expect(callbacks.stop).toHaveBeenCalled();
    });

    it('should not call stop on q key in keyword_filter state', async () => {
      uiState.setDisplayState('keyword_filter');
      await screen._simulateKey('q');
      expect(callbacks.stop).not.toHaveBeenCalled();
    });

    it('should call stop on C-c regardless of state', async () => {
      uiState.setDisplayState('keyword_filter');
      await screen._simulateKey('C-c');
      expect(callbacks.stop).toHaveBeenCalled();
    });

    it('should call refreshData on x key in stream_live', () => {
      uiState.setDisplayState('stream_live');
      screen._simulateKey('x');
      expect(callbacks.refreshData).toHaveBeenCalled();
    });

    it('should not call refreshData on x key in keyword_filter', () => {
      uiState.setDisplayState('keyword_filter');
      screen._simulateKey('x');
      expect(callbacks.refreshData).not.toHaveBeenCalled();
    });

    it('should toggle pause on space key in stream_live', () => {
      uiState.setDisplayState('stream_live');
      screen._simulateKey('space');
      expect(uiState.getDisplayState()).toBe('stream_paused');
    });

    it('should not toggle pause on space key in keyword_filter', () => {
      uiState.setDisplayState('keyword_filter');
      screen._simulateKey('space');
      expect(uiState.getDisplayState()).toBe('keyword_filter');
    });
  });

  describe('Escape Key', () => {
    it('should cancel editing in event_type_filter state', () => {
      uiState.setDisplayState('event_type_filter');
      screen._simulateKey('escape');
      expect(uiState.getDisplayState()).toBe('stream_live');
      expect(callbacks.updateDynamicControl).toHaveBeenCalled();
      expect(callbacks.updateStatusBar).toHaveBeenCalled();
      expect(callbacks.refreshData).toHaveBeenCalled();
    });

    it('should cancel editing in keyword_filter state', () => {
      uiState.setDisplayState('keyword_filter');
      screen._simulateKey('escape');
      expect(uiState.getDisplayState()).toBe('stream_live');
    });

    it('should reset all filters in stream_live state', () => {
      uiState.setSearchPattern('test');
      uiState.toggleEventFilter('find');
      uiState.setDisplayState('stream_live');
      screen._simulateKey('escape');
      expect(uiState.getSearchPattern()).toBe('');
      expect(uiState.getDisplayState()).toBe('stream_live');
    });

    it('should reset all filters in stream_paused state', () => {
      uiState.setDisplayState('stream_paused');
      screen._simulateKey('escape');
      expect(uiState.getDisplayState()).toBe('stream_live');
    });
  });

  describe('Mode Keys', () => {
    it('should enter event_type_filter on f key from stream_live', () => {
      uiState.setDisplayState('stream_live');
      screen._simulateKey('f');
      expect(uiState.getDisplayState()).toBe('event_type_filter');
      expect(callbacks.updateDynamicControl).toHaveBeenCalled();
    });

    it('should enter event_type_filter on f key from stream_paused', () => {
      uiState.setDisplayState('stream_paused');
      screen._simulateKey('f');
      expect(uiState.getDisplayState()).toBe('event_type_filter');
    });

    it('should toggle find filter on f key when already in event_type_filter', () => {
      uiState.setDisplayState('event_type_filter');
      const wasFindEnabled = uiState.getEventTypeFilters().isEventTypeEnabled('find');
      screen._simulateKey('f');
      const isFindEnabled = uiState.getEventTypeFilters().isEventTypeEnabled('find');
      expect(isFindEnabled).toBe(!wasFindEnabled);
    });

    it('should enter keyword_filter on / key from stream_live', () => {
      uiState.setDisplayState('stream_live');
      screen._simulateKey('/');
      expect(uiState.getDisplayState()).toBe('keyword_filter');
    });

    it('should not enter keyword_filter on / key from keyword_filter', () => {
      uiState.setDisplayState('keyword_filter');
      screen._simulateKey('/');
      expect(uiState.getDisplayState()).toBe('keyword_filter');
    });

    it('should confirm editing on enter key in event_type_filter', () => {
      uiState.setDisplayState('event_type_filter');
      screen._simulateKey('enter');
      expect(uiState.getDisplayState()).toBe('stream_live');
      expect(callbacks.refreshData).toHaveBeenCalled();
    });

    it('should confirm editing on enter key in keyword_filter', () => {
      uiState.setDisplayState('keyword_filter');
      screen._simulateKey('enter');
      expect(uiState.getDisplayState()).toBe('stream_live');
    });

    it('should switch to all mode on a key', () => {
      uiState.setDisplayMode('unique');
      uiState.setDisplayState('stream_live');
      screen._simulateKey('a');
      expect(uiState.getDisplayMode()).toBe('all');
      expect(callbacks.refreshData).toHaveBeenCalled();
    });

    it('should switch to unique mode on u key', () => {
      uiState.setDisplayMode('all');
      uiState.setDisplayState('stream_live');
      screen._simulateKey('u');
      expect(uiState.getDisplayMode()).toBe('unique');
      expect(callbacks.refreshData).toHaveBeenCalled();
    });

    it('should not switch mode on a key in keyword_filter', () => {
      uiState.setDisplayMode('unique');
      uiState.setDisplayState('keyword_filter');
      screen._simulateKey('a');
      expect(uiState.getDisplayMode()).toBe('unique');
    });

    it('should not call refreshData when mode unchanged', () => {
      uiState.setDisplayMode('all');
      uiState.setDisplayState('stream_live');
      screen._simulateKey('a');
      expect(callbacks.refreshData).not.toHaveBeenCalled();
    });
  });
});
