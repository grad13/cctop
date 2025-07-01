/**
 * Startup Delete Detection Tests - FUNC-001 Startup State Synchronization
 * Tests for proper 'delete' event detection when daemon restarts and files are missing
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import sqlite3 from 'sqlite3';

interface DbEvent {
  id: number;
  event_type: string;
  file_path: string;
  directory: string;
  filename: string;
  file_size: number;
  timestamp: string;
  inode_number: number;
}

describe('Startup Delete Detection (FUNC-001)', () => {
  const testDir = '/tmp/cctop-startup-delete-test';
  const testDbPath = path.join(testDir, '.cctop/data/activity.db');
  let daemonProcess: ChildProcess | null = null;

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
    process.chdir(testDir);
  });

  afterEach(async () => {
    if (daemonProcess) {
      daemonProcess.kill('SIGTERM');
      daemonProcess = null;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean test directory:', error);
    }
  });

  async function getEventsFromDb(): Promise<DbEvent[]> {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(testDbPath);
      db.all(
        'SELECT * FROM events ORDER BY id ASC',
        (err, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows as DbEvent[]);
          db.close();
        }
      );
    });
  }

  async function getEventsByType(eventType: string): Promise<DbEvent[]> {
    const events = await getEventsFromDb();
    return events.filter(e => e.event_type === eventType);
  }

  async function startDaemon(): Promise<ChildProcess> {
    const daemonPath = path.resolve(__dirname, '../dist/index.js');
    
    const process = spawn('node', [daemonPath, '--standalone'], {
      stdio: 'pipe',
      cwd: testDir
    });

    // Wait for daemon startup
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return process;
  }

  async function stopDaemon(process: ChildProcess): Promise<void> {
    process.kill('SIGTERM');
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  test('should detect delete events on startup for missing files', async () => {
    // Phase 1: Start daemon and create files
    daemonProcess = await startDaemon();

    const testFiles = [
      'startup-test-1.txt',
      'startup-test-2.js',
      'startup-test-3.md'
    ];

    // Create files while daemon is running
    for (const fileName of testFiles) {
      await fs.writeFile(fileName, `Content of ${fileName}`);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Verify files were recorded as 'find' or 'create' events
    let events = await getEventsFromDb();
    const initialFileEvents = events.filter(e => 
      testFiles.includes(e.filename) && 
      (e.event_type === 'find' || e.event_type === 'create')
    );
    expect(initialFileEvents.length).toBe(testFiles.length);

    console.log('=== DEBUG: Phase 1 - Files created ===');
    events.forEach((event, index) => {
      console.log(`Event ${index + 1}:`, {
        id: event.id,
        type: event.event_type,
        filename: event.filename,
        timestamp: event.timestamp
      });
    });

    // Phase 2: Stop daemon and delete files
    await stopDaemon(daemonProcess);
    daemonProcess = null;

    // Delete some files while daemon is stopped
    const deletedFiles = testFiles.slice(0, 2); // Delete first 2 files
    for (const fileName of deletedFiles) {
      await fs.unlink(fileName);
    }

    // Phase 3: Restart daemon - should detect missing files
    daemonProcess = await startDaemon();

    // Wait for startup scan to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify delete events were created for missing files
    events = await getEventsFromDb();
    const deleteEvents = await getEventsByType('delete');

    console.log('=== DEBUG: Phase 3 - After restart ===');
    events.forEach((event, index) => {
      console.log(`Event ${index + 1}:`, {
        id: event.id,
        type: event.event_type,
        filename: event.filename,
        timestamp: event.timestamp
      });
    });

    // Should have delete events for the files that were removed
    expect(deleteEvents.length).toBe(deletedFiles.length);
    
    deletedFiles.forEach(fileName => {
      const fileDeleteEvents = deleteEvents.filter(e => e.filename === fileName);
      expect(fileDeleteEvents.length).toBe(1);
      
      const deleteEvent = fileDeleteEvents[0];
      expect(deleteEvent.event_type).toBe('delete');
      expect(deleteEvent.filename).toBe(fileName);
    });

    // Remaining file should still exist (no additional delete events)
    const remainingFile = testFiles[2];
    const remainingFileDeleteEvents = deleteEvents.filter(e => e.filename === remainingFile);
    expect(remainingFileDeleteEvents.length).toBe(0);
  });

  test('should not create duplicate delete events for already deleted files', async () => {
    // Phase 1: Create and delete file normally
    daemonProcess = await startDaemon();

    const testFile = 'duplicate-delete-test.txt';
    await fs.writeFile(testFile, 'test content');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Delete file while daemon is running (should create delete event)
    await fs.unlink(testFile);
    await new Promise(resolve => setTimeout(resolve, 800));

    // Verify delete event was created
    let deleteEvents = await getEventsByType('delete');
    expect(deleteEvents.length).toBe(1);
    expect(deleteEvents[0].filename).toBe(testFile);

    console.log('=== DEBUG: Phase 1 - Normal delete ===');
    const events1 = await getEventsFromDb();
    events1.forEach((event, index) => {
      console.log(`Event ${index + 1}:`, {
        id: event.id,
        type: event.event_type,
        filename: event.filename
      });
    });

    // Phase 2: Restart daemon - should NOT create duplicate delete event
    await stopDaemon(daemonProcess);
    daemonProcess = await startDaemon();

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify no duplicate delete events
    deleteEvents = await getEventsByType('delete');
    expect(deleteEvents.length).toBe(1); // Still only one delete event

    console.log('=== DEBUG: Phase 2 - After restart ===');
    const events2 = await getEventsFromDb();
    events2.forEach((event, index) => {
      console.log(`Event ${index + 1}:`, {
        id: event.id,
        type: event.event_type,
        filename: event.filename
      });
    });
  });

  test('should handle mixed scenarios: some files deleted, some remain', async () => {
    // Phase 1: Create multiple files
    daemonProcess = await startDaemon();

    const allFiles = [
      'mixed-test-remain.txt',
      'mixed-test-delete-1.txt', 
      'mixed-test-delete-2.txt',
      'mixed-test-remain-2.txt'
    ];

    for (const fileName of allFiles) {
      await fs.writeFile(fileName, `Content of ${fileName}`);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Phase 2: Stop daemon and delete some files
    await stopDaemon(daemonProcess);
    daemonProcess = null;

    const deletedFiles = ['mixed-test-delete-1.txt', 'mixed-test-delete-2.txt'];
    const remainingFiles = ['mixed-test-remain.txt', 'mixed-test-remain-2.txt'];
    
    for (const fileName of deletedFiles) {
      await fs.unlink(fileName);
    }

    // Phase 3: Restart and verify
    daemonProcess = await startDaemon();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const deleteEvents = await getEventsByType('delete');
    
    // Should have delete events only for deleted files
    expect(deleteEvents.length).toBe(deletedFiles.length);
    
    deletedFiles.forEach(fileName => {
      const fileDeleteEvents = deleteEvents.filter(e => e.filename === fileName);
      expect(fileDeleteEvents.length).toBe(1);
    });

    // Should NOT have delete events for remaining files
    remainingFiles.forEach(fileName => {
      const fileDeleteEvents = deleteEvents.filter(e => e.filename === fileName);
      expect(fileDeleteEvents.length).toBe(0);
    });

    console.log('=== DEBUG: Mixed scenario results ===');
    const allEvents = await getEventsFromDb();
    allEvents.forEach((event, index) => {
      console.log(`Event ${index + 1}:`, {
        id: event.id,
        type: event.event_type,
        filename: event.filename,
        timestamp: event.timestamp
      });
    });
  });

  test('should handle startup with empty database (no previous files)', async () => {
    // Start daemon with no pre-existing database or files
    daemonProcess = await startDaemon();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Should not create any delete events (no previous state to compare)
    const deleteEvents = await getEventsByType('delete');
    expect(deleteEvents.length).toBe(0);

    // Should have created database
    await expect(fs.access(testDbPath)).resolves.toBeUndefined();
  });

  test('should preserve inode information in startup delete events', async () => {
    // Phase 1: Create file and record inode
    daemonProcess = await startDaemon();

    const testFile = 'inode-test.txt';
    await fs.writeFile(testFile, 'test content');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get the initial create/find event to capture inode
    const initialEvents = await getEventsFromDb();
    const createEvent = initialEvents.find(e => 
      e.filename === testFile && 
      (e.event_type === 'create' || e.event_type === 'find')
    );
    expect(createEvent).toBeDefined();
    const originalInode = createEvent!.inode_number;

    // Phase 2: Stop daemon and delete file
    await stopDaemon(daemonProcess);
    await fs.unlink(testFile);

    // Phase 3: Restart and verify delete event has correct inode
    daemonProcess = await startDaemon();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const deleteEvents = await getEventsByType('delete');
    expect(deleteEvents.length).toBe(1);

    const deleteEvent = deleteEvents[0];
    expect(deleteEvent.filename).toBe(testFile);
    expect(deleteEvent.inode_number).toBe(originalInode);

    console.log('=== DEBUG: Inode preservation ===');
    console.log('Original inode:', originalInode);
    console.log('Delete event inode:', deleteEvent.inode_number);
  });

  test('should handle subdirectories correctly during startup scan', async () => {
    // Phase 1: Create files in subdirectories
    daemonProcess = await startDaemon();

    await fs.mkdir('subdir', { recursive: true });
    await fs.mkdir('subdir/nested', { recursive: true });
    
    const files = [
      'root-file.txt',
      'subdir/sub-file.txt',
      'subdir/nested/deep-file.txt'
    ];

    for (const filePath of files) {
      await fs.writeFile(filePath, `Content of ${filePath}`);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Phase 2: Stop daemon and delete some files
    await stopDaemon(daemonProcess);
    
    const deletedFiles = ['subdir/sub-file.txt', 'subdir/nested/deep-file.txt'];
    for (const filePath of deletedFiles) {
      await fs.unlink(filePath);
    }

    // Phase 3: Restart and verify
    daemonProcess = await startDaemon();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const deleteEvents = await getEventsByType('delete');
    expect(deleteEvents.length).toBe(deletedFiles.length);

    deletedFiles.forEach(filePath => {
      const fileName = path.basename(filePath);
      const fileDeleteEvents = deleteEvents.filter(e => e.filename === fileName);
      expect(fileDeleteEvents.length).toBe(1);
      
      const deleteEvent = fileDeleteEvents[0];
      expect(deleteEvent.file_path).toContain(filePath);
    });
  });
});