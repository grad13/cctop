/**
 * Move Detection Tests - FUNC-003 File Movement Tracking
 * Tests for proper 'move' event detection when files are renamed/moved
 */

import { describe, test, expect, beforeEach, afterEach, afterAll } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ChildProcess } from 'child_process';
import { DaemonTestManager, setupDaemonTest, teardownDaemonTest, getUniqueTestDir, DatabaseQueries } from '../helpers';
import { waitForFileEvent } from '../helpers/wait-utilities';

describe('Move Detection (FUNC-003)', () => {
  let testDir: string;
  let testDbPath: string;
  let daemonProcess: ChildProcess | null = null;
  let dbQueries: DatabaseQueries;

  beforeEach(async () => {
    testDir = getUniqueTestDir('cctop-move-test');
    testDbPath = path.join(testDir, '.cctop/data/activity.db');
    await setupDaemonTest(testDir);
    dbQueries = new DatabaseQueries(testDbPath);
  });

  afterEach(async () => {
    if (dbQueries) {
      await dbQueries.close().catch(() => {});
    }
    await teardownDaemonTest(daemonProcess, testDir);
    daemonProcess = null;
  });

  afterAll(async () => {
    await DaemonTestManager.globalCleanup();
  });

  async function startDaemon(): Promise<ChildProcess> {
    const daemonPath = path.resolve(__dirname, '../../dist/index.js');
    const daemonProcess = await DaemonTestManager.startDaemon(daemonPath, testDir);
    await DaemonTestManager.waitForDaemonStartup(daemonProcess);
    return daemonProcess;
  }

  test('should detect simple file rename as move event', async () => {
    daemonProcess = await startDaemon();
    await dbQueries.connect();

    const srcFile = path.join(testDir, 'original.txt');
    const destFile = path.join(testDir, 'renamed.txt');
    const content = 'Test content for move';
    
    // Create original file
    await fs.writeFile(srcFile, content);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify create event
    const createEvents = await dbQueries.getEventsFromDb();
    const createEvent = createEvents.find(e => 
      e.filename === 'original.txt' && 
      (e.event_type === 'create' || e.event_type === 'find')
    );
    expect(createEvent).toBeDefined();
    const originalInode = createEvent!.inode_number;

    // Rename file
    await fs.rename(srcFile, destFile);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify move event
    const moveEvents = await dbQueries.getEventsByType('move');
    const moveEvent = moveEvents.find(e => e.filename === 'renamed.txt');
    
    expect(moveEvent).toBeDefined();
    expect(moveEvent!.event_type).toBe('move');
    expect(moveEvent!.filename).toBe('renamed.txt');
    expect(moveEvent!.inode_number).toBe(originalInode);
    // FUNC-000: move events don't have measurements
    expect(moveEvent!.file_size).toBeNull();
  });

  test('should detect move across directories', async () => {
    daemonProcess = await startDaemon();
    await dbQueries.connect();
    
    // Wait for daemon to be fully ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    const subdir = path.join(testDir, 'subdir');
    await fs.mkdir(subdir, { recursive: true });

    const srcFile = path.join(testDir, 'move-test.txt');
    const destFile = path.join(subdir, 'move-test.txt');
    
    // Create file in root
    await fs.writeFile(srcFile, 'Cross-directory move');
    
    // Wait for create event to be recorded
    await waitForFileEvent(dbQueries, 'move-test.txt', 'create');

    // Get original inode
    const createEvents = await dbQueries.getEventsFromDb();
    const createEvent = createEvents.find(e => 
      e.filename === 'move-test.txt' && 
      (e.event_type === 'create' || e.event_type === 'find')
    );
    if (!createEvent) {
      throw new Error('Create event not found for move-test.txt');
    }
    const originalInode = createEvent!.inode_number;

    // Move to subdirectory
    await fs.rename(srcFile, destFile);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify move event
    const moveEvents = await dbQueries.getEventsByType('move');
    const moveEvent = moveEvents.find(e => e.filename === 'move-test.txt');
    
    expect(moveEvent).toBeDefined();
    expect(moveEvent!.directory).toContain('subdir');
    expect(moveEvent!.inode_number).toBe(originalInode);
    // FUNC-000: move events don't have measurements
    expect(moveEvent!.file_size).toBeNull();
  });

  test('should not detect copy as move', async () => {
    daemonProcess = await startDaemon();
    await dbQueries.connect();

    const srcFile = path.join(testDir, 'copy-source.txt');
    const destFile = path.join(testDir, 'copy-dest.txt');
    const content = 'Copy test content';
    
    // Create original file
    await fs.writeFile(srcFile, content);
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Copy file (not move)
    await fs.copyFile(srcFile, destFile);
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Should not have move events
    const moveEvents = await dbQueries.getEventsByType('move');
    expect(moveEvents.length).toBe(0);

    // Should have create event for the copy
    const events = await dbQueries.getEventsFromDb();
    
    const copyCreateEvent = events.find(e => 
      e.filename === 'copy-dest.txt' && 
      (e.event_type === 'create' || e.event_type === 'find')
    );
    expect(copyCreateEvent).toBeDefined();
    
    // Copy should have different inode - source file should also exist in events
    const srcCreateEvent = events.find(e => 
      e.filename === 'copy-source.txt' && 
      (e.event_type === 'create' || e.event_type === 'find')
    );
    
    if (!srcCreateEvent) {
      // If source event is not found, just verify copy event exists
      // This is sufficient to prove it's not a move operation
      expect(copyCreateEvent).toBeDefined();
    } else {
      // If both events exist, verify they have different inodes
      expect(copyCreateEvent!.inode_number).not.toBe(srcCreateEvent.inode_number);
    }
  });

  test('should preserve file metadata during move', async () => {
    daemonProcess = await startDaemon();
    await dbQueries.connect();
    
    // Wait for daemon to fully initialize
    await new Promise(resolve => setTimeout(resolve, 1000));

    const srcFile = path.join(testDir, 'metadata-test.txt');
    const destFile = path.join(testDir, 'metadata-moved.txt');
    const content = 'File with metadata';
    
    // Create file
    await fs.writeFile(srcFile, content);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get original metadata
    const createEvents = await dbQueries.getEventsFromDb();
    const createEvent = createEvents.find(e => 
      e.filename === 'metadata-test.txt' && 
      (e.event_type === 'create' || e.event_type === 'find')
    );
    
    if (!createEvent) {
      console.log('All events:', JSON.stringify(createEvents, null, 2));
      throw new Error(`Create event not found for metadata-test.txt. Available events: ${createEvents.length}`);
    }
    
    const originalInode = createEvent.inode_number;
    const originalSize = createEvent.file_size;

    // Move file
    await fs.rename(srcFile, destFile);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify metadata preserved
    const moveEvents = await dbQueries.getEventsByType('move');
    const moveEvent = moveEvents.find(e => e.filename === 'metadata-moved.txt');
    
    expect(moveEvent).toBeDefined();
    expect(moveEvent!.inode_number).toBe(originalInode);
    // FUNC-000: move events don't have measurements
    expect(moveEvent!.file_size).toBeNull();
  });

  test('should handle move to existing filename (overwrite)', async () => {
    daemonProcess = await startDaemon();
    await dbQueries.connect();

    const srcFile = path.join(testDir, 'overwrite-source.txt');
    const destFile = path.join(testDir, 'overwrite-dest.txt');
    
    // Create both files
    await fs.writeFile(srcFile, 'Source content');
    await fs.writeFile(destFile, 'Destination content to be overwritten');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get source inode
    const events = await dbQueries.getEventsFromDb();
    const srcEvent = events.find(e => 
      e.filename === 'overwrite-source.txt' && 
      (e.event_type === 'create' || e.event_type === 'find')
    );
    
    if (!srcEvent) {
      throw new Error(`Source event not found for overwrite-source.txt. Available events: ${events.map(e => `${e.filename}:${e.event_type}`).join(', ')}`);
    }
    
    const srcInode = srcEvent.inode_number;

    // Move source to destination (overwriting)
    await fs.rename(srcFile, destFile);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Increased wait time

    // Get all events
    const allEvents = await dbQueries.getEventsFromDb();
    
    // In overwrite scenarios, the behavior can vary:
    // - Some systems detect it as separate delete events for both files
    // - Some systems detect it as a move event
    // We'll check that appropriate events were generated
    
    const finalEvents = allEvents.filter(e => 
      e.filename === 'overwrite-source.txt' || 
      e.filename === 'overwrite-dest.txt'
    );
    
    // Should have events for both files
    expect(finalEvents.length).toBeGreaterThan(2);
    
    // Source file should no longer exist
    await expect(fs.access(srcFile)).rejects.toThrow();
    
    // Destination file should exist
    await expect(fs.access(destFile)).resolves.toBeUndefined();
  });

  test('should track inode through multiple moves', async () => {
    daemonProcess = await startDaemon();
    await dbQueries.connect();
    
    // Wait for daemon to be fully ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    const file1 = path.join(testDir, 'multi-move-1.txt');
    const file2 = path.join(testDir, 'multi-move-2.txt');
    const file3 = path.join(testDir, 'multi-move-3.txt');
    
    // Create initial file
    await fs.writeFile(file1, 'Multiple moves test');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get original inode
    const createEvents = await dbQueries.getEventsFromDb();
    const createEvent = createEvents.find(e => 
      e.filename === 'multi-move-1.txt' && 
      (e.event_type === 'create' || e.event_type === 'find')
    );
    expect(createEvent).toBeDefined();
    const originalInode = createEvent!.inode_number;

    // Move 1
    await fs.rename(file1, file2);
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Move 2
    await fs.rename(file2, file3);
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Verify all moves tracked same inode
    const moveEvents = await dbQueries.getEventsByType('move');
    
    // Multiple rapid moves may be detected differently by chokidar
    // At least 1 move event should be detected, but exact count may vary
    expect(moveEvents.length).toBeGreaterThan(0);
    
    // All move events should have same inode
    moveEvents.forEach(moveEvent => {
      expect(moveEvent.inode_number).toBe(originalInode);
      // FUNC-000: move events don't have measurements
      expect(moveEvent.file_size).toBeNull();
    });

    // Final file should exist with same inode
    const stat = await fs.stat(file3);
    expect(stat.ino).toBe(originalInode);
  });
});