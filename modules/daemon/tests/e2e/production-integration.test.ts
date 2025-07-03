/**
 * Production Integration Test - Real Daemon Event Detection
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ChildProcess } from 'child_process';
import sqlite3 from 'sqlite3';
import { DaemonTestManager, getUniqueTestDir } from '../helpers';

describe('Production Integration (TDD)', () => {
  const productionDir = '/Users/takuo-h/Workspace/Code/06-cctop/code/worktrees/07-01-daemon-production-ready';
  let testDir: string;
  let daemonProcess: ChildProcess | null = null;
  
  beforeEach(async () => {
    // Create unique test directory in /tmp
    testDir = getUniqueTestDir('cctop-production-integration-test');
    await fs.mkdir(testDir, { recursive: true });
    
    // Clean up any existing daemon
    await DaemonTestManager.killAllDaemons();
  });
  
  afterEach(async () => {
    if (daemonProcess) {
      await DaemonTestManager.stopDaemon(daemonProcess);
    }
    await DaemonTestManager.killAllDaemons();
    
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean test directory:', error);
    }
  });
  
  async function getEventsFromProductionDb(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const dbPath = path.join(testDir, '.cctop/data/activity.db');
      const db = new sqlite3.Database(dbPath);
      db.all('SELECT * FROM events ORDER BY id DESC LIMIT 10', (err, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows);
        db.close();
      });
    });
  }
  
  test('should detect file creation in test directory', async () => {
    let testFile: string | undefined;
    
    try {
      // Start daemon in test directory
      const daemonPath = path.join(productionDir, 'modules/daemon/dist/index.js');
      daemonProcess = await DaemonTestManager.startDaemon(daemonPath, testDir);
      
      // Wait for daemon startup
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create test file in test directory
      testFile = path.join(testDir, `integration-test-${Date.now()}.txt`);
      
      await fs.writeFile(testFile, 'integration test content');
      
      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check database for events
      const events = await getEventsFromProductionDb();
      console.log('=== Production Events ===');
      events.forEach(event => {
        console.log(`${event.event_type}: ${event.filename} (${event.timestamp})`);
      });
      
      // Should detect the file creation
      const createEvents = events.filter(e => 
        e.event_type === 'create' && 
        e.filename.startsWith('integration-test-')
      );
      expect(createEvents.length).toBeGreaterThan(0);
      
    } finally {
      // Clean up test file
      if (testFile) {
        try {
          await fs.unlink(testFile);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  }, 30000);
});