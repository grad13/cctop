/**
 * Find Detection Tests - FUNC-001 Initial Scan Implementation
 * Tests for proper 'find' event detection during daemon startup
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

describe('Find Detection (FUNC-001)', () => {
  const testDir = '/tmp/cctop-find-test';
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

  test('should detect existing files as "find" events during initial scan', async () => {
    // RED PHASE: Create existing files BEFORE daemon starts
    const existingFiles = [
      'existing-file-1.txt',
      'existing-file-2.js', 
      'existing-file-3.md'
    ];

    for (const fileName of existingFiles) {
      await fs.writeFile(fileName, `Pre-existing content in ${fileName}`);
    }

    // Verify files exist before daemon starts
    for (const fileName of existingFiles) {
      await expect(fs.access(fileName)).resolves.toBeUndefined();
    }

    // GREEN PHASE: Start daemon (should perform initial scan)
    const daemonPath = path.resolve(__dirname, '../dist/index.js');
    
    daemonProcess = spawn('node', [daemonPath, '--standalone'], {
      stdio: 'pipe',
      cwd: testDir
    });

    // Wait for daemon startup and initial scan completion
    await new Promise(resolve => setTimeout(resolve, 2000));

    // VERIFICATION: Check database for 'find' events
    const events = await getEventsFromDb();
    const findEvents = await getEventsByType('find');

    // Debug logging
    console.log('=== DEBUG: All events after initial scan ===');
    events.forEach((event, index) => {
      console.log(`Event ${index + 1}:`, {
        id: event.id,
        type: event.event_type,
        filename: event.filename,
        timestamp: event.timestamp,
        inode: event.inode_number
      });
    });

    console.log(`\n=== DEBUG: Find events (found ${findEvents.length}) ===`);
    findEvents.forEach((event, index) => {
      console.log(`Find ${index + 1}:`, {
        id: event.id,
        filename: event.filename,
        timestamp: event.timestamp,
        inode: event.inode_number
      });
    });

    // ASSERTIONS: Should have exactly 3 'find' events
    expect(findEvents.length).toBe(3);

    // Each existing file should have exactly one 'find' event
    existingFiles.forEach(fileName => {
      const fileFindEvents = findEvents.filter(e => e.filename === fileName);
      expect(fileFindEvents.length).toBe(1);
      
      const findEvent = fileFindEvents[0];
      expect(findEvent.event_type).toBe('find');
      expect(findEvent.inode_number).toBeGreaterThan(0);
      expect(findEvent.file_path).toContain(fileName);
    });

    // Should NOT have any 'create' events for pre-existing files
    const createEvents = await getEventsByType('create');
    expect(createEvents.length).toBe(0);
  });

  test('should distinguish "find" events from "create" events', async () => {
    // Create one existing file before daemon starts
    await fs.writeFile('pre-existing.txt', 'existed before daemon');
    
    // Start daemon
    const daemonPath = path.resolve(__dirname, '../dist/index.js');
    
    daemonProcess = spawn('node', [daemonPath, '--standalone'], {
      stdio: 'pipe',
      cwd: testDir
    });

    // Wait for daemon startup and initial scan
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create new file AFTER daemon is running
    await fs.writeFile('newly-created.txt', 'created after daemon started');
    
    // Wait for real-time event processing
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify event types
    const findEvents = await getEventsByType('find');
    const createEvents = await getEventsByType('create');

    // Should have one 'find' event for pre-existing file
    expect(findEvents.length).toBe(1);
    expect(findEvents[0].filename).toBe('pre-existing.txt');
    expect(findEvents[0].event_type).toBe('find');

    // Should have one 'create' event for newly created file
    expect(createEvents.length).toBe(1);
    expect(createEvents[0].filename).toBe('newly-created.txt');
    expect(createEvents[0].event_type).toBe('create');
  });

  test('should handle empty directory correctly during initial scan', async () => {
    // Start daemon in empty directory (no existing files)
    const daemonPath = path.resolve(__dirname, '../dist/index.js');
    
    daemonProcess = spawn('node', [daemonPath, '--standalone'], {
      stdio: 'pipe',
      cwd: testDir
    });

    // Wait for daemon startup and initial scan
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify no 'find' events in empty directory
    const findEvents = await getEventsByType('find');
    expect(findEvents.length).toBe(0);

    // Database should still be created and accessible
    await expect(fs.access(testDbPath)).resolves.toBeUndefined();
  });

  test('should record correct metadata for found files', async () => {
    // Create test file with known content
    const testContent = 'Test content for metadata verification';
    const testFileName = 'metadata-test.txt';
    
    await fs.writeFile(testFileName, testContent);
    
    // Get file stats before daemon starts
    const stats = await fs.stat(testFileName);
    const expectedSize = stats.size;
    const expectedInode = stats.ino;

    // Start daemon
    const daemonPath = path.resolve(__dirname, '../dist/index.js');
    
    daemonProcess = spawn('node', [daemonPath, '--standalone'], {
      stdio: 'pipe',
      cwd: testDir
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify metadata in 'find' event
    const findEvents = await getEventsByType('find');
    expect(findEvents.length).toBe(1);

    const findEvent = findEvents[0];
    expect(findEvent.filename).toBe(testFileName);
    expect(findEvent.file_size).toBe(expectedSize);
    expect(findEvent.inode_number).toBe(expectedInode);
    expect(findEvent.event_type).toBe('find');
    
    // Verify timestamp is reasonable (within last few seconds)
    const eventTimestamp = new Date(findEvent.timestamp).getTime();
    const now = Date.now();
    const timeDiff = now - eventTimestamp;
    expect(timeDiff).toBeLessThan(10000); // Less than 10 seconds ago
  });

  test('should handle multiple file types during initial scan', async () => {
    // Create files with different extensions and sizes
    const testFiles = [
      { name: 'document.txt', content: 'Text document content' },
      { name: 'script.js', content: 'console.log("JavaScript file");' },
      { name: 'style.css', content: 'body { margin: 0; }' },
      { name: 'data.json', content: '{"key": "value", "number": 42}' },
      { name: 'no-extension', content: 'File without extension' }
    ];

    // Create all test files
    for (const file of testFiles) {
      await fs.writeFile(file.name, file.content);
    }

    // Start daemon
    const daemonPath = path.resolve(__dirname, '../dist/index.js');
    
    daemonProcess = spawn('node', [daemonPath, '--standalone'], {
      stdio: 'pipe',
      cwd: testDir
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify all files were detected as 'find' events
    const findEvents = await getEventsByType('find');
    expect(findEvents.length).toBe(testFiles.length);

    // Check each file was properly recorded
    testFiles.forEach(testFile => {
      const fileEvents = findEvents.filter(e => e.filename === testFile.name);
      expect(fileEvents.length).toBe(1);
      
      const findEvent = fileEvents[0];
      expect(findEvent.event_type).toBe('find');
      expect(findEvent.file_size).toBe(Buffer.byteLength(testFile.content, 'utf8'));
      expect(findEvent.inode_number).toBeGreaterThan(0);
    });
  });

  test('should handle subdirectories during initial scan', async () => {
    // Create directory structure with files
    await fs.mkdir('subdir1', { recursive: true });
    await fs.mkdir('subdir2/nested', { recursive: true });
    
    // Create files in different locations
    await fs.writeFile('root-file.txt', 'Root level file');
    await fs.writeFile('subdir1/sub-file.txt', 'File in subdirectory');
    await fs.writeFile('subdir2/nested/deep-file.txt', 'File in nested directory');

    // Start daemon
    const daemonPath = path.resolve(__dirname, '../dist/index.js');
    
    daemonProcess = spawn('node', [daemonPath, '--standalone'], {
      stdio: 'pipe',
      cwd: testDir
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify all files were found regardless of directory depth
    const findEvents = await getEventsByType('find');
    expect(findEvents.length).toBe(3);

    // Check specific files
    const filenames = findEvents.map(e => e.filename);
    expect(filenames).toContain('root-file.txt');
    expect(filenames).toContain('sub-file.txt');
    expect(filenames).toContain('deep-file.txt');

    // Verify paths include directory information
    const rootEvent = findEvents.find(e => e.filename === 'root-file.txt');
    const subEvent = findEvents.find(e => e.filename === 'sub-file.txt');
    const deepEvent = findEvents.find(e => e.filename === 'deep-file.txt');

    expect(rootEvent?.file_path).toContain('root-file.txt');
    expect(subEvent?.file_path).toContain('subdir1');
    expect(deepEvent?.file_path).toContain('subdir2/nested');
  });
});