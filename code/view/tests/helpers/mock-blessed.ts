/**
 * Shared mock helpers for blessed screen and box components.
 * Extracted from supplement-ui-key-handler.test.ts and EventTable.test.ts.
 * @created 2026-03-14
 */
import { vi } from 'vitest';

/**
 * Create a mock blessed screen that stores registered key handlers.
 * Provides _simulateKey() and _simulateKeypress() for testing.
 */
export function createMockScreen() {
  const keyHandlers: Record<string, Function> = {};
  const eventHandlers: Record<string, Function> = {};

  return {
    key: vi.fn((keys: string[], handler: Function) => {
      for (const k of keys) {
        keyHandlers[k] = handler;
      }
    }),
    on: vi.fn((event: string, handler: Function) => {
      eventHandlers[event] = handler;
    }),
    render: vi.fn(),
    _simulateKey: (key: string) => {
      if (keyHandlers[key]) {
        return keyHandlers[key]();
      }
    },
    _simulateKeypress: (ch: string, keyObj: any) => {
      if (eventHandlers['keypress']) {
        eventHandlers['keypress'](ch, keyObj);
      }
    },
  };
}

/**
 * Create UIKeyHandler callback mocks.
 */
export function createCallbacks() {
  return {
    refreshData: vi.fn().mockResolvedValue(undefined),
    updateDisplay: vi.fn(),
    updateDynamicControl: vi.fn(),
    updateStatusBar: vi.fn(),
    stop: vi.fn().mockResolvedValue(undefined),
    loadMore: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Create a mock blessed box for EventTable tests.
 * Use with vi.mock('blessed', ...) at file scope.
 * @param screen - optional screen reference (defaults to { render: vi.fn() })
 */
export function createMockBox(screen?: any) {
  return {
    setContent: vi.fn(),
    getContent: vi.fn().mockReturnValue(''),
    destroy: vi.fn(),
    screen: screen ?? { render: vi.fn() },
  };
}
