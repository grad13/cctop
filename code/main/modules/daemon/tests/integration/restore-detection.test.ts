/**
 * Restore Detection Tests - FUNC-001 File Restoration Implementation
 * Tests for proper 'restore' event detection when deleted files reappear
 */

import { describe, test, expect, beforeEach, afterEach, afterAll } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ChildProcess } from 'child_process';
import { DaemonTestManager, setupDaemonTest, teardownDaemonTest, getUniqueTestDir, DatabaseQueries } from '../helpers';

describe('Restore Detection (FUNC-001)', () => {
  let testDir: string;
  let testDbPath: string;
  let daemonProcess: ChildProcess | null = null;
  let dbQueries: DatabaseQueries;

  beforeEach(async () => {
    testDir = getUniqueTestDir('cctop-restore-test');
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

  test('should detect restore event when deleted file reappears', async () => {
    daemonProcess = await startDaemon();
    await dbQueries.connect();
    
    // Wait for daemon to fully initialize
    await new Promise(resolve => setTimeout(resolve, 1000));

    const testFile = path.join(testDir, 'restore-test.txt');
    
    // Create file
    await fs.writeFile(testFile, 'Original content');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify create event
    let events = await dbQueries.getEventsFromDb();
    const createEvents = events.filter(e => 
      e.filename === 'restore-test.txt' && 
      (e.event_type === 'create' || e.event_type === 'find')
    );
    expect(createEvents.length).toBeGreaterThan(0);

    // Delete file
    await fs.unlink(testFile);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify delete event
    events = await dbQueries.getEventsFromDb();
    const deleteEvents = await dbQueries.getEventsByType('delete');
    const fileDeleteEvents = deleteEvents.filter(e => e.filename === 'restore-test.txt');
    expect(fileDeleteEvents.length).toBe(1);

    // Restore file (recreate it)
    await fs.writeFile(testFile, 'Restored content');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify restore event
    events = await dbQueries.getEventsFromDb();
    const restoreEvents = await dbQueries.getEventsByType('restore');
    const fileRestoreEvents = restoreEvents.filter(e => e.filename === 'restore-test.txt');
    
    expect(fileRestoreEvents.length).toBe(1);
    expect(fileRestoreEvents[0].event_type).toBe('restore');
    expect(fileRestoreEvents[0].filename).toBe('restore-test.txt');
  });

  test('should not create restore event for new files', async () => {
    daemonProcess = await startDaemon();
    await dbQueries.connect();
    
    // Wait for daemon to fully initialize
    await new Promise(resolve => setTimeout(resolve, 2000));

    const testFile = path.join(testDir, 'new-file.txt');
    
    // Create new file (no previous delete)
    await fs.writeFile(testFile, 'New file content');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Should only have create/find event, no restore
    const events = await dbQueries.getEventsFromDb();
    const restoreEvents = await dbQueries.getEventsByType('restore');
    const fileRestoreEvents = restoreEvents.filter(e => e.filename === 'new-file.txt');
    
    expect(fileRestoreEvents.length).toBe(0);
    
    // Should have create/find event instead
    const createEvents = events.filter(e => 
      e.filename === 'new-file.txt' && 
      (e.event_type === 'create' || e.event_type === 'find')
    );
    
    // Debug output
    if (createEvents.length === 0) {
      console.log('All events:', JSON.stringify(events, null, 2));
      console.log('Events for new-file.txt:', events.filter(e => e.filename === 'new-file.txt'));
    }
    
    expect(createEvents.length).toBeGreaterThan(0);
  });

  test('should handle multiple restore cycles', async () => {
    daemonProcess = await startDaemon();
    await dbQueries.connect();

    const testFile = path.join(testDir, 'cycle-test.txt');
    
    // First cycle: create -> delete -> restore
    await fs.writeFile(testFile, 'Cycle 1');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await fs.unlink(testFile);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await fs.writeFile(testFile, 'Cycle 1 restored');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify first restore
    let restoreEvents = await dbQueries.getEventsByType('restore');
    expect(restoreEvents.length).toBe(1);

    // Second cycle: delete -> restore again
    await fs.unlink(testFile);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await fs.writeFile(testFile, 'Cycle 2 restored');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify second restore
    restoreEvents = await dbQueries.getEventsByType('restore');
    const fileRestoreEvents = restoreEvents.filter(e => e.filename === 'cycle-test.txt');
    expect(fileRestoreEvents.length).toBe(2);
  });

  test('should restore with different content and size', async () => {
    daemonProcess = await startDaemon();
    await dbQueries.connect();
    
    // Wait for daemon to fully initialize
    await new Promise(resolve => setTimeout(resolve, 1000));

    const testFile = path.join(testDir, 'size-test.txt');
    const originalContent = 'Short';
    const restoredContent = 'This is much longer content than the original';
    
    // Create with original content
    await fs.writeFile(testFile, originalContent);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get original file info
    const originalEvents = await dbQueries.getEventsFromDb();
    const createEvent = originalEvents.find(e => 
      e.filename === 'size-test.txt' && 
      (e.event_type === 'create' || e.event_type === 'find')
    );
    expect(createEvent).toBeDefined();
    const originalSize = createEvent!.file_size;

    // Delete
    await fs.unlink(testFile);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Restore with different content
    await fs.writeFile(testFile, restoredContent);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify restore event has new size
    const restoreEvents = await dbQueries.getEventsByType('restore');
    const restoreEvent = restoreEvents.find(e => e.filename === 'size-test.txt');
    
    expect(restoreEvent).toBeDefined();
    expect(restoreEvent!.file_size).toBe(Buffer.byteLength(restoredContent));
    expect(restoreEvent!.file_size).not.toBe(originalSize);
  });

  test('should handle restore in subdirectories', async () => {
    daemonProcess = await startDaemon();
    await dbQueries.connect();
    
    // Wait for daemon to fully initialize
    await new Promise(resolve => setTimeout(resolve, 1000));

    const subdir = path.join(testDir, 'subdir');
    await fs.mkdir(subdir, { recursive: true });
    
    const testFile = path.join(subdir, 'nested-restore.txt');
    
    // Create, delete, restore in subdirectory
    await fs.writeFile(testFile, 'Nested content');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await fs.unlink(testFile);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await fs.writeFile(testFile, 'Restored nested content');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify restore event
    const restoreEvents = await dbQueries.getEventsByType('restore');
    const restoreEvent = restoreEvents.find(e => e.filename === 'nested-restore.txt');
    
    expect(restoreEvent).toBeDefined();
    expect(restoreEvent!.file_path).toContain('subdir');
    expect(restoreEvent!.directory).toContain('subdir');
  });

  test('should restore with new inode number', async () => {
    daemonProcess = await startDaemon();
    await dbQueries.connect();
    
    // Wait for daemon to fully initialize
    await new Promise(resolve => setTimeout(resolve, 1000));

    const testFile = path.join(testDir, 'inode-test.txt');
    
    // Create and get original inode
    await fs.writeFile(testFile, 'Original');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const originalEvents = await dbQueries.getEventsFromDb();
    const createEvent = originalEvents.find(e => 
      e.filename === 'inode-test.txt' && 
      (e.event_type === 'create' || e.event_type === 'find')
    );
    
    if (!createEvent) {
      throw new Error(`Create event not found for inode-test.txt. Available events: ${originalEvents.map(e => `${e.filename}:${e.event_type}`).join(', ')}`);
    }
    
    const originalInode = createEvent.inode_number;

    // Delete and restore
    await fs.unlink(testFile);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await fs.writeFile(testFile, 'Restored');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify restore has different inode
    const restoreEvents = await dbQueries.getEventsByType('restore');
    const restoreEvent = restoreEvents.find(e => e.filename === 'inode-test.txt');
    
    expect(restoreEvent).toBeDefined();
    // New file should have different inode
    expect(restoreEvent!.inode_number).not.toBe(originalInode);
    expect(restoreEvent!.inode_number).toBeGreaterThan(0);
  });

  test('should not create restore for files deleted before daemon started', async () => {
    // Create and delete file before daemon starts
    const testFile = path.join(testDir, 'pre-daemon-delete.txt');
    await fs.writeFile(testFile, 'Content');
    await fs.unlink(testFile);

    // Start daemon
    daemonProcess = await startDaemon();
    await dbQueries.connect();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create file (should be regular create, not restore)
    await fs.writeFile(testFile, 'New content');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Should not have restore event
    const restoreEvents = await dbQueries.getEventsByType('restore');
    const fileRestoreEvents = restoreEvents.filter(e => e.filename === 'pre-daemon-delete.txt');
    expect(fileRestoreEvents.length).toBe(0);

    // Should have create event
    const events = await dbQueries.getEventsFromDb();
    const createEvents = events.filter(e => 
      e.filename === 'pre-daemon-delete.txt' && 
      (e.event_type === 'create' || e.event_type === 'find')
    );
    expect(createEvents.length).toBeGreaterThan(0);
  });
});