/**
 * Startup Delete Detection Tests - FUNC-001 Startup State Synchronization
 * Tests for proper 'delete' event detection when daemon restarts and files are missing
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { getUniqueTestDir, DatabaseQueries } from '../helpers';

describe('Startup Delete Detection (FUNC-001)', { timeout: 30000 }, () => {
  let testDir: string;
  let testDbPath: string;
  let daemonProcess: ChildProcess | null = null;
  let dbQueries: DatabaseQueries;

  beforeEach(async () => {
    testDir = getUniqueTestDir('cctop-startup-delete-test');
    testDbPath = path.join(testDir, '.cctop/data/activity.db');
    await fs.mkdir(testDir, { recursive: true });
    // Create .cctop directory structure for daemon
    await fs.mkdir(path.join(testDir, '.cctop/config'), { recursive: true });
    await fs.mkdir(path.join(testDir, '.cctop/data'), { recursive: true });
    await fs.mkdir(path.join(testDir, '.cctop/logs'), { recursive: true });
    await fs.mkdir(path.join(testDir, '.cctop/runtime'), { recursive: true });
    
    // Create daemon config to watch testDir
    const daemonConfig = {
      monitoring: {
        watchPaths: ['.'],
        excludePatterns: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.*',
          '**/.cctop/**'
        ]
      },
      daemon: {
        pidFile: '.cctop/runtime/daemon.pid',
        logFile: '.cctop/logs/daemon.log'
      },
      database: {
        path: '.cctop/data/activity.db'
      }
    };
    
    await fs.writeFile(
      path.join(testDir, '.cctop/config/daemon-config.json'),
      JSON.stringify(daemonConfig, null, 2)
    );

    dbQueries = new DatabaseQueries(testDbPath);
  });

  afterEach(async () => {
    if (daemonProcess) {
      daemonProcess.kill('SIGTERM');
      daemonProcess = null;
    }
    if (dbQueries) {
      await dbQueries.close();
    }
    await new Promise(resolve => setTimeout(resolve, 100));
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean test directory:', error);
    }
  });

  async function startDaemon(): Promise<ChildProcess> {
    const daemonPath = path.resolve(__dirname, '../../dist/index.js');
    
    const process = spawn('node', [daemonPath, '--standalone'], {
      stdio: 'pipe',
      cwd: testDir
    });
    
    // Capture daemon output for debugging
    process.stdout?.on('data', (data) => {
      const msg = data.toString();
      console.log('Daemon:', msg.trim());
    });
    process.stderr?.on('data', (data) => {
      console.error('Daemon Error:', data.toString());
    });

    // Wait for daemon startup
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return process;
  }

  async function stopDaemon(process: ChildProcess): Promise<void> {
    process.kill('SIGTERM');
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  test('should detect missing files on daemon restart', async () => {
    // Phase 1: Start daemon and create files
    daemonProcess = await startDaemon();
    await dbQueries.connect();

    const testFiles = ['file1.txt', 'file2.txt', 'file3.txt'];

    // Create files while daemon is running
    for (const fileName of testFiles) {
      await fs.writeFile(path.join(testDir, fileName), `Content of ${fileName}`);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Verify files were recorded as 'find' or 'create' events
    let events = await dbQueries.getEventsFromDb();
    console.log('Initial events:', events.map(e => ({ 
      type: e.event_type, 
      filename: e.filename,
      file_path: e.file_path 
    })));
    const initialFileEvents = events.filter(e => 
      testFiles.includes(e.filename) && 
      (e.event_type === 'find' || e.event_type === 'create')
    );
    expect(initialFileEvents.length).toBe(testFiles.length);

    // Phase 2: Stop daemon and delete files
    await stopDaemon(daemonProcess);
    daemonProcess = null;

    // Delete some files while daemon is stopped
    const deletedFiles = testFiles.slice(0, 2); // Delete first 2 files
    for (const fileName of deletedFiles) {
      await fs.unlink(path.join(testDir, fileName));
    }

    // Phase 3: Restart daemon - should detect missing files
    daemonProcess = await startDaemon();

    // Wait for startup scan to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify delete events were created for missing files
    events = await dbQueries.getEventsFromDb();
    console.log('Events after restart:', events.map(e => ({ 
      type: e.event_type, 
      filename: e.filename,
      file_path: e.file_path 
    })));
    const deleteEvents = await dbQueries.getEventsByType('delete');

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
    await dbQueries.connect();

    const testFile = 'duplicate-delete-test.txt';
    await fs.writeFile(path.join(testDir, testFile), 'test content');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Delete file while daemon is running (should create delete event)
    await fs.unlink(path.join(testDir, testFile));
    await new Promise(resolve => setTimeout(resolve, 800));

    // Verify delete event was created
    let deleteEvents = await dbQueries.getEventsByType('delete');
    expect(deleteEvents.length).toBe(1);
    expect(deleteEvents[0].filename).toBe(testFile);

    // Phase 2: Restart daemon - should NOT create duplicate delete event
    await stopDaemon(daemonProcess);
    daemonProcess = await startDaemon();

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify no duplicate delete events
    deleteEvents = await dbQueries.getEventsByType('delete');
    
    expect(deleteEvents.length).toBe(1); // Still only one delete event
  });

  test('should handle mixed scenarios: some files deleted, some remain', async () => {
    // Phase 1: Create multiple files
    daemonProcess = await startDaemon();
    await dbQueries.connect();

    const allFiles = [
      'mixed-test-remain.txt',
      'mixed-test-delete-1.txt', 
      'mixed-test-delete-2.txt',
      'mixed-test-remain-2.txt'
    ];

    for (const fileName of allFiles) {
      await fs.writeFile(path.join(testDir, fileName), `Content of ${fileName}`);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Phase 2: Stop daemon and delete some files
    await stopDaemon(daemonProcess);

    const deletedFiles = ['mixed-test-delete-1.txt', 'mixed-test-delete-2.txt'];
    const remainingFiles = ['mixed-test-remain.txt', 'mixed-test-remain-2.txt'];

    for (const fileName of deletedFiles) {
      await fs.unlink(path.join(testDir, fileName));
    }

    // Phase 3: Restart and verify
    daemonProcess = await startDaemon();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const deleteEvents = await dbQueries.getEventsByType('delete');
    
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
  });
});