/**
 * Shared mock helpers for test event data.
 * Extracted from supplement-ui-data-manager.test.ts.
 * @created 2026-03-14
 */

/**
 * Create an array of mock EventRow objects for testing.
 */
export function createMockEvents(count: number) {
  return Array.from({ length: count }, (_, i) => ({
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
  }));
}
