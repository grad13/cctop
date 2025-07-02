/**
 * NPM Run Bug Reproduction Test - TDD
 * Reproduces the exact bug reported: npm run daemon + npm run cli not detecting events
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import sqlite3 from 'sqlite3';

describe('NPM Run Bug (TDD)', () => {
  const productionDir = path.resolve(__dirname, '../../..');
  const dbPath = path.join(productionDir, '.cctop/data/activity.db');
  let daemonProcess: ChildProcess | null = null;
  
  beforeEach(async () => {
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
    
    // Clean database
    try {
      await fs.unlink(dbPath);
    } catch (e) {
      // Ignore if file doesn't exist
    }
  });
  
  afterEach(async () => {
    if (daemonProcess) {
      daemonProcess.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });

  async function getEventsFromDb(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      try {
        const db = new sqlite3.Database(dbPath);
        db.all('SELECT * FROM events ORDER BY id DESC LIMIT 20', (err, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows || []);
          db.close();
        });
      } catch (e) {
        resolve([]); // Database might not exist yet
      }
    });
  }

  test('should reproduce bug: npm run daemon does not detect file events', async () => {
    const originalCwd = process.cwd();
    
    try {
      // RED: Start daemon exactly like user does - npm run daemon
      daemonProcess = spawn('npm', ['run', 'daemon'], {
        stdio: 'pipe',
        cwd: productionDir,
        detached: false
      });
      
      // Log daemon output for debugging
      let daemonOutput = '';
      daemonProcess.stdout?.on('data', (data) => {
        daemonOutput += data.toString();
      });
      daemonProcess.stderr?.on('data', (data) => {
        daemonOutput += data.toString();
      });
      
      // Wait for daemon startup
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('=== Daemon Output ===');
      console.log(daemonOutput);
      
      // Check if daemon is actually running
      const pidFileExists = await fs.access(path.join(productionDir, '.cctop/runtime/daemon.pid')).then(() => true).catch(() => false);
      console.log('PID file exists:', pidFileExists);
      
      // Create test file in production directory (user's action)
      const testFile = path.join(productionDir, 'user-test-file.txt');
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