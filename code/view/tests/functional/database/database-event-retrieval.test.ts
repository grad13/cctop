/**
 * Event Data Retrieval Tests
 * Tests for event data querying and filtering
 * @created 2026-03-13
 * @checked -
 * @updated 2026-03-15
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DatabaseTestHelper } from './test-helpers/database-test-helper';
import { FileEventReader } from '../../../src/database/FileEventReader';

describe('Event Data Retrieval', () => {
  let helper: DatabaseTestHelper;
  let dbPath: string;
  let adapter: FileEventReader;

  beforeAll(async () => {
    helper = new DatabaseTestHelper();
    ({ dbPath } = helper.createTestEnvironment());
    helper.createTestDbWithSampleData();
    adapter = new FileEventReader(dbPath);
    await adapter.connect();
  });

  afterAll(async () => {
    if (adapter) {
      await adapter.disconnect();
    }
    helper.cleanupTestEnvironment();
  });

  it('should retrieve latest events in correct format', async () => {
    const events = await adapter.getLatestEvents(10);

    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBe(5);

    const event = events[0];
    expect(event).toHaveProperty('timestamp');
    expect(event).toHaveProperty('event_type');
    expect(event).toHaveProperty('filename');
    expect(event).toHaveProperty('directory');
    expect(event).toHaveProperty('lines');
    expect(event).toHaveProperty('blocks');
  });

  it('should support All mode (all events)', async () => {
    const events = await adapter.getLatestEvents(10, 'all');
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBe(5);
  });

  it('should support Unique mode (latest per file)', async () => {
    const events = await adapter.getLatestEvents(10, 'unique');
    expect(Array.isArray(events)).toBe(true);

    // In unique mode, each file should appear only once
    // app.ts has 2 events (Find + Modify), so unique should return 4
    const filenames = events.map(e => e.filename);
    const uniqueFilenames = [...new Set(filenames)];
    expect(filenames.length).toBe(uniqueFilenames.length);
    expect(events.length).toBe(4);
  });

  it('should handle empty database gracefully', async () => {
    const emptyDbPath = helper['testDir'] + '/empty.db';
    helper.createEmptyTestDb(emptyDbPath);

    const emptyAdapter = new FileEventReader(emptyDbPath);
    await emptyAdapter.connect();

    const events = await emptyAdapter.getLatestEvents(10);
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBe(0);

    await emptyAdapter.disconnect();
  });

  it('should respect limit parameter', async () => {
    const events = await adapter.getLatestEvents(2);
    expect(events.length).toBeLessThanOrEqual(2);
  });

  it('should support pagination-like behavior', async () => {
    // Get first batch
    const firstBatch = await adapter.getLatestEvents(2);

    // Get all events
    const allEvents = await adapter.getLatestEvents(10);
    const secondBatch = allEvents.slice(2, 4);

    // Batches should not overlap
    const firstIds = firstBatch.map(e => e.id);
    const secondIds = secondBatch.map(e => e.id);

    const overlap = firstIds.some(id => secondIds.includes(id));
    expect(overlap).toBe(false);
  });
});
