/**
 * func000-compliance.test
 * @created 2026-03-13
 * @checked -
 * @updated 2026-03-15
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FileEventReader } from '../../../src/database/FileEventReader';
import { DatabaseTestHelper } from './test-helpers/database-test-helper';

describe('FUNC-000 Compliance Test', () => {
  let dbAdapter: FileEventReader;
  let helper: DatabaseTestHelper;

  beforeAll(() => {
    helper = new DatabaseTestHelper();
    helper.createTestEnvironment();
    helper.createTestDbWithSampleData();
    dbAdapter = new FileEventReader(helper['dbPath']);
  });

  afterAll(async () => {
    if (dbAdapter) {
      await dbAdapter.disconnect();
    }
    helper.cleanupTestEnvironment();
  });

  it('should retrieve events with correct FUNC-000 schema', async () => {
    await dbAdapter.connect();
    const events = await dbAdapter.getLatestEvents(5, 'all');

    expect(events).toBeDefined();
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThan(0);

    // Verify each event has FUNC-000 compliant structure
    events.forEach((event) => {
      // Required FUNC-000 fields
      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('filename');
      expect(event).toHaveProperty('directory');
      expect(event).toHaveProperty('event_type');
      expect(event).toHaveProperty('size');
      expect(event).toHaveProperty('lines');
      expect(event).toHaveProperty('blocks');
      expect(event).toHaveProperty('inode');

      // Verify data types
      expect(typeof event.id).toBe('number');
      expect(typeof event.timestamp).toBe('number');
      expect(typeof event.filename).toBe('string');
      expect(typeof event.directory).toBe('string');
      expect(typeof event.event_type).toBe('string');
      expect(typeof event.size).toBe('number');
      expect(typeof event.lines).toBe('number');
      expect(typeof event.blocks).toBe('number');
      expect(typeof event.inode).toBe('number');
    });

    // Verify we have non-zero lines and blocks (real data)
    const hasNonZeroLines = events.some(e => e.lines > 0);
    const hasNonZeroBlocks = events.some(e => e.blocks > 0);

    expect(hasNonZeroLines).toBe(true);
    expect(hasNonZeroBlocks).toBe(true);
  });

  it('should work with unique mode', async () => {
    const events = await dbAdapter.getLatestEvents(5, 'unique');

    expect(events).toBeDefined();
    expect(Array.isArray(events)).toBe(true);

    if (events.length > 0) {
      const event = events[0];
      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('filename');
      expect(event).toHaveProperty('event_type');
      expect(event).toHaveProperty('lines');
      expect(event).toHaveProperty('blocks');
    }
  });
});
