/**
 * Performance and Load Tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { TestEnvironment } from '../helpers/TestHelpers';
import { DatabaseQueries } from '../helpers/DatabaseQueries';
import { TestDaemonManager } from '../helpers/DaemonManager';

describe('Performance Tests', () => {
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

  test('should handle performance requirements (multiple modifications)', async () => {
    const daemon = await daemonManager.startDaemon();
    await dbQueries.recreateTriggersForTest();

    const startTime = Date.now();
    const testFile = 'performance-test.txt';

    await testEnv.createTestFile(testFile, 'Initial content');
    await testEnv.wait(500);

    const numModifications = 20;
    for (let i = 1; i <= numModifications; i++) {
      await testEnv.createTestFile(testFile, `Content modification ${i}`);
      await testEnv.wait(100);
    }

    await testEnv.wait(1000);

    const queryStart = Date.now();
    const aggregates = await dbQueries.queryAggregatesTable();
    const queryTime = Date.now() - queryStart;

    const totalTime = Date.now() - startTime;

    console.log('=== DEBUG: Performance metrics ===');
    console.log({
      total_operations: numModifications + 1,
      total_time_ms: totalTime,
      query_time_ms: queryTime,
      events_in_aggregate: aggregates[0].total_events
    });

    expect(queryTime).toBeLessThan(100);
    expect(aggregates.length).toBe(1);
    // Note: May include additional events from startup delete detection
    expect(aggregates[0].total_events).toBeGreaterThanOrEqual(numModifications + 1);
    expect(aggregates[0].total_creates).toBeGreaterThanOrEqual(1);
    expect(aggregates[0].total_modifies).toBeGreaterThanOrEqual(numModifications);
  });

  test('should handle concurrent file operations efficiently', async () => {
    const daemon = await daemonManager.startDaemon();
    await dbQueries.recreateTriggersForTest();

    const startTime = Date.now();
    const numFiles = 10;

    // Create multiple files concurrently
    const promises = [];
    for (let i = 1; i <= numFiles; i++) {
      promises.push(
        testEnv.createTestFile(`concurrent-${i}.txt`, `Content for file ${i}`)
      );
    }

    await Promise.all(promises);
    await testEnv.wait(2000);

    const queryStart = Date.now();
    const aggregates = await dbQueries.queryAggregatesTable();
    const queryTime = Date.now() - queryStart;

    console.log('=== DEBUG: Concurrent operations ===');
    console.log({
      files_created: numFiles,
      aggregates_found: aggregates.length,
      query_time_ms: queryTime,
      total_time_ms: Date.now() - startTime
    });

    expect(aggregates.length).toBe(numFiles);
    expect(queryTime).toBeLessThan(200);
    
    // Verify each file has at least one aggregate (may include find events)
    aggregates.forEach(agg => {
      expect(agg.total_creates).toBeGreaterThanOrEqual(1);
      expect(agg.total_events).toBeGreaterThanOrEqual(1);
    });
  });
});