/**
 * HO-20250627-003: Aggregates Triggers Integration Test
 * Test automatic aggregates updates on events/measurements INSERT
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import DatabaseManager from '../../src/database/database-manager.js';
import fs from 'fs';

describe('HO-003: Aggregates Triggers', () => {
  let db;
  let testDbPath;

  beforeEach(async () => {
    // Create test database
    testDbPath = `/tmp/cctop-aggregates-test-${Date.now()}.db`;
    db = new DatabaseManager(testDbPath);
    await db.initialize();
  });

  afterEach(async () => {
    // Clean up
    if (db) {
      await db.close();
    }
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  test('should automatically create aggregates record on first event', async () => {
    // Insert a file record
    const fileResult = await db.run('INSERT INTO files (inode, is_active) VALUES (?, ?)', [12345, 1]);
    const fileId = fileResult.lastID;

    // Insert an event
    await db.run(`
      INSERT INTO events (timestamp, event_type_id, file_id, file_path, file_name, directory)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [Date.now(), 1, fileId, '/test/file.txt', 'file.txt', '/test']);

    // Check aggregates was automatically created
    const aggregate = await db.get('SELECT * FROM aggregates WHERE file_id = ?', [fileId]);
    expect(aggregate).toBeTruthy();
    expect(aggregate.total_events).toBe(1);
    expect(aggregate.first_event_timestamp).toBeTruthy();
    expect(aggregate.last_event_timestamp).toBeTruthy();
  });

  test('should update event counts by type', async () => {
    // Insert a file record
    const fileResult = await db.run('INSERT INTO files (inode, is_active) VALUES (?, ?)', [12346, 1]);
    const fileId = fileResult.lastID;

    const now = Date.now();

    // Insert different event types
    await db.run(`INSERT INTO events (timestamp, event_type_id, file_id, file_path, file_name, directory)
                  VALUES (?, ?, ?, ?, ?, ?)`, [now + 1, 2, fileId, '/test/file.txt', 'file.txt', '/test']); // create
    await db.run(`INSERT INTO events (timestamp, event_type_id, file_id, file_path, file_name, directory)
                  VALUES (?, ?, ?, ?, ?, ?)`, [now + 2, 3, fileId, '/test/file.txt', 'file.txt', '/test']); // modify
    await db.run(`INSERT INTO events (timestamp, event_type_id, file_id, file_path, file_name, directory)
                  VALUES (?, ?, ?, ?, ?, ?)`, [now + 3, 3, fileId, '/test/file.txt', 'file.txt', '/test']); // modify

    // Check aggregates counts
    const aggregate = await db.get('SELECT * FROM aggregates WHERE file_id = ?', [fileId]);
    expect(aggregate.total_events).toBe(3);
    expect(aggregate.total_creates).toBe(1);
    expect(aggregate.total_modifies).toBe(2);
    expect(aggregate.total_deletes).toBe(0);
    expect(aggregate.first_event_timestamp).toBe(now + 1);
    expect(aggregate.last_event_timestamp).toBe(now + 3);
  });

  test('should update metrics on measurements INSERT', async () => {
    // Insert a file record
    const fileResult = await db.run('INSERT INTO files (inode, is_active) VALUES (?, ?)', [12347, 1]);
    const fileId = fileResult.lastID;

    // Insert an event
    const eventResult = await db.run(`
      INSERT INTO events (timestamp, event_type_id, file_id, file_path, file_name, directory)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [Date.now(), 2, fileId, '/test/file.txt', 'file.txt', '/test']);
    const eventId = eventResult.lastID;

    // Insert measurements
    await db.run(`
      INSERT INTO measurements (event_id, file_size, line_count, block_count, inode)
      VALUES (?, ?, ?, ?, ?)
    `, [eventId, 1024, 50, 8, 12347]);

    // Check aggregates metrics
    const aggregate = await db.get('SELECT * FROM aggregates WHERE file_id = ?', [fileId]);
    expect(aggregate.total_size).toBe(1024);
    expect(aggregate.total_lines).toBe(50);
    expect(aggregate.total_blocks).toBe(8);
    expect(aggregate.first_size).toBe(1024);
    expect(aggregate.max_size).toBe(1024);
    expect(aggregate.last_size).toBe(1024);
    expect(aggregate.first_lines).toBe(50);
    expect(aggregate.max_lines).toBe(50);
    expect(aggregate.last_lines).toBe(50);
  });

  test('should calculate first/max/last values correctly', async () => {
    // Insert a file record
    const fileResult = await db.run('INSERT INTO files (inode, is_active) VALUES (?, ?)', [12348, 1]);
    const fileId = fileResult.lastID;

    // Insert events and measurements with different values
    const events = [
      { size: 500, lines: 20, blocks: 4 },  // first
      { size: 2000, lines: 100, blocks: 16 }, // max  
      { size: 800, lines: 40, blocks: 8 }   // last
    ];

    for (let i = 0; i < events.length; i++) {
      const eventResult = await db.run(`
        INSERT INTO events (timestamp, event_type_id, file_id, file_path, file_name, directory)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [Date.now() + i, 3, fileId, '/test/file.txt', 'file.txt', '/test']);

      await db.run(`
        INSERT INTO measurements (event_id, file_size, line_count, block_count, inode)
        VALUES (?, ?, ?, ?, ?)
      `, [eventResult.lastID, events[i].size, events[i].lines, events[i].blocks, 12348]);
    }

    // Check first/max/last calculations
    const aggregate = await db.get('SELECT * FROM aggregates WHERE file_id = ?', [fileId]);
    
    // First values
    expect(aggregate.first_size).toBe(500);
    expect(aggregate.first_lines).toBe(20);
    expect(aggregate.first_blocks).toBe(4);
    
    // Max values
    expect(aggregate.max_size).toBe(2000);
    expect(aggregate.max_lines).toBe(100);
    expect(aggregate.max_blocks).toBe(16);
    
    // Last values
    expect(aggregate.last_size).toBe(800);
    expect(aggregate.last_lines).toBe(40);
    expect(aggregate.last_blocks).toBe(8);
    
    // Cumulative totals
    expect(aggregate.total_size).toBe(3300); // 500 + 2000 + 800
    expect(aggregate.total_lines).toBe(160); // 20 + 100 + 40
    expect(aggregate.total_blocks).toBe(28); // 4 + 16 + 8
  });

  test('should handle NULL measurements gracefully', async () => {
    // Insert a file record
    const fileResult = await db.run('INSERT INTO files (inode, is_active) VALUES (?, ?)', [12349, 1]);
    const fileId = fileResult.lastID;

    // Insert an event
    const eventResult = await db.run(`
      INSERT INTO events (timestamp, event_type_id, file_id, file_path, file_name, directory)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [Date.now(), 1, fileId, '/test/file.txt', 'file.txt', '/test']);

    // Insert measurements with NULL values
    await db.run(`
      INSERT INTO measurements (event_id, file_size, line_count, block_count, inode)
      VALUES (?, ?, ?, ?, ?)
    `, [eventResult.lastID, null, null, null, 12349]);

    // Check aggregates handles NULLs
    const aggregate = await db.get('SELECT * FROM aggregates WHERE file_id = ?', [fileId]);
    expect(aggregate.total_size).toBe(0);
    expect(aggregate.total_lines).toBe(0);
    expect(aggregate.total_blocks).toBe(0);
    expect(aggregate.first_size).toBeNull();
    expect(aggregate.max_size).toBe(0);
    expect(aggregate.last_size).toBeNull();
  });
});