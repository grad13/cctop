/**
 * Shared mock helpers for database adapter.
 * Extracted from supplement-ui-data-manager.test.ts.
 * @created 2026-03-14
 */
import { vi } from 'vitest';

/**
 * Create a mock database adapter with standard query methods.
 */
export function createMockDb() {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    getLatestEvents: vi.fn().mockResolvedValue([]),
    searchEvents: vi.fn().mockResolvedValue([]),
    getEventsAfterId: vi.fn().mockResolvedValue([]),
  } as any;
}
