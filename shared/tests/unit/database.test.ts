/**
 * Database module unit tests
 */

import { Database } from '../../src/database';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';

describe('Database', () => {
  const testDbPath = join(__dirname, '../fixtures/test.db');
  let db: Database;

  beforeEach(() => {
    // Clean up test database
    if (existsSync(testDbPath)) {
      rmSync(testDbPath);
    }
    db = new Database({ path: testDbPath });
  });

  afterEach(async () => {
    // Close and clean up
    if (db.isConnected()) {
      await db.close();
    }
    if (existsSync(testDbPath)) {
      rmSync(testDbPath);
    }
  });

  describe('connection', () => {
    it('should open connection successfully', async () => {
      await db.open();
      expect(db.isConnected()).toBe(true);
    });

    it('should create database file if not exists', async () => {
      expect(existsSync(testDbPath)).toBe(false);
      await db.open();
      expect(existsSync(testDbPath)).toBe(true);
    });

    it('should close connection successfully', async () => {
      await db.open();
      await db.close();
      expect(db.isConnected()).toBe(false);
    });

    it('should handle multiple open calls gracefully', async () => {
      await db.open();
      await db.open(); // Should not throw
      expect(db.isConnected()).toBe(true);
    });
  });

  describe('initialization', () => {
    it('should initialize schema on first open', async () => {
      await db.open();
      
      // Check if tables exist
      const tables = await db.all<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table'"
      );
      
      const tableNames = tables.map(t => t.name);
      expect(tableNames).toContain('events');
      expect(tableNames).toContain('event_types');
      expect(tableNames).toContain('files');
      expect(tableNames).toContain('measurements');
      expect(tableNames).toContain('aggregates');
    });

    it('should insert initial event types', async () => {
      await db.open();
      
      const eventTypes = await db.all<{ code: string }>(
        'SELECT code FROM event_types ORDER BY code'
      );
      
      const codes = eventTypes.map(t => t.code);
      expect(codes).toEqual(['create', 'delete', 'find', 'modify', 'move', 'restore']);
    });
  });

  describe('queries', () => {
    beforeEach(async () => {
      await db.open();
    });

    it('should execute run successfully', async () => {
      const result = await db.run(
        'INSERT INTO files (inode, is_active) VALUES (?, ?)',
        [12345, true]
      );
      
      expect(result.lastID).toBeDefined();
      expect(result.changes).toBe(1);
    });

    it('should execute get successfully', async () => {
      await db.run(
        'INSERT INTO files (inode, is_active) VALUES (?, ?)',
        [12345, true]
      );
      
      const file = await db.get<{ inode: number }>(
        'SELECT inode FROM files WHERE inode = ?',
        [12345]
      );
      
      expect(file?.inode).toBe(12345);
    });

    it('should execute all successfully', async () => {
      await db.run('INSERT INTO files (inode) VALUES (?)', [111]);
      await db.run('INSERT INTO files (inode) VALUES (?)', [222]);
      
      const files = await db.all<{ inode: number }>(
        'SELECT inode FROM files ORDER BY inode'
      );
      
      expect(files).toHaveLength(2);
      expect(files[0].inode).toBe(111);
      expect(files[1].inode).toBe(222);
    });
  });

  describe('transactions', () => {
    beforeEach(async () => {
      await db.open();
    });

    it('should commit transaction successfully', async () => {
      const result = await db.transaction(async (tx) => {
        await tx.run('INSERT INTO files (inode) VALUES (?)', [123]);
        await tx.run('INSERT INTO files (inode) VALUES (?)', [456]);
        return 'success';
      });
      
      expect(result).toBe('success');
      
      const count = await db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM files'
      );
      expect(count?.count).toBe(2);
    });

    it('should rollback transaction on error', async () => {
      await expect(
        db.transaction(async (tx) => {
          await tx.run('INSERT INTO files (inode) VALUES (?)', [789]);
          throw new Error('Test error');
        })
      ).rejects.toThrow('Transaction failed');
      
      const count = await db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM files'
      );
      expect(count?.count).toBe(0);
    });
  });

  describe('read-only mode', () => {
    it('should open in read-only mode', async () => {
      // First create database
      await db.open();
      await db.close();
      
      // Open in read-only mode
      const readOnlyDb = new Database({ 
        path: testDbPath, 
        readonly: true 
      });
      
      await readOnlyDb.open();
      expect(readOnlyDb.isReadOnly()).toBe(true);
      
      // Should be able to read
      const eventTypes = await readOnlyDb.all('SELECT * FROM event_types');
      expect(eventTypes.length).toBeGreaterThan(0);
      
      await readOnlyDb.close();
    });
  });
});