/**
 * Statistics and Size Tracking Tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { TestEnvironment, TestFileOperations, DatabaseQueries, TestDaemonManager } from '../helpers';
import * as path from 'path';

describe('Statistics and Size Tracking', () => {
  let testEnv: TestEnvironment;
  let dbQueries: DatabaseQueries;
  let daemonManager: TestDaemonManager;

  beforeEach(async () => {
    testEnv = new TestEnvironment();
    await testEnv.setup();
    daemonManager = new TestDaemonManager(testEnv.testDir);
  });

  afterEach(async () => {
    if (dbQueries) {
      await dbQueries.close();
    }
    await daemonManager.stopDaemon();
    await testEnv.cleanup();
  });

  test('should track file size statistics correctly', async () => {
    const daemon = await daemonManager.startDaemon();
    
    // Log daemon output for debugging
    daemon.stdout?.on('data', (data) => {
      console.log('Daemon stdout:', data.toString());
    });
    daemon.stderr?.on('data', (data) => {
      console.error('Daemon stderr:', data.toString());
    });
    
    // Wait for daemon to initialize database
    await testEnv.wait(3000);
    
    // Check if database file exists
    const fs = require('fs');
    console.log('Checking for database at:', testEnv.testDbPath);
    console.log('Test directory contents:', fs.readdirSync(testEnv.testDir));
    if (fs.existsSync(path.join(testEnv.testDir, '.cctop'))) {
      console.log('.cctop contents:', fs.readdirSync(path.join(testEnv.testDir, '.cctop')));
      if (fs.existsSync(path.join(testEnv.testDir, '.cctop/data'))) {
        console.log('.cctop/data contents:', fs.readdirSync(path.join(testEnv.testDir, '.cctop/data')));
      }
    }
    
    if (!fs.existsSync(testEnv.testDbPath)) {
      console.error(`Database file does not exist at: ${testEnv.testDbPath}`);
      throw new Error('Database file not found');
    }
    
    // Initialize DatabaseQueries after daemon has created the database
    dbQueries = new DatabaseQueries(testEnv.testDbPath);
    await dbQueries.connect();
    
    // Skip recreateTriggersForTest as it seems to be causing issues
    // The daemon should have already created the necessary triggers
    // dbQueries.recreateTriggersForTest();

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

    // Debug: Check all tables
    const events = await dbQueries.getEventsFromDb();
    console.log('=== DEBUG: Events ===');
    console.log(events);
    
    const aggregates = await dbQueries.queryAggregatesTable();
    console.log('=== DEBUG: Aggregates ===');
    console.log(aggregates);
    expect(aggregates.length).toBe(1);

    const aggregate = aggregates[0];
    const expectedFirstSize = sizes[0].size;
    const expectedLastSize = sizes[sizes.length - 1].size;
    const expectedMaxSize = Math.max(...sizes.map(s => s.size));

    // Debug: Check all measurements
    const allMeasurements = await dbQueries.queryEvents(`
      SELECT m.*, e.timestamp 
      FROM measurements m 
      JOIN events e ON m.event_id = e.id 
      WHERE e.file_path = ? 
      ORDER BY e.timestamp ASC
    `, 'size-test.txt');
    
    console.log('=== DEBUG: All measurements ===');
    console.log(allMeasurements);
    
    // Debug: Check raw aggregates
    const rawAggregate = await dbQueries.queryEvent('SELECT * FROM aggregates WHERE file_id = ?', aggregate.file_id);
    console.log('=== DEBUG: Raw aggregate ===');
    console.log(rawAggregate);
    
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

  test('should provide accurate global statistics from aggregates', async () => {
    const daemon = await daemonManager.startDaemon();
    
    // Wait for daemon to initialize database
    await testEnv.wait(2000);
    
    // Initialize DatabaseQueries after daemon has created the database
    dbQueries = new DatabaseQueries(testEnv.testDbPath);
    await dbQueries.connect();

    const operations = [
      { file: 'global1.txt', operations: ['create', 'modify'] },
      { file: 'global2.js', operations: ['create'] },
      { file: 'global3.md', operations: ['create', 'modify'] }
    ];

    await TestFileOperations.performFileOperations(operations, testEnv.testDir);
    await testEnv.wait(1000);

    const aggregates = await dbQueries.queryAggregatesTable();

    // Calculate global statistics from aggregates
    const globalStats = {
      total_files: aggregates.length,
      total_creates: aggregates.reduce((sum, a) => sum + a.total_creates, 0),
      total_modifies: aggregates.reduce((sum, a) => sum + a.total_modifies, 0),
      total_moves: aggregates.reduce((sum, a) => sum + a.total_moves, 0),
      total_deletes: aggregates.reduce((sum, a) => sum + a.total_deletes, 0),
      total_restores: aggregates.reduce((sum, a) => sum + a.total_restores, 0),
      total_events: aggregates.reduce((sum, a) => sum + a.total_events, 0)
    };

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
    
    // Wait for daemon to initialize database
    await testEnv.wait(2000);
    
    // Initialize DatabaseQueries after daemon has created the database
    dbQueries = new DatabaseQueries(testEnv.testDbPath);
    await dbQueries.connect();

    const testFile = 'timestamp-test.txt';
    const startTime = Date.now();

    await testEnv.createTestFile(testFile, 'Initial content');
    await testEnv.wait(500);

    let aggregates = await dbQueries.queryAggregatesTable();
    expect(aggregates.length).toBeGreaterThanOrEqual(1);
    const timestampAggregate = aggregates.find(a => a.file_path.includes('timestamp-test.txt'));
    expect(timestampAggregate).toBeDefined();
    const firstTimestamp = timestampAggregate!.first_event_timestamp;

    await testEnv.wait(1000);
    await testEnv.createTestFile(testFile, 'Modified content');
    await testEnv.wait(500);

    aggregates = await dbQueries.queryAggregatesTable();
    const updatedAggregate = aggregates.find(a => a.file_path.includes('timestamp-test.txt'));
    expect(updatedAggregate).toBeDefined();
    const lastTimestamp = updatedAggregate!.last_event_timestamp;

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