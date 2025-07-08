/**
 * Event Types Test - FUNC-000 Compliance
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import sqlite3 from 'sqlite3';
import { Database } from '../../../shared/dist/index';
import * as path from 'path';
import * as fs from 'fs/promises';

describe('Event Types (FUNC-000)', () => {
  let database: Database;
  let testDbPath: string;

  beforeEach(async () => {
    // Create unique test database
    testDbPath = path.join(__dirname, `test-event-types-${Date.now()}.db`);
    database = new Database(testDbPath);
    await database.connect();
  });

  afterEach(async () => {
    await database.close();
    try {
      await fs.unlink(testDbPath);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('should create event_types table with correct structure', async () => {
    const db = database.getConnection();
    
    return new Promise<void>((resolve, reject) => {
      db.get(`
        SELECT sql FROM sqlite_master 
        WHERE type='table' AND name='event_types'
      `, (err, row: any) => {
        if (err) reject(err);
        
        expect(row).toBeDefined();
        expect(row.sql).toContain('id INTEGER PRIMARY KEY');
        expect(row.sql).toContain('code TEXT NOT NULL UNIQUE');
        expect(row.sql).toContain('name TEXT NOT NULL');
        expect(row.sql).toContain('description TEXT');
        resolve();
      });
    });
  });

  test('should insert initial event types', async () => {
    const db = database.getConnection();
    
    return new Promise<void>((resolve, reject) => {
      db.all('SELECT * FROM event_types ORDER BY code', (err, rows: any[]) => {
        if (err) reject(err);
        
        expect(rows).toHaveLength(6);
        
        const expectedTypes = [
          { code: 'create', name: 'Create' },
          { code: 'delete', name: 'Delete' },
          { code: 'find', name: 'Find' },
          { code: 'modify', name: 'Modify' },
          { code: 'move', name: 'Move' },
          { code: 'restore', name: 'Restore' }
        ];
        rows.forEach((row, index) => {
          expect(row.code).toBe(expectedTypes[index].code);
          expect(row.name).toBe(expectedTypes[index].name);
          expect(row.description).toBeDefined();
        });
        
        resolve();
      });
    });
  });

  test('should enforce unique constraint on event type names', async () => {
    const db = database.getConnection();
    
    return new Promise<void>((resolve, reject) => {
      db.run(`
        INSERT INTO event_types (code, name, description) 
        VALUES ('find', 'Duplicate Find', 'Duplicate find type')
      `, (err) => {
        expect(err).toBeDefined();
        expect(err?.message).toContain('UNIQUE constraint failed');
        resolve();
      });
    });
  });

  test('should have correct foreign key relationship with events table', { timeout: 60000 }, async () => {
    const db = database.getConnection();
    
    return new Promise<void>((resolve, reject) => {
      // Insert test file first
      db.run(`
        INSERT INTO files (inode, is_active)
        VALUES (12345, 1)
      `, function(err) {
        if (err) {
          reject(err);
          return;
        }
        
        const fileId = this.lastID;
        
        // Insert test event
        db.run(`
          INSERT INTO events (timestamp, event_type_id, file_id, file_path, file_name, directory)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [Math.floor(Date.now() / 1000), 2, fileId, '/test/file.txt', 'file.txt', '/test'], function(err) {
          if (err) {
            reject(err);
            return;
          }
          
          const eventId = this.lastID;
          
          // Verify we can query event_types for this event
          db.get(`
            SELECT et.code, et.name, et.description 
            FROM events e 
            JOIN event_types et ON e.event_type_id = et.id 
            WHERE e.id = ?
          `, [eventId], (err, row: any) => {
            if (err) reject(err);
            
            expect(row).toBeDefined();
            expect(row.code).toBe('create');
            expect(row.name).toBe('Create');
            expect(row.description).toContain('File creation');
            resolve();
          });
        });
      });
    });
  });

  test('should create measurements table with correct structure', async () => {
    const db = database.getConnection();
    
    return new Promise<void>((resolve, reject) => {
      db.get(`
        SELECT sql FROM sqlite_master 
        WHERE type='table' AND name='measurements'
      `, (err, row: any) => {
        if (err) reject(err);
        
        expect(row).toBeDefined();
        expect(row.sql).toContain('event_id INTEGER PRIMARY KEY');
        expect(row.sql).toContain('inode INTEGER');
        expect(row.sql).toContain('file_size INTEGER');
        expect(row.sql).toContain('line_count INTEGER');
        expect(row.sql).toContain('block_count INTEGER');
        expect(row.sql).toContain('FOREIGN KEY (event_id) REFERENCES events(id)');
        resolve();
      });
    });
  });

  test('should enforce foreign key constraint on measurements.event_id', async () => {
    const db = database.getConnection();
    
    return new Promise<void>((resolve, reject) => {
      // Try to insert measurement with non-existent event_id
      db.run(`
        INSERT INTO measurements (event_id, inode, file_size, line_count, block_count)
        VALUES (99999, 12345, 1024, 100, 8)
      `, (err) => {
        expect(err).toBeDefined();
        expect(err?.message).toContain('FOREIGN KEY constraint failed');
        resolve();
      });
    });
  });

  test('should create FUNC-000 compliant indexes', async () => {
    const db = database.getConnection();
    
    return new Promise<void>((resolve, reject) => {
      db.all(`
        SELECT name FROM sqlite_master 
        WHERE type='index' AND tbl_name IN ('events', 'measurements')
        ORDER BY name
      `, (err, rows: any[]) => {
        if (err) reject(err);
        
        const indexNames = rows.map(row => row.name);
        
        // Check for FUNC-000 compliant indexes
        expect(indexNames).toContain('idx_events_file_timestamp');
        expect(indexNames).toContain('idx_events_timestamp');
        expect(indexNames).toContain('idx_events_file_path');
        expect(indexNames).toContain('idx_events_file_id');
        // Note: idx_measurements_event_id is not created as separate index since event_id is PRIMARY KEY
        
        resolve();
      });
    });
  });
});