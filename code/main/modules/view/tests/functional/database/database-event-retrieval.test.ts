/**
 * Event Data Retrieval Tests
 * Tests for event data querying and filtering
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { DatabaseTestSetup } from './test-helpers/database-test-setup';
import { DatabaseAdapter } from '../../../../src/database/database-adapter.ts';

describe('Event Data Retrieval', () => {
  let testSetup: DatabaseTestSetup;
  let testDir: string;
  let dbPath: string;
  let adapter: DatabaseAdapter;

  beforeAll(() => {
    testSetup = new DatabaseTestSetup();
    ({ testDir, dbPath } = testSetup.createTestEnvironment());
  });

  afterAll(() => {
    testSetup.cleanupTestEnvironment();
  });

  beforeEach(async () => {
    adapter = testSetup.createDatabaseAdapter(dbPath);
    await testSetup.createTestDatabase(adapter);
  });

  it('should retrieve latest events in correct format', async () => {
    const events = await adapter.getLatestEvents(10);
    
    expect(Array.isArray(events)).toBe(true);
    
    if (events.length > 0) {
      const event = events[0];
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('event_type');
      expect(event).toHaveProperty('filename');
      expect(event).toHaveProperty('directory');
      expect(event).toHaveProperty('lines');
      expect(event).toHaveProperty('blocks');
    }
  });

  it('should support All mode (all events)', async () => {
    const events = await adapter.getLatestEvents(10, 'all');
    expect(Array.isArray(events)).toBe(true);
  });

  it('should support Unique mode (latest per file)', async () => {
    const events = await adapter.getLatestEvents(10, 'unique');
    expect(Array.isArray(events)).toBe(true);
    
    // In unique mode, each file should appear only once
    const filenames = events.map(e => e.filename);
    const uniqueFilenames = [...new Set(filenames)];
    expect(filenames.length).toBe(uniqueFilenames.length);
  });

  it('should filter events by type correctly', async () => {
    // Add specific event types to test filtering
    await adapter.database.prepare(`
      INSERT INTO events (timestamp, event_type, filename, directory, lines, blocks)
      VALUES ('2025-07-04 16:00:00', 'create', 'filter_test.js', 'test', 10, 1)
    `).run();

    const allEvents = await adapter.getLatestEvents(100);
    const createEvents = allEvents.filter(e => e.event_type === 'create');
    
    expect(createEvents.length).toBeGreaterThan(0);
    createEvents.forEach(event => {
      expect(event.event_type).toBe('create');
    });
  });

  it('should return event count', async () => {
    const count = await testSetup.getEventCount(adapter);
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it('should handle empty database gracefully', async () => {
    // Create a new adapter with empty database
    const emptyDbPath = testDir + '/empty.db';
    const emptyAdapter = testSetup.createDatabaseAdapter(emptyDbPath);
    await emptyAdapter.connect();
    
    const events = await emptyAdapter.getLatestEvents(10);
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBe(0);
    
    await emptyAdapter.disconnect();
  });

  it('should respect limit parameter', async () => {
    const limit = 2;
    const events = await adapter.getLatestEvents(limit);
    expect(events.length).toBeLessThanOrEqual(limit);
  });

  it('should order events by timestamp descending', async () => {
    // Add events with specific timestamps
    const timestamps = [
      '2025-07-04 16:01:00',
      '2025-07-04 16:02:00',
      '2025-07-04 16:03:00'
    ];

    for (let i = 0; i < timestamps.length; i++) {
      await adapter.database.prepare(`
        INSERT INTO events (timestamp, event_type, filename, directory, lines, blocks)
        VALUES (?, 'create', ?, 'test', 10, 1)
      `).run(timestamps[i], `test_order_${i}.js`);
    }

    const events = await adapter.getLatestEvents(10);
    
    if (events.length >= 2) {
      // Events should be ordered from newest to oldest
      const firstTimestamp = new Date(events[0].timestamp).getTime();
      const secondTimestamp = new Date(events[1].timestamp).getTime();
      expect(firstTimestamp).toBeGreaterThanOrEqual(secondTimestamp);
    }
  });

  it('should handle events with null/undefined fields gracefully', async () => {
    // Insert event with minimal data
    await adapter.database.prepare(`
      INSERT INTO events (timestamp, event_type, filename)
      VALUES ('2025-07-04 16:00:00', 'create', 'minimal.js')
    `).run();

    const events = await adapter.getLatestEvents(10);
    expect(Array.isArray(events)).toBe(true);
    
    // Should not throw error even with null fields
    events.forEach(event => {
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('event_type');
      expect(event).toHaveProperty('filename');
    });
  });

  it('should handle large result sets efficiently', async () => {
    // Insert many events
    const insertCount = 1000;
    const stmt = adapter.database.prepare(`
      INSERT INTO events (timestamp, event_type, filename, directory, lines, blocks)
      VALUES (?, 'create', ?, 'test', ?, 1)
    `);

    for (let i = 0; i < insertCount; i++) {
      stmt.run(
        `2025-07-04 ${String(16 + Math.floor(i / 3600)).padStart(2, '0')}:${String(Math.floor((i % 3600) / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}`,
        `bulk_test_${i}.js`,
        Math.floor(Math.random() * 100) + 1
      );
    }

    const startTime = Date.now();
    const events = await adapter.getLatestEvents(100);
    const endTime = Date.now();

    expect(events.length).toBeLessThanOrEqual(100);
    expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
  });

  it('should support pagination-like behavior', async () => {
    // Get first batch
    const firstBatch = await adapter.getLatestEvents(2);
    
    // Get second batch by excluding first batch IDs
    if (firstBatch.length > 0) {
      const allEvents = await adapter.getLatestEvents(10);
      const secondBatch = allEvents.slice(2, 4);
      
      // Batches should not overlap
      const firstIds = firstBatch.map(e => e.id || `${e.timestamp}-${e.filename}`);
      const secondIds = secondBatch.map(e => e.id || `${e.timestamp}-${e.filename}`);
      
      const overlap = firstIds.some(id => secondIds.includes(id));
      expect(overlap).toBe(false);
    }
  });
});