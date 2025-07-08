/**
 * Schema compatibility tests
 * Tests the column name mapping issues between Database and DatabaseReader
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Database } from '../src/database';
import * as fs from 'fs';
import * as path from 'path';
import sqlite3 from 'sqlite3';

describe('Schema Compatibility Tests', () => {
  const testDbPath = path.join(__dirname, 'test-schema.db');
  let database: Database;

  beforeEach(async () => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    database = new Database(testDbPath);
    await database.connect();
  });

  afterEach(async () => {
    await database.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Column Name Mapping Issues', () => {
    it('should identify actual column names used in events table', async () => {
      // Use raw SQLite to inspect actual schema
      return new Promise<void>((resolve, reject) => {
        const db = new sqlite3.Database(testDbPath, sqlite3.OPEN_READONLY);
        
        db.all("PRAGMA table_info(events)", (err, rows: any[]) => {
          if (err) {
            reject(err);
            return;
          }
          
          const columnNames = rows.map(row => row.name);
          
          // Document current schema
          console.log('Actual events table columns:', columnNames);
          
          // Check for the inconsistency we found
          expect(columnNames).toContain('file_size'); // Database.ts uses this
          expect(columnNames).toContain('inode_number'); // Database.ts uses this
          
          // DatabaseReader.ts expects 'size' and 'inode' but actual schema has 'file_size' and 'inode_number'
          // This is the root cause of the integration issue
          
          db.close();
          resolve();
        });
      });
    });

    it('should demonstrate the column mapping problem', async () => {
      // Insert a test event using Database (which uses correct column names)
      const testEvent = {
        eventType: 'test' as any,
        filePath: '/test.txt',
        directory: '/test',
        filename: 'test.txt',
        fileSize: 1024,
        timestamp: new Date(),
        inodeNumber: 12345
      };

      await database.insertEvent(testEvent);

      // Try to read using raw SQL with DatabaseReader expected column names
      return new Promise<void>((resolve, reject) => {
        const db = new sqlite3.Database(testDbPath, sqlite3.OPEN_READONLY);
        
        // This query uses DatabaseReader's expected column names
        const sqlWithReaderColumns = `
          SELECT 
            id,
            timestamp,
            filename,
            directory,
            event_type,
            size,        -- DatabaseReader expects this
            inode,       -- DatabaseReader expects this
            elapsed_ms
          FROM events 
          ORDER BY timestamp DESC 
          LIMIT 1
        `;

        db.all(sqlWithReaderColumns, (err, rows: any[]) => {
          if (err) {
            // This should fail because 'size' and 'inode' columns don't exist
            expect(err.message).toContain('no such column');
            db.close();
            resolve();
          } else {
            // If this succeeds, the schema is already fixed
            db.close();
            reject(new Error('Expected column mapping error but query succeeded'));
          }
        });
      });
    });

    it('should validate correct column names for DatabaseReader compatibility', async () => {
      // Insert test data
      const testEvent = {
        eventType: 'create' as any,
        filePath: '/test.txt',
        directory: '/test',
        filename: 'test.txt',
        fileSize: 2048,
        timestamp: new Date(),
        inodeNumber: 54321
      };

      await database.insertEvent(testEvent);

      // Query using actual column names (what Database.ts creates)
      return new Promise<void>((resolve, reject) => {
        const db = new sqlite3.Database(testDbPath, sqlite3.OPEN_READONLY);
        
        const sqlWithActualColumns = `
          SELECT 
            id,
            timestamp,
            filename,
            directory,
            event_type,
            file_size,      -- Actual column name
            inode_number,   -- Actual column name
            -- Note: elapsed_ms doesn't exist in Database schema
            0 as elapsed_ms -- DatabaseReader expects this but it's not created
          FROM events 
          ORDER BY timestamp DESC 
          LIMIT 1
        `;

        db.all(sqlWithActualColumns, (err, rows: any[]) => {
          if (err) {
            reject(err);
          } else {
            expect(rows).toHaveLength(1);
            const row = rows[0];
            
            // Verify data integrity
            expect(row.filename).toBe('test.txt');
            expect(row.file_size).toBe(2048);
            expect(row.inode_number).toBe(54321);
            expect(row.elapsed_ms).toBe(0); // Our synthetic column
            
            db.close();
            resolve();
          }
        });
      });
    });
  });

  describe('Missing Column Analysis', () => {
    it('should identify missing columns that DatabaseReader expects', async () => {
      return new Promise<void>((resolve, reject) => {
        const db = new sqlite3.Database(testDbPath, sqlite3.OPEN_READONLY);
        
        db.all("PRAGMA table_info(events)", (err, rows: any[]) => {
          if (err) {
            reject(err);
            return;
          }
          
          const columnNames = rows.map(row => row.name);
          
          // DatabaseReader expects these columns that don't exist:
          expect(columnNames).not.toContain('lines');     // Optional in EventRow
          expect(columnNames).not.toContain('blocks');    // Optional in EventRow
          expect(columnNames).not.toContain('elapsed_ms'); // Required in EventRow
          
          // These are naming mismatches:
          expect(columnNames).not.toContain('size');  // Should be 'file_size'
          expect(columnNames).not.toContain('inode'); // Should be 'inode_number'
          
          db.close();
          resolve();
        });
      });
    });
  });
});