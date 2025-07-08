/**
 * NPM Run Bug Reproduction Test - TDD
 * Reproduces the exact bug reported: npm run daemon + npm run cli not detecting events
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import sqlite3 from 'sqlite3';
import { getUniqueTestDir } from '../helpers';

describe('NPM Run Bug (TDD)', () => {
  let testDir: string;
  let dbPath: string;
  let daemonProcess: ChildProcess | null = null;
  
  beforeEach(async () => {
    testDir = getUniqueTestDir('cctop-npm-run-bug-test');
    dbPath = path.join(testDir, '.cctop/data/activity.db');
    
    // Kill any existing daemons
    try {
      await new Promise<void>((resolve) => {
        const killProcess = spawn('pkill', ['-f', 'cctop-daemon'], { stdio: 'pipe' });
        killProcess.on('exit', () => resolve());
        setTimeout(() => resolve(), 1000);
      });
    } catch (e) {
      // Ignore if no process to kill
    }
    
    // Clean and setup test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore if doesn't exist
    }
    
    // Setup test directory with .cctop structure
    await fs.mkdir(path.join(testDir, '.cctop/config'), { recursive: true });
    await fs.mkdir(path.join(testDir, '.cctop/data'), { recursive: true });
    await fs.mkdir(path.join(testDir, '.cctop/logs'), { recursive: true });
    await fs.mkdir(path.join(testDir, '.cctop/runtime'), { recursive: true });
    
    // Create config files
    const daemonConfig = {
      monitoring: {
        watchPaths: ['.'],
        excludePatterns: ['**/node_modules/**', '**/.git/**', '**/.cctop/**'], // Remove **/.*
        debounceMs: 50,
        maxDepth: 5
      },
      daemon: {
        pidFile: '.cctop/runtime/daemon.pid',
        logFile: '.cctop/logs/daemon.log',
        logLevel: 'debug'
      },
      database: {
        path: '.cctop/data/activity.db'
      }
    };
    
    await fs.writeFile(
      path.join(testDir, '.cctop/config/daemon-config.json'),
      JSON.stringify(daemonConfig, null, 2)
    );
  });
  
  afterEach(async () => {
    if (daemonProcess) {
      daemonProcess.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  async function getEventsFromDb(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      try {
        const db = new sqlite3.Database(dbPath);
        // Use FUNC-000 compliant query with JOINs
        const query = `
          SELECT 
            e.id,
            e.timestamp,
            et.code as event_type,
            e.file_name as filename,
            e.file_path,
            f.inode as file_inode
          FROM events e
          JOIN event_types et ON e.event_type_id = et.id
          JOIN files f ON e.file_id = f.id
          ORDER BY e.id DESC LIMIT 20
        `;
        db.all(query, (err, rows: any[]) => {
          if (err) {
            console.log('Database query error:', err);
            reject(err);
          } else {
            resolve(rows || []);
          }
          db.close();
        });
      } catch (e) {
        console.log('Database access error:', e);
        resolve([]); // Database might not exist yet
      }
    });
  }

  test('should reproduce bug: npm run daemon does not detect file events', async () => {
    const originalCwd = process.cwd();
    
    try {
      // Start daemon using node directly in test directory
      const daemonPath = path.resolve(__dirname, '../../dist/index.js');
      daemonProcess = spawn('node', [daemonPath], {
        stdio: 'pipe',
        cwd: testDir,
        detached: false,
        env: { ...process.env, NODE_ENV: 'test' }
      });
      
      // Log daemon output for debugging
      let daemonOutput = '';
      let daemonError = '';
      daemonProcess.stdout?.on('data', (data) => {
        daemonOutput += data.toString();
      });
      daemonProcess.stderr?.on('data', (data) => {
        daemonError += data.toString();
      });
      
      // Wait for daemon startup
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('=== Daemon Output ===');
      console.log(daemonOutput);
      if (daemonError) {
        console.log('=== Daemon Errors ===');
        console.log(daemonError);
      }
      
      // Check if daemon is actually running
      const pidFileExists = await fs.access(path.join(testDir, '.cctop/runtime/daemon.pid')).then(() => true).catch(() => false);
      console.log('PID file exists:', pidFileExists);
      
      // Verify working directory
      console.log('Test directory:', testDir);
      console.log('Daemon CWD should be:', testDir);
      
      // Create test file in test directory
      const testFile = path.join(testDir, 'user-test-file.txt');
      await fs.writeFile(testFile, 'user test content');
      console.log('Created test file:', testFile);
      
      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check database for events (this should fail - RED)
      const events = await getEventsFromDb();
      console.log('=== Events Found ===');
      console.log('Total events:', events.length);
      events.forEach(event => {
        console.log(`${event.event_type}: ${event.filename} (${event.timestamp})`);
      });
      
      // BUG: This should detect the file creation but doesn't
      const createEvents = events.filter(e => e.event_type === 'create' && e.filename === 'user-test-file.txt');
      console.log('Create events for test file:', createEvents.length);
      
      // Clean up test file
      try {
        await fs.unlink(testFile);
      } catch (e) {
        // Ignore cleanup errors
      }
      
      // This test should FAIL initially (RED phase)
      expect(createEvents.length).toBeGreaterThan(0);
      
    } finally {
      // No need to change directory back since we didn't change it
    }
  }, 30000);
});