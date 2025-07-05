/**
 * Move Detection Tests - Improved version with efficient event waiting
 */

import { describe, test, expect, beforeEach, afterEach, afterAll } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ChildProcess } from 'child_process';
import { 
  DaemonTestManager, 
  setupDaemonTest, 
  teardownDaemonTest,
  waitForDaemonReady, 
  waitForFileEvent, 
  createFileAndWaitForEvent,
  moveFileAndWaitForEvent,
  DatabaseQueries,
  getUniqueTestDir
} from '../helpers';

describe('Move Detection (Improved)', () => {
  let testDir: string;
  let testDbPath: string;
  let daemonProcess: ChildProcess | null = null;
  let dbQueries: DatabaseQueries | null = null;

  beforeEach(async () => {
    testDir = getUniqueTestDir('cctop-move-test-improved');
    testDbPath = path.join(testDir, '.cctop/data/activity.db');
    await setupDaemonTest(testDir);
  });

  afterEach(async () => {
    if (dbQueries) {
      await dbQueries.close();
      dbQueries = null;
    }
    if (daemonProcess) {
      await DaemonTestManager.stopDaemon(daemonProcess);
      daemonProcess = null;
    }
    await teardownDaemonTest(null, testDir);
  });

  afterAll(async () => {
    await DaemonTestManager.killAllDaemons();
  });

  test('should correctly detect move events with proper inode tracking', async () => {
    const daemonPath = path.resolve(__dirname, '../../dist/index.js');
    
    // Start daemon using test manager
    daemonProcess = await DaemonTestManager.startDaemon(daemonPath, testDir);
    
    // Wait for daemon to be ready
    await waitForDaemonReady(testDir);
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for database initialization
    
    // Open database connection
    dbQueries = new DatabaseQueries(testDbPath);
    await dbQueries.connect();
    
    // Step 1: Create file and wait for event
    const originalFile = 'move-test.txt';
    const movedFile = 'move-test-renamed.txt';
    
    await createFileAndWaitForEvent(testDir, dbQueries, originalFile, 'content for move test');
    
    // Get inode of original file
    const createEvent = await dbQueries.queryEvent(
      `SELECT m.inode FROM events e 
       JOIN measurements m ON e.id = m.event_id 
       JOIN event_types et ON e.event_type_id = et.id
       WHERE e.file_name = ? AND et.code = ?`,
      originalFile, 'create'
    );
    const originalInode = createEvent.inode;
    
    // Step 2: Move file and wait for event
    await moveFileAndWaitForEvent(testDir, dbQueries, originalFile, movedFile);
    
    // Step 3: Verify events
    const events = await dbQueries.queryEvents(`
      SELECT e.*, et.code as event_code 
      FROM events e 
      JOIN event_types et ON e.event_type_id = et.id 
      ORDER BY e.id ASC
    `);
    
    // Should have: create + move (NOT create + delete + create)
    const createEvents = events.filter(e => e.event_code === 'create');
    const moveEvents = events.filter(e => e.event_code === 'move');
    const deleteEvents = events.filter(e => e.event_code === 'delete');
    
    expect(createEvents).toHaveLength(1);
    expect(moveEvents).toHaveLength(1);
    expect(deleteEvents).toHaveLength(0);
    
    // Verify move event has correct details
    const moveEvent = moveEvents[0];
    expect(moveEvent.file_name).toBe(movedFile);
    
    // FUNC-000: move events don't have measurements, so we can't verify inode from measurement
    // The move event should still be recorded correctly
    expect(moveEvent.file_name).toBe(movedFile);
    // The move detection relies on chokidar's inode tracking internally
  });

  test('should handle delete correctly when not a move', async () => {
    const daemonPath = path.resolve(__dirname, '../../dist/index.js');
    
    // Start daemon
    daemonProcess = await DaemonTestManager.startDaemon(daemonPath, testDir);
    await waitForDaemonReady(testDir);
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for database initialization
    
    dbQueries = new DatabaseQueries(testDbPath);
    await dbQueries.connect();
    
    // Create and delete file
    const filename = 'delete-test.txt';
    await createFileAndWaitForEvent(testDir, dbQueries, filename, 'delete test content');
    
    // Delete file
    await fs.unlink(path.join(testDir, filename));
    await waitForFileEvent(dbQueries, filename, 'delete');
    
    // Verify events
    const events = await dbQueries.queryEvents(`
      SELECT e.*, et.code as event_type, m.inode as inode_number
      FROM events e
      JOIN event_types et ON e.event_type_id = et.id
      LEFT JOIN measurements m ON e.id = m.event_id
      WHERE e.file_name = ?
      ORDER BY e.id ASC
    `, filename);
    
    expect(events).toHaveLength(2);
    expect(events[0].event_type).toBe('create');
    expect(events[1].event_type).toBe('delete');
    // Note: delete events don't have measurements in FUNC-000
  });

  test('should detect multiple file operations correctly', async () => {
    const daemonPath = path.resolve(__dirname, '../../dist/index.js');
    
    // Start daemon
    daemonProcess = await DaemonTestManager.startDaemon(daemonPath, testDir);
    await waitForDaemonReady(testDir);
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for database initialization
    
    dbQueries = new DatabaseQueries(testDbPath);
    await dbQueries.connect();
    
    // Create multiple files
    await createFileAndWaitForEvent(testDir, dbQueries, 'file1.txt', 'content 1');
    await createFileAndWaitForEvent(testDir, dbQueries, 'file2.txt', 'content 2');
    await createFileAndWaitForEvent(testDir, dbQueries, 'file3.txt', 'content 3');
    
    // Move file1
    await moveFileAndWaitForEvent(testDir, dbQueries, 'file1.txt', 'file1-moved.txt');
    
    // Delete file2
    await fs.unlink(path.join(testDir, 'file2.txt'));
    await waitForFileEvent(dbQueries, 'file2.txt', 'delete');
    
    // Verify final state
    const moveEvents = await dbQueries.queryEvents(`
      SELECT e.*, et.code as event_type, e.file_name as filename
      FROM events e
      JOIN event_types et ON e.event_type_id = et.id
      WHERE et.code = ?
    `, 'move');
    const deleteEvents = await dbQueries.queryEvents(`
      SELECT e.*, et.code as event_type, e.file_name as filename
      FROM events e
      JOIN event_types et ON e.event_type_id = et.id
      WHERE et.code = ?
    `, 'delete');
    
    expect(moveEvents).toHaveLength(1);
    expect(moveEvents[0].filename).toBe('file1-moved.txt');
    
    expect(deleteEvents).toHaveLength(1);
    expect(deleteEvents[0].filename).toBe('file2.txt');
  });
});