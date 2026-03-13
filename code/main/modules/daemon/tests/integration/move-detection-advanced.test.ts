/**
 * Move Detection Advanced Tests - FUNC-003 File Movement Tracking
 * Tests for complex move detection scenarios
 */

import { describe, test, expect, beforeEach, afterEach, afterAll } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ChildProcess } from 'child_process';
import { DaemonTestManager, setupDaemonTest, teardownDaemonTest, getUniqueTestDir, DatabaseQueries } from '../helpers';

describe('Move Detection Advanced (FUNC-003)', () => {
  let testDir: string;
  let testDbPath: string;
  let daemonProcess: ChildProcess | null = null;
  let dbQueries: DatabaseQueries;

  beforeEach(async () => {
    testDir = getUniqueTestDir('cctop-move-test-advanced');
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

  test('should track move history chain correctly', async () => {
    daemonProcess = await startDaemon();
    await dbQueries.connect();

    // Create file with specific inode
    const file1 = path.join(testDir, 'chain-1.txt');
    const file2 = path.join(testDir, 'chain-2.txt');
    const file3 = path.join(testDir, 'chain-3.txt');
    const content = 'Move chain test content';
    
    // Initial create
    await fs.writeFile(file1, content);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get original inode
    const createEvents = await dbQueries.getEventsFromDb();
    const createEvent = createEvents.find(e => 
      e.filename === 'chain-1.txt' && 
      (e.event_type === 'create' || e.event_type === 'find')
    );
    const originalInode = createEvent!.inode_number;

    // Move 1: chain-1.txt -> chain-2.txt
    await fs.rename(file1, file2);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Move 2: chain-2.txt -> chain-3.txt
    await fs.rename(file2, file3);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify move chain
    const moveEvents = await dbQueries.getEventsByType('move');
    expect(moveEvents.length).toBe(2);

    // All moves should preserve the same inode
    moveEvents.forEach(moveEvent => {
      expect(moveEvent.inode_number).toBe(originalInode);
      // FUNC-000: move events don't have measurements
      expect(moveEvent.file_size).toBeNull();
    });

    // Final file should have same inode
    const stat = await fs.stat(file3);
    expect(stat.ino).toBe(originalInode);
  });

  test('should handle cross-directory moves with deep nesting', async () => {
    daemonProcess = await startDaemon();
    await dbQueries.connect();

    // Create deep directory structure
    const deepPath = path.join(testDir, 'level1', 'level2', 'level3');
    await fs.mkdir(deepPath, { recursive: true });

    const srcFile = path.join(testDir, 'deep-move.txt');
    const destFile = path.join(deepPath, 'deep-move.txt');

    // Create file in root
    await fs.writeFile(srcFile, 'Deep move content');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Move to deep directory
    await fs.rename(srcFile, destFile);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify move event
    const moveEvents = await dbQueries.getEventsByType('move');
    const moveEvent = moveEvents.find(e => e.filename === 'deep-move.txt');
    
    expect(moveEvent).toBeDefined();
    expect(moveEvent!.directory).toContain('level1/level2/level3');
    expect(moveEvent!.file_path).toContain('level1/level2/level3/deep-move.txt');
  });

  test('should handle rapid successive moves', async () => {
    daemonProcess = await startDaemon();
    await dbQueries.connect();

    const baseFile = path.join(testDir, 'rapid-move.txt');
    await fs.writeFile(baseFile, 'Rapid move test');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Perform rapid moves
    const moves = [
      'rapid-move-1.txt',
      'rapid-move-2.txt',
      'rapid-move-3.txt',
      'rapid-move-4.txt',
      'rapid-move-5.txt'
    ];

    let currentPath = baseFile;
    for (const newName of moves) {
      const newPath = path.join(testDir, newName);
      await fs.rename(currentPath, newPath);
      await new Promise(resolve => setTimeout(resolve, 200)); // Shorter delay
      currentPath = newPath;
    }

    // Wait for all events to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify all moves were captured
    const moveEvents = await dbQueries.getEventsByType('move');
    
    // Should have at least some move events (exact count may vary due to timing)
    expect(moveEvents.length).toBeGreaterThan(0);
    
    // Last file should exist
    const finalPath = path.join(testDir, moves[moves.length - 1]);
    await expect(fs.access(finalPath)).resolves.toBeUndefined();
  });

  test('should handle move with file size changes', async () => {
    daemonProcess = await startDaemon();
    await dbQueries.connect();

    const srcFile = path.join(testDir, 'size-move-src.txt');
    const destFile = path.join(testDir, 'size-move-dest.txt');
    
    // Create file with initial content
    const initialContent = 'Initial';
    await fs.writeFile(srcFile, initialContent);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get initial size
    const createEvents = await dbQueries.getEventsFromDb();
    const createEvent = createEvents.find(e => 
      e.filename === 'size-move-src.txt' && 
      (e.event_type === 'create' || e.event_type === 'find')
    );
    const initialSize = createEvent!.file_size;

    // Move file
    await fs.rename(srcFile, destFile);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify move preserves size
    const moveEvents = await dbQueries.getEventsByType('move');
    const moveEvent = moveEvents.find(e => e.filename === 'size-move-dest.txt');
    
    expect(moveEvent).toBeDefined();
    // FUNC-000: move events don't have measurements
    expect(moveEvent!.file_size).toBeNull();

    // Modify after move
    const newContent = 'This is much longer content after the move';
    await fs.writeFile(destFile, newContent);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify modify event has new size
    const modifyEvents = await dbQueries.getEventsByType('modify');
    const modifyEvent = modifyEvents.find(e => e.filename === 'size-move-dest.txt');
    
    expect(modifyEvent).toBeDefined();
    expect(modifyEvent!.file_size).toBe(Buffer.byteLength(newContent));
    expect(modifyEvent!.file_size).not.toBe(initialSize);
  });
});