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
      'SELECT inode_number FROM events WHERE filename = ? AND event_type = ?',
      originalFile, 'create'
    );
    const originalInode = createEvent.inode_number;
    
    // Step 2: Move file and wait for event
    await moveFileAndWaitForEvent(testDir, dbQueries, originalFile, movedFile);
    
    // Step 3: Verify events
    const events = await dbQueries.queryEvents('SELECT * FROM events ORDER BY id ASC');
    
    // Should have: create + move (NOT create + delete + create)
    const createEvents = events.filter(e => e.event_type === 'create');
    const moveEvents = events.filter(e => e.event_type === 'move');
    const deleteEvents = events.filter(e => e.event_type === 'delete');
    
    expect(createEvents).toHaveLength(1);
    expect(moveEvents).toHaveLength(1);
    expect(deleteEvents).toHaveLength(0);
    
    // Verify move event has correct details
    const moveEvent = moveEvents[0];
    expect(moveEvent.filename).toBe(movedFile);
    expect(moveEvent.inode_number).toBe(originalInode); // Same inode as original
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
    const events = await dbQueries.queryEvents('SELECT * FROM events WHERE filename = ?', filename);
    
    expect(events).toHaveLength(2);
    expect(events[0].event_type).toBe('create');
    expect(events[1].event_type).toBe('delete');
    expect(events[1].inode_number).toBe(events[0].inode_number); // Preserve inode on delete
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
    const moveEvents = await dbQueries.queryEvents('SELECT * FROM events WHERE event_type = ?', 'move');
    const deleteEvents = await dbQueries.queryEvents('SELECT * FROM events WHERE event_type = ?', 'delete');
    
    expect(moveEvents).toHaveLength(1);
    expect(moveEvents[0].filename).toBe('file1-moved.txt');
    
    expect(deleteEvents).toHaveLength(1);
    expect(deleteEvents[0].filename).toBe('file2.txt');
  });
});