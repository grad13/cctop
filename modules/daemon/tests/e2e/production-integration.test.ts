/**
 * Production Integration Test - Real Daemon Event Detection
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ChildProcess } from 'child_process';
import sqlite3 from 'sqlite3';
import { DaemonTestManager } from '../helpers';

describe('Production Integration (TDD)', () => {
  const productionDir = '/Users/takuo-h/Workspace/Code/06-cctop/code/worktrees/07-01-daemon-production-ready';
  const dbPath = path.join(productionDir, '.cctop/data/activity.db');
  let daemonProcess: ChildProcess | null = null;
  
  beforeEach(async () => {
    // Clean up any existing daemon
    await DaemonTestManager.killAllDaemons();
  });
  
  afterEach(async () => {
    if (daemonProcess) {
      await DaemonTestManager.stopDaemon(daemonProcess);
    }
    await DaemonTestManager.killAllDaemons();
  });
  
  async function getEventsFromProductionDb(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath);
      db.all('SELECT * FROM events ORDER BY id DESC LIMIT 10', (err, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows);
        db.close();
      });
    });
  }
  
  test('should detect file creation in production directory', async () => {
    const originalCwd = process.cwd();
    
    try {
      // Start daemon with production config
      const daemonPath = path.join(productionDir, 'modules/daemon/dist/index.js');
      daemonProcess = await DaemonTestManager.startDaemon(daemonPath, productionDir);
      
      // Wait for daemon startup
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create test file in production directory
      const testFile = path.join(productionDir, `integration-test-${Date.now()}.txt`);
      
      // Ensure file doesn't exist
      try {
        await fs.unlink(testFile);
      } catch (e) {
        // File doesn't exist, which is what we want
      }
      
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
      
      // Clean up
      await fs.unlink(testFile);
      
    } finally {
      // No need to change directory back since we didn't change it
    }
  }, 30000);
});