/**
 * Test Mock Objects for Progressive Loader
 * Common mock implementations used across multiple test suites
 */

import { vi } from 'vitest';

/**
 * Creates a mock database manager with standard methods
 */
export function createMockDatabaseManager() {
  return {
    getEventCount: vi.fn(),
    getEventsBatch: vi.fn(),
    getRecentEvents: vi.fn()
  };
}

/**
 * Creates a mock display manager for UI testing
 */
export function createMockDisplayManager() {
  return {
    addEvents: vi.fn()
  };
}

/**
 * Creates a mock status display for status message testing
 */
export function createMockStatusDisplay() {
  return {
    updateMessage: vi.fn()
  };
}

/**
 * Creates a complete mock setup for progressive loader tests
 */
export function createMockSetup() {
  return {
    mockDatabaseManager: createMockDatabaseManager(),
    mockDisplayManager: createMockDisplayManager(),
    mockStatusDisplay: createMockStatusDisplay()
  };
}