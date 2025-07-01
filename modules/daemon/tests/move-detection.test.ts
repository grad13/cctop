/**
 * Move Detection Tests - Proper verification of move event detection
 */

import { describe, test, expect, beforeEach, afterEach, afterAll } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ChildProcess } from 'child_process';
import sqlite3 from 'sqlite3';
import { DaemonTestManager, setupDaemonTest, teardownDaemonTest } from './test-helpers';

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

describe('Move Detection', () => {
  const testDir = '/tmp/cctop-move-test';
  const testDbPath = path.join(testDir, '.cctop/data/activity.db');
  let daemonProcess: ChildProcess | null = null;

  beforeEach(async () => {
    await setupDaemonTest(testDir);
  });

  afterEach(async () => {
    await teardownDaemonTest(daemonProcess, testDir);
    daemonProcess = null;
  });

  afterAll(async () => {
    await DaemonTestManager.globalCleanup();
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

  test('should correctly detect move events with proper inode tracking', async () => {
    const daemonPath = path.resolve(__dirname, '../dist/index.js');
    
    // Start daemon using test manager
    daemonProcess = await DaemonTestManager.startDaemon(daemonPath, testDir);

    // Capture daemon output for debugging
    let daemonOutput = '';
    if (daemonProcess.stdout) {
      daemonProcess.stdout.on('data', (data) => {
        daemonOutput += data.toString();
      });
    }
    if (daemonProcess.stderr) {
      daemonProcess.stderr.on('data', (data) => {
        daemonOutput += data.toString();
      });
    }

    // Wait for daemon startup
    await DaemonTestManager.waitForDaemonStartup(daemonProcess);
    await new Promise(resolve => setTimeout(resolve, 500)); // Additional stabilization

    // Step 1: Create file
    const originalFile = 'move-test.txt';
    const movedFile = 'move-test-renamed.txt';
    
    await fs.writeFile(originalFile, 'content for move test');
    await new Promise(resolve => setTimeout(resolve, 300));

    // Step 2: Move file (should be detected as move, not delete+create)
    await fs.rename(originalFile, movedFile);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 3: Verify events in database
    const events = await getEventsFromDb();
    
    // Should have: create + move (NOT create + delete + create)
    const createEvents = events.filter(e => e.event_type === 'create');
    const moveEvents = events.filter(e => e.event_type === 'move');
    const deleteEvents = events.filter(e => e.event_type === 'delete');

    // Debug logging for move operation
    console.log('=== DEBUG: Move operation events ===');
    events.forEach((event, index) => {
      console.log(`Event ${index + 1}:`, {
        id: event.id,
        type: event.event_type,
        filename: event.filename,
        timestamp: event.timestamp,
        inode: event.inode_number
      });
    });

    // Show daemon debug output
    console.log('=== DAEMON OUTPUT ===');
    console.log(daemonOutput);

    // Assertions
    expect(createEvents.length).toBe(1);
    expect(moveEvents.length).toBe(1);
    expect(deleteEvents.length).toBe(0);

    // Verify create event
    const createEvent = createEvents[0];
    expect(createEvent.filename).toBe('move-test.txt');
    expect(createEvent.inode_number).toBeGreaterThan(0);

    // Verify move event
    const moveEvent = moveEvents[0];
    expect(moveEvent.filename).toBe('move-test-renamed.txt');
    expect(moveEvent.inode_number).toBe(createEvent.inode_number); // Same inode
    expect(moveEvent.file_path).toContain('move-test-renamed.txt');
  });

  test('should handle delete correctly when not a move', async () => {
    const daemonPath = path.resolve(__dirname, '../dist/index.js');
    
    daemonProcess = await DaemonTestManager.startDaemon(daemonPath, testDir);
    await DaemonTestManager.waitForDaemonStartup(daemonProcess);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create and delete file (not move)
    const testFile = 'delete-test.txt';
    await fs.writeFile(testFile, 'content to be deleted');
    await new Promise(resolve => setTimeout(resolve, 300));

    await fs.unlink(testFile);
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for move timeout

    const events = await getEventsFromDb();
    const createEvents = events.filter(e => e.event_type === 'create');
    const deleteEvents = events.filter(e => e.event_type === 'delete');
    const moveEvents = events.filter(e => e.event_type === 'move');

    expect(createEvents.length).toBe(1);
    expect(deleteEvents.length).toBe(1);
    expect(moveEvents.length).toBe(0);

    // Verify delete event has correct inode
    const deleteEvent = deleteEvents[0];
    const createEvent = createEvents[0];
    expect(deleteEvent.inode_number).toBe(createEvent.inode_number);
    expect(deleteEvent.inode_number).toBeGreaterThan(0);
  });

  test('should detect multiple file operations correctly', async () => {
    const daemonPath = path.resolve(__dirname, '../dist/index.js');
    
    daemonProcess = await DaemonTestManager.startDaemon(daemonPath, testDir);
    await DaemonTestManager.waitForDaemonStartup(daemonProcess);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Complex sequence: create -> modify -> move -> delete
    const file1 = 'complex-test.txt';
    const file2 = 'complex-test-moved.txt';

    // Create
    await fs.writeFile(file1, 'initial content');
    await new Promise(resolve => setTimeout(resolve, 200));

    // Modify
    await fs.appendFile(file1, '\nmodified content');
    await new Promise(resolve => setTimeout(resolve, 200));

    // Move
    await fs.rename(file1, file2);
    await new Promise(resolve => setTimeout(resolve, 300));

    // Delete
    await fs.unlink(file2);
    await new Promise(resolve => setTimeout(resolve, 500));

    const events = await getEventsFromDb();
    
    const createEvents = await getEventsByType('create');
    const modifyEvents = await getEventsByType('modify');
    const moveEvents = await getEventsByType('move');
    const deleteEvents = await getEventsByType('delete');

    expect(createEvents.length).toBe(1);
    expect(modifyEvents.length).toBe(1);
    expect(moveEvents.length).toBe(1);
    expect(deleteEvents.length).toBe(1);

    // All events should have the same inode
    const inode = createEvents[0].inode_number;
    expect(inode).toBeGreaterThan(0);
    expect(modifyEvents[0].inode_number).toBe(inode);
    expect(moveEvents[0].inode_number).toBe(inode);
    expect(deleteEvents[0].inode_number).toBe(inode);
  });

  test('should handle rapid move operations correctly', async () => {
    const daemonPath = path.resolve(__dirname, '../dist/index.js');
    
    daemonProcess = await DaemonTestManager.startDaemon(daemonPath, testDir);
    await DaemonTestManager.waitForDaemonStartup(daemonProcess);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create file
    await fs.writeFile('rapid-test.txt', 'content');
    await new Promise(resolve => setTimeout(resolve, 200));

    // Rapid sequence of moves
    await fs.rename('rapid-test.txt', 'rapid-test-1.txt');
    await new Promise(resolve => setTimeout(resolve, 150));
    
    await fs.rename('rapid-test-1.txt', 'rapid-test-2.txt');
    await new Promise(resolve => setTimeout(resolve, 150));
    
    await fs.rename('rapid-test-2.txt', 'rapid-test-final.txt');
    await new Promise(resolve => setTimeout(resolve, 300));

    const events = await getEventsFromDb();
    const createEvents = await getEventsByType('create');
    const moveEvents = await getEventsByType('move');

    expect(createEvents.length).toBe(1);
    expect(moveEvents.length).toBe(3); // Three move operations

    // All should have same inode
    const inode = createEvents[0].inode_number;
    moveEvents.forEach(moveEvent => {
      expect(moveEvent.inode_number).toBe(inode);
    });
  });

  test('should NOT create duplicate create events', async () => {
    const daemonPath = path.resolve(__dirname, '../dist/index.js');
    
    daemonProcess = await DaemonTestManager.startDaemon(daemonPath, testDir);
    await DaemonTestManager.waitForDaemonStartup(daemonProcess);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create single file
    const testFile = 'single-create-test.txt';
    await fs.writeFile(testFile, 'test content');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get all events from database
    const events = await getEventsFromDb();
    const createEvents = await getEventsByType('create');

    // Debug logging: Always show what we got
    console.log('=== DEBUG: All events in database ===');
    events.forEach((event, index) => {
      console.log(`Event ${index + 1}:`, {
        id: event.id,
        type: event.event_type,
        filename: event.filename,
        timestamp: event.timestamp,
        inode: event.inode_number
      });
    });

    console.log(`\n=== DEBUG: Create events (found ${createEvents.length}) ===`);
    createEvents.forEach((event, index) => {
      console.log(`Create ${index + 1}:`, {
        id: event.id,
        filename: event.filename,
        timestamp: event.timestamp,
        inode: event.inode_number
      });
    });

    // Critical test: Should have exactly ONE create event, not two
    expect(createEvents.length).toBe(1);
    
    // Verify the single create event is correct
    const createEvent = createEvents[0];
    expect(createEvent.filename).toBe('single-create-test.txt');
    expect(createEvent.event_type).toBe('create');
    expect(createEvent.inode_number).toBeGreaterThan(0);
  });

  test('should handle multiple separate file creations correctly', async () => {
    const daemonPath = path.resolve(__dirname, '../dist/index.js');
    
    daemonProcess = await DaemonTestManager.startDaemon(daemonPath, testDir);
    await DaemonTestManager.waitForDaemonStartup(daemonProcess);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create multiple separate files
    const files = ['file1.txt', 'file2.txt', 'file3.txt'];
    
    for (const file of files) {
      await fs.writeFile(file, `content of ${file}`);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    await new Promise(resolve => setTimeout(resolve, 300));

    const events = await getEventsFromDb();
    const createEvents = await getEventsByType('create');

    // Should have exactly 3 create events (one per file)
    expect(createEvents.length).toBe(3);

    // Each file should have exactly one create event
    files.forEach(fileName => {
      const fileCreateEvents = createEvents.filter(e => e.filename === fileName);
      expect(fileCreateEvents.length).toBe(1);
    });

    // All events should have different inodes
    const inodes = createEvents.map(e => e.inode_number);
    const uniqueInodes = new Set(inodes);
    expect(uniqueInodes.size).toBe(3); // All different inodes
  });
});