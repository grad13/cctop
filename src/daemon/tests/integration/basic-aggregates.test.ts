/**
 * Basic Aggregates Functionality Tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { TestEnvironment, TestFileOperations, DatabaseQueries, TestDaemonManager } from '../helpers';

describe('Basic Aggregates Functionality', () => {
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

  test('should create aggregates records automatically via triggers', async () => {
    const daemon = await daemonManager.startDaemon();
    
    // Wait for daemon to initialize database
    await testEnv.wait(2000);
    
    // Initialize DatabaseQueries after daemon has created the database
    dbQueries = new DatabaseQueries(testEnv.testDbPath);
    await dbQueries.connect();

    const testFiles = [
      { name: 'test1.txt', content: 'Small file content' },
      { name: 'test2.js', content: 'console.log("Medium file content with more text");' },
      { name: 'test3.md', content: 'Large file content with even more text and multiple lines\nLine 2\nLine 3\nLine 4' }
    ];

    await TestFileOperations.createFiles(testFiles, testEnv.testDir);
    await testEnv.wait(1000);

    const aggregates = await dbQueries.queryAggregatesTable();
    expect(aggregates.length).toBe(testFiles.length);

    for (let i = 0; i < testFiles.length; i++) {
      const aggregate = aggregates[i];
      expect(aggregate.total_events).toBeGreaterThan(0);
      expect(aggregate.total_creates).toBe(1);
      expect(aggregate.file_path).toContain(testFiles[i].name);
    }
  });

  test('should track event counts correctly', async () => {
    const daemon = await daemonManager.startDaemon();
    
    // Wait for daemon to initialize database
    await testEnv.wait(2000);
    
    // Initialize DatabaseQueries after daemon has created the database
    dbQueries = new DatabaseQueries(testEnv.testDbPath);
    await dbQueries.connect();

    const testFile = 'event-count-test.txt';
    await testEnv.createTestFile(testFile, 'Initial content');
    await testEnv.wait(500);

    // Perform modifications
    for (let i = 1; i <= 3; i++) {
      await testEnv.modifyTestFile(testFile, `Modified content ${i}`);
      await testEnv.wait(300);
    }

    await testEnv.wait(1000);

    // Debug: Check actual events
    const events = await dbQueries.queryEvents(`
      SELECT e.*, et.code as event_code 
      FROM events e 
      JOIN event_types et ON e.event_type_id = et.id 
      WHERE e.file_path LIKE ?
      ORDER BY e.timestamp
    `, `%${testFile}%`);
    
    console.log('=== DEBUG: Events recorded ===');
    events.forEach((event: any, index: number) => {
      console.log(`Event ${index + 1}:`, {
        event_code: event.event_code,
        file_path: event.file_path.split('/').pop(),
        timestamp: event.timestamp
      });
    });

    const aggregates = await dbQueries.queryAggregatesTable();
    expect(aggregates.length).toBe(1);

    const aggregate = aggregates[0];
    console.log('=== DEBUG: Aggregate data ===');
    console.log({
      total_events: aggregate.total_events,
      total_creates: aggregate.total_creates,
      total_modifies: aggregate.total_modifies,
      total_restores: aggregate.total_restores
    });
    
    expect(aggregate.total_events).toBe(4); // 1 create + 3 modify
    expect(aggregate.total_creates).toBe(1);
    expect(aggregate.total_modifies).toBe(3);
    expect(aggregate.total_deletes).toBe(0);
  });

  test('should handle multiple files with complex lifecycles', async () => {
    const daemon = await daemonManager.startDaemon();
    
    // Wait for daemon to initialize database
    await testEnv.wait(2000);
    
    // Initialize DatabaseQueries after daemon has created the database
    dbQueries = new DatabaseQueries(testEnv.testDbPath);
    await dbQueries.connect();

    const files = [
      { file: 'file1.txt', operations: ['create', 'modify'] },
      { file: 'file2.js', operations: ['create', 'modify', 'modify'] },
      { file: 'file3.md', operations: ['create'] }
    ];

    await TestFileOperations.performFileOperations(files, testEnv.testDir);
    await testEnv.wait(1000);

    const aggregates = await dbQueries.queryAggregatesTable();
    expect(aggregates.length).toBe(files.length);

    files.forEach((file, index) => {
      const aggregate = aggregates.find(a => a.file_path.includes(file.file.split('.')[0]));
      expect(aggregate).toBeDefined();
      expect(aggregate!.total_events).toBe(file.operations.length);
    });
  });
});