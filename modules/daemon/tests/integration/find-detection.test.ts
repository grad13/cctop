/**
 * Find Detection Tests - FUNC-002 Scan Existing Files
 * Tests for proper 'find' event detection during initial scan
 */

import { describe, test, expect, beforeEach, afterEach, afterAll } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ChildProcess } from 'child_process';
import { DaemonTestManager, setupDaemonTest, teardownDaemonTest, getUniqueTestDir, DatabaseQueries } from '../helpers';

describe('Find Detection (FUNC-002)', () => {
  let testDir: string;
  let testDbPath: string;
  let daemonProcess: ChildProcess | null = null;
  let dbQueries: DatabaseQueries;

  beforeEach(async () => {
    testDir = getUniqueTestDir('cctop-find-test');
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

  test('should detect pre-existing files as find events', async () => {
    // Create files before daemon starts
    const testFiles = [
      'existing-1.txt',
      'existing-2.js',
      'existing-3.md'
    ];

    for (const fileName of testFiles) {
      await fs.writeFile(path.join(testDir, fileName), `Content of ${fileName}`);
    }

    // Start daemon after files exist
    daemonProcess = await startDaemon();
    await dbQueries.connect();
    
    // Wait for initial scan
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check daemon log
    const logPath = path.join(testDir, '.cctop/logs/daemon.log');
    try {
      const logContent = await fs.readFile(logPath, 'utf8');
      console.log('Daemon log (find events):', logContent.split('\n').filter(line => line.includes('find')).join('\n'));
    } catch (e) {
      console.log('Could not read daemon log:', e);
    }

    // Verify find events
    const events = await dbQueries.getEventsFromDb();
    console.log('All events:', events.map(e => ({ 
      id: e.id,
      event_type: e.event_type,
      file_name: e.file_name,
      filename: e.filename
    })));
    const findEvents = await dbQueries.getEventsByType('find');
    console.log('Find events:', findEvents.length);
    
    // Should have find events for all pre-existing files
    expect(findEvents.length).toBe(testFiles.length);
    
    testFiles.forEach(fileName => {
      const fileFindEvents = findEvents.filter(e => e.filename === fileName);
      expect(fileFindEvents.length).toBe(1);
      expect(fileFindEvents[0].event_type).toBe('find');
    });

    // Should not have create events for these files
    const createEvents = await dbQueries.getEventsByType('create');
    testFiles.forEach(fileName => {
      const fileCreateEvents = createEvents.filter(e => e.filename === fileName);
      expect(fileCreateEvents.length).toBe(0);
    });
  });

  test('should detect files in subdirectories during initial scan', async () => {
    // Create directory structure with files
    const fileStructure = [
      'root.txt',
      'subdir/sub1.txt',
      'subdir/sub2.txt',
      'subdir/nested/deep.txt'
    ];

    for (const filePath of fileStructure) {
      const fullPath = path.join(testDir, filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, `Content of ${filePath}`);
    }

    // Start daemon
    daemonProcess = await startDaemon();
    await dbQueries.connect();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify all files found
    const findEvents = await dbQueries.getEventsByType('find');
    
    expect(findEvents.length).toBe(fileStructure.length);
    
    fileStructure.forEach(filePath => {
      const fileName = path.basename(filePath);
      const fileFindEvents = findEvents.filter(e => e.filename === fileName);
      expect(fileFindEvents.length).toBe(1);
      expect(fileFindEvents[0].file_path).toContain(filePath);
    });
  });

  test('should capture correct metadata for found files', async () => {
    // Create file with known content
    const testFile = 'metadata-test.txt';
    const testContent = 'This is test content for metadata verification';
    const fullPath = path.join(testDir, testFile);
    
    await fs.writeFile(fullPath, testContent);
    const stat = await fs.stat(fullPath);

    // Start daemon
    daemonProcess = await startDaemon();
    await dbQueries.connect();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify metadata
    const findEvents = await dbQueries.getEventsByType('find');
    const findEvent = findEvents.find(e => e.filename === testFile);
    
    expect(findEvent).toBeDefined();
    expect(findEvent!.file_size).toBe(Buffer.byteLength(testContent));
    expect(findEvent!.inode_number).toBe(stat.ino);
    expect(findEvent!.directory).toBe('.');
  });

  test('should handle empty directories without creating events', async () => {
    // Create empty directories
    await fs.mkdir(path.join(testDir, 'empty-dir'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'empty-dir/nested-empty'), { recursive: true });

    // Start daemon
    daemonProcess = await startDaemon();
    await dbQueries.connect();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Should not have any events for empty directories
    const events = await dbQueries.getEventsFromDb();
    expect(events.length).toBe(0);
  });

  test('should differentiate between find and create events', async () => {
    // Create some files before daemon starts
    const preExistingFile = 'pre-existing.txt';
    await fs.writeFile(path.join(testDir, preExistingFile), 'Pre-existing content');

    // Start daemon
    daemonProcess = await startDaemon();
    await dbQueries.connect();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create new file after daemon is running
    const newFile = 'new-file.txt';
    await fs.writeFile(path.join(testDir, newFile), 'New file content');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify events
    const findEvents = await dbQueries.getEventsByType('find');
    const createEvents = await dbQueries.getEventsByType('create');

    // Pre-existing file should be 'find'
    const preFindEvents = findEvents.filter(e => e.filename === preExistingFile);
    expect(preFindEvents.length).toBe(1);

    // New file should be 'create'
    const newCreateEvents = createEvents.filter(e => e.filename === newFile);
    expect(newCreateEvents.length).toBe(1);
  });

  test('should handle large number of pre-existing files', async () => {
    // Create many files
    const fileCount = 20;
    const testFiles: string[] = [];
    
    for (let i = 0; i < fileCount; i++) {
      const fileName = `bulk-file-${i}.txt`;
      testFiles.push(fileName);
      await fs.writeFile(path.join(testDir, fileName), `Content ${i}`);
    }

    // Start daemon
    daemonProcess = await startDaemon();
    await dbQueries.connect();
    await new Promise(resolve => setTimeout(resolve, 3000)); // Extra time for many files

    // Verify all files found
    const findEvents = await dbQueries.getEventsByType('find');
    expect(findEvents.length).toBe(fileCount);

    // Each file should have exactly one find event
    testFiles.forEach(fileName => {
      const fileFindEvents = findEvents.filter(e => e.filename === fileName);
      expect(fileFindEvents.length).toBe(1);
    });
  });

  test('should preserve file order in find events', async () => {
    // Create files with timestamps
    const files = ['a-first.txt', 'b-second.txt', 'c-third.txt'];
    
    for (let i = 0; i < files.length; i++) {
      await fs.writeFile(path.join(testDir, files[i]), `File ${i}`);
      await new Promise(resolve => setTimeout(resolve, 100)); // Ensure different timestamps
    }

    // Start daemon
    daemonProcess = await startDaemon();
    await dbQueries.connect();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get find events
    const findEvents = await dbQueries.getEventsByType('find');
    expect(findEvents.length).toBe(files.length);

    // All should have valid timestamps
    findEvents.forEach(event => {
      expect(event.timestamp).toBeTruthy();
      expect(new Date(event.timestamp).getTime()).toBeGreaterThan(0);
    });
  });
});