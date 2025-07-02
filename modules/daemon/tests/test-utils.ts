/**
 * Test Utilities for Efficient Event-based Testing
 * Replaces inefficient setTimeout with proper event waiting
 */

import { ChildProcess } from 'child_process';
import { Database } from 'better-sqlite3';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Wait for daemon to be ready by checking PID file
 */
export async function waitForDaemonReady(testDir: string, maxWait: number = 5000): Promise<void> {
  const pidPath = path.join(testDir, '.cctop/runtime/daemon.pid');
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWait) {
    try {
      await fs.access(pidPath);
      // PID file exists, daemon is ready
      return;
    } catch {
      // PID file doesn't exist yet, wait a bit
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  throw new Error(`Daemon did not start within ${maxWait}ms`);
}

/**
 * Wait for database events to be recorded
 */
export async function waitForEvents(
  db: Database, 
  expectedCount: number, 
  eventType?: string,
  maxWait: number = 5000
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWait) {
    const query = eventType 
      ? db.prepare('SELECT COUNT(*) as count FROM events WHERE event_type = ?')
      : db.prepare('SELECT COUNT(*) as count FROM events');
    
    const result = eventType ? query.get(eventType) : query.get();
    
    if (result.count >= expectedCount) {
      return;
    }
    
    // Wait briefly before checking again
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  const actualCount = eventType
    ? db.prepare('SELECT COUNT(*) as count FROM events WHERE event_type = ?').get(eventType).count
    : db.prepare('SELECT COUNT(*) as count FROM events').get().count;
    
  throw new Error(`Expected ${expectedCount} events${eventType ? ` of type ${eventType}` : ''}, but found ${actualCount} after ${maxWait}ms`);
}

/**
 * Wait for a specific file event to be recorded
 */
export async function waitForFileEvent(
  db: Database,
  filename: string,
  eventType: string,
  maxWait: number = 5000
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWait) {
    const query = db.prepare(
      'SELECT * FROM events WHERE filename = ? AND event_type = ? ORDER BY id DESC LIMIT 1'
    );
    
    const result = query.get(filename, eventType);
    
    if (result) {
      return;
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  throw new Error(`Event ${eventType} for file ${filename} was not recorded within ${maxWait}ms`);
}

/**
 * Wait for daemon stdout to contain a specific message
 */
export async function waitForDaemonOutput(
  daemon: ChildProcess,
  expectedMessage: string,
  maxWait: number = 5000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      daemon.stdout?.removeAllListeners('data');
      reject(new Error(`Daemon output did not contain "${expectedMessage}" within ${maxWait}ms`));
    }, maxWait);
    
    daemon.stdout?.on('data', (data) => {
      if (data.toString().includes(expectedMessage)) {
        clearTimeout(timeout);
        daemon.stdout?.removeAllListeners('data');
        resolve();
      }
    });
  });
}

/**
 * Create a file and wait for it to be detected
 */
export async function createFileAndWaitForEvent(
  testDir: string,
  db: Database,
  filename: string,
  content: string = 'test content',
  eventType: string = 'create'
): Promise<void> {
  const filePath = path.join(testDir, filename);
  await fs.writeFile(filePath, content);
  await waitForFileEvent(db, filename, eventType);
}

/**
 * Delete a file and wait for the delete event
 */
export async function deleteFileAndWaitForEvent(
  testDir: string,
  db: Database,
  filename: string
): Promise<void> {
  const filePath = path.join(testDir, filename);
  await fs.unlink(filePath);
  await waitForFileEvent(db, filename, 'delete');
}

/**
 * Move a file and wait for the move event
 */
export async function moveFileAndWaitForEvent(
  testDir: string,
  db: Database,
  oldName: string,
  newName: string
): Promise<void> {
  const oldPath = path.join(testDir, oldName);
  const newPath = path.join(testDir, newName);
  await fs.rename(oldPath, newPath);
  await waitForFileEvent(db, newName, 'move');
}