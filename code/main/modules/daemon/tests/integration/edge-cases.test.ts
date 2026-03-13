/**
 * Edge Cases and Error Handling Tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { TestEnvironment, DatabaseQueries, TestDaemonManager } from '../helpers';

describe('Edge Cases and Error Handling', () => {
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

  test('should handle edge cases and NULL values gracefully', async () => {
    const daemon = await daemonManager.startDaemon();
    
    // Wait for daemon to initialize database
    await testEnv.wait(2000);
    
    // Initialize DatabaseQueries after daemon has created the database
    dbQueries = new DatabaseQueries(testEnv.testDbPath);
    await dbQueries.connect();

    // Create file with zero size
    const emptyFile = 'empty-test.txt';
    await testEnv.createTestFile(emptyFile, '');
    await testEnv.wait(300);

    // Create file then immediately delete
    const deleteFile = 'immediate-delete.txt';
    await testEnv.createTestFile(deleteFile, 'Will be deleted');
    await testEnv.wait(200);
    await fs.unlink(path.join(testEnv.testDir, deleteFile));
    await testEnv.wait(600);

    const aggregates = await dbQueries.queryAggregatesTable();
    
    // Check if aggregates table is empty
    const allAggregates = await dbQueries.queryEvents('SELECT COUNT(*) as count FROM aggregates');
    console.log('Total aggregates count:', allAggregates[0].count);
    
    // Get raw aggregates data
    const rawAggregates = await dbQueries.queryEvents('SELECT * FROM aggregates');
    console.log('Raw aggregates:', rawAggregates.map(a => ({
      id: a.id,
      file_id: a.file_id,
      first_size: a.first_size,
      max_size: a.max_size,
      last_size: a.last_size
    })));
    
    console.log('=== DEBUG: Edge cases ===');
    
    // Also check measurements directly
    const measurements = await dbQueries.queryEvents(`
      SELECT e.*, m.*, et.code as event_code
      FROM events e
      LEFT JOIN measurements m ON e.id = m.event_id
      JOIN event_types et ON e.event_type_id = et.id
      WHERE e.file_path LIKE '%empty-test.txt%' OR e.file_path LIKE '%immediate-delete.txt%'
      ORDER BY e.timestamp
    `);
    
    console.log('=== Measurements ===');
    measurements.forEach((m: any) => {
      console.log(`${m.file_path.split('/').pop()} - ${m.event_code}:`, {
        event_id: m.id,
        file_size: m.file_size,
        line_count: m.line_count,
        inode: m.inode
      });
    });
    
    aggregates.forEach((agg, index) => {
      console.log(`Aggregate ${index + 1}:`, {
        file_path: agg.file_path.split('/').pop(),
        first_size: agg.first_size,
        last_size: agg.last_size,
        max_size: agg.max_size,
        total_events: agg.total_events
      });
    });

    // Should handle zero-size files
    const emptyAggregate = aggregates.find(a => a.file_path.includes('empty-test'));
    expect(emptyAggregate).toBeDefined();
    expect(emptyAggregate!.first_size).toBe(0);
    expect(emptyAggregate!.last_size).toBe(0);

    // Should handle deleted files
    const deletedAggregate = aggregates.find(a => a.file_path.includes('immediate-delete'));
    expect(deletedAggregate).toBeDefined();
    expect(deletedAggregate!.total_deletes).toBe(1);
  });

  test('should handle file with special characters in path', async () => {
    const daemon = await daemonManager.startDaemon();
    
    // Wait for daemon to initialize database
    await testEnv.wait(2000);
    
    // Initialize DatabaseQueries after daemon has created the database
    dbQueries = new DatabaseQueries(testEnv.testDbPath);
    await dbQueries.connect();

    const specialFiles = [
      'file with spaces.txt',
      'file-with-hyphens.txt',
      'file_with_underscores.txt'
    ];

    for (const fileName of specialFiles) {
      await testEnv.createTestFile(fileName, `Content of ${fileName}`);
      await testEnv.wait(200);
    }

    await testEnv.wait(1000);

    const aggregates = await dbQueries.queryAggregatesTable();
    expect(aggregates.length).toBe(specialFiles.length);

    specialFiles.forEach(fileName => {
      const aggregate = aggregates.find(a => a.file_path.includes(fileName));
      expect(aggregate).toBeDefined();
      expect(aggregate!.total_creates).toBe(1);
    });
  });

  test('should handle rapid file creation and deletion', async () => {
    const daemon = await daemonManager.startDaemon();
    
    // Wait for daemon to initialize database
    await testEnv.wait(2000);
    
    // Initialize DatabaseQueries after daemon has created the database
    dbQueries = new DatabaseQueries(testEnv.testDbPath);
    await dbQueries.connect();

    const testFile = 'rapid-ops.txt';

    // Rapid create-delete cycle
    for (let i = 0; i < 3; i++) {
      await testEnv.createTestFile(testFile, `Content ${i}`);
      await testEnv.wait(100);
      try {
        await fs.unlink(testFile);
      } catch (error) {
        // File might not exist, continue
      }
      await testEnv.wait(100);
    }

    await testEnv.wait(1000);

    const aggregates = await dbQueries.queryAggregatesTable();
    
    console.log('=== DEBUG: Rapid operations ===');
    aggregates.forEach((agg, index) => {
      console.log(`Aggregate ${index + 1}:`, {
        file_path: agg.file_path.split('/').pop(),
        total_creates: agg.total_creates,
        total_deletes: agg.total_deletes,
        total_events: agg.total_events
      });
    });

    // Should handle rapid operations without errors
    expect(aggregates.length).toBeGreaterThan(0);
    
    const rapidAggregate = aggregates.find(a => a.file_path.includes('rapid-ops'));
    if (rapidAggregate) {
      expect(rapidAggregate.total_events).toBeGreaterThan(0);
    }
  });
});