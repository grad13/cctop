/**
 * Wait Utilities for Event-based Testing
 * Provides efficient waiting mechanisms for async operations
 */

import { ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DatabaseQueries } from './database-queries';

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
  dbQueries: DatabaseQueries, 
  expectedCount: number, 
  eventType?: string,
  maxWait: number = 5000
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWait) {
    const result = eventType 
      ? await dbQueries.queryEvent(`
          SELECT COUNT(*) as count 
          FROM events e 
          JOIN event_types et ON e.event_type_id = et.id 
          WHERE et.code = ?
        `, eventType)
      : await dbQueries.queryEvent('SELECT COUNT(*) as count FROM events');
    
    if (result.count >= expectedCount) {
      return;
    }
    
    // Wait briefly before checking again
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  const actualCount = eventType
    ? (await dbQueries.queryEvent(`
        SELECT COUNT(*) as count 
        FROM events e 
        JOIN event_types et ON e.event_type_id = et.id 
        WHERE et.code = ?
      `, eventType)).count
    : (await dbQueries.queryEvent('SELECT COUNT(*) as count FROM events')).count;
    
  throw new Error(`Expected ${expectedCount} events${eventType ? ` of type ${eventType}` : ''}, but found ${actualCount} after ${maxWait}ms`);
}

/**
 * Wait for a specific file event to be recorded
 */
export async function waitForFileEvent(
  dbQueries: DatabaseQueries,
  filename: string,
  eventType: string,
  maxWait: number = 5000
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWait) {
    const result = await dbQueries.queryEvent(
      `SELECT e.* 
       FROM events e 
       JOIN event_types et ON e.event_type_id = et.id 
       WHERE e.file_name = ? AND et.code = ? 
       ORDER BY e.id DESC LIMIT 1`,
      filename, eventType
    );
    
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