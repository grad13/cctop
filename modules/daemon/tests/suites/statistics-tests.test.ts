/**
 * Statistics and Size Tracking Tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { TestEnvironment, TestFileOperations } from '../helpers/TestHelpers';
import { DatabaseQueries } from '../helpers/DatabaseQueries';
import { TestDaemonManager } from '../helpers/DaemonManager';

describe('Statistics and Size Tracking', () => {
  let testEnv: TestEnvironment;
  let dbQueries: DatabaseQueries;
  let daemonManager: TestDaemonManager;

  beforeEach(async () => {
    testEnv = new TestEnvironment();
    await testEnv.setup();
    dbQueries = new DatabaseQueries(testEnv.testDbPath);
    daemonManager = new TestDaemonManager(testEnv.testDir);
  });

  afterEach(async () => {
    await daemonManager.stopDaemon();
    await testEnv.cleanup();
  });

  test('should track file size statistics correctly', async () => {
    const daemon = await daemonManager.startDaemon();
    await dbQueries.recreateTriggersForTest();

    const testFile = 'size-test.txt';
    const sizes = TestFileOperations.getSizeTestCases();

    console.log('=== DEBUG: Expected sizes ===');
    sizes.forEach((s, index) => {
      console.log(`Size ${index + 1}: "${s.content}" = ${s.size} bytes`);
    });

    // Create file with first content
    await testEnv.createTestFile(testFile, sizes[0].content);
    await testEnv.wait(500);

    // Modify file with subsequent sizes
    for (let i = 1; i < sizes.length; i++) {
      await testEnv.createTestFile(testFile, sizes[i].content);
      await testEnv.wait(300);
    }

    await testEnv.wait(1000);

    const aggregates = await dbQueries.queryAggregatesTable();
    expect(aggregates.length).toBe(1);

    const aggregate = aggregates[0];
    const expectedFirstSize = sizes[0].size;
    const expectedLastSize = sizes[sizes.length - 1].size;
    const expectedMaxSize = Math.max(...sizes.map(s => s.size));

    console.log('=== DEBUG: Size statistics ===');
    console.log({
      first_size: aggregate.first_size,
      max_size: aggregate.max_size,
      last_size: aggregate.last_size,
      expected: {
        first: expectedFirstSize,
        max: expectedMaxSize,
        last: expectedLastSize
      }
    });

    expect(aggregate.first_size).toBe(expectedFirstSize);
    expect(aggregate.max_size).toBe(expectedMaxSize);
    expect(aggregate.last_size).toBe(expectedLastSize);
  });

  test('should provide accurate global statistics', async () => {
    const daemon = await daemonManager.startDaemon();
    await dbQueries.recreateTriggersForTest();

    const operations = [
      { file: 'global1.txt', operations: ['create', 'modify'] },
      { file: 'global2.js', operations: ['create'] },
      { file: 'global3.md', operations: ['create', 'modify'] }
    ];

    await TestFileOperations.performFileOperations(operations, testEnv.testDir);
    await testEnv.wait(1000);

    const globalStats = await dbQueries.queryGlobalStatistics();

    console.log('=== DEBUG: Global statistics ===');
    console.log(globalStats);

    expect(globalStats.total_files).toBe(3);
    expect(globalStats.total_creates).toBe(3);
    expect(globalStats.total_modifies).toBe(2);
    expect(globalStats.total_moves).toBe(0);
    expect(globalStats.total_deletes).toBe(0);
    expect(globalStats.total_restores).toBe(0);
    expect(globalStats.total_events).toBe(5);
  });

  test('should update timestamps correctly', async () => {
    const daemon = await daemonManager.startDaemon();
    await dbQueries.recreateTriggersForTest();

    const testFile = 'timestamp-test.txt';
    const startTime = Date.now();

    await testEnv.createTestFile(testFile, 'Initial content');
    await testEnv.wait(500);

    let aggregates = await dbQueries.queryAggregatesTable();
    expect(aggregates.length).toBe(1);
    const firstTimestamp = aggregates[0].first_event_timestamp;

    await testEnv.wait(1000);
    await testEnv.createTestFile(testFile, 'Modified content');
    await testEnv.wait(500);

    aggregates = await dbQueries.queryAggregatesTable();
    const lastTimestamp = aggregates[0].last_event_timestamp;

    console.log('=== DEBUG: Timestamp verification ===');
    console.log({
      start_time: startTime,
      first_event: firstTimestamp,
      last_event: lastTimestamp,
      time_diff: lastTimestamp - firstTimestamp
    });

    expect(firstTimestamp).toBeGreaterThan(startTime / 1000 - 5);
    expect(lastTimestamp).toBeGreaterThan(firstTimestamp);
    expect(lastTimestamp - firstTimestamp).toBeGreaterThan(0.5);
  });
});