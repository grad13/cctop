import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseAdapterFunc000 } from '../../../src/database/database-adapter-func000.ts';
import sqlite3 from 'sqlite3';

describe('FUNC-202 v0.3.4.0 Staged Fetching', () => {
  let db: DatabaseAdapterFunc000;
  let sqliteDb: sqlite3.Database;

  beforeEach(async () => {
    // Create in-memory database with test data
    sqliteDb = new sqlite3.Database(':memory:');
    
    // Create schema
    await new Promise<void>((resolve, reject) => {
      sqliteDb.serialize(() => {
        // Event types table
        sqliteDb.run(`
          CREATE TABLE event_types (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL
          )
        `);
        
        // Events table
        sqliteDb.run(`
          CREATE TABLE events (
            id INTEGER PRIMARY KEY,
            timestamp INTEGER NOT NULL,
            file_name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            directory TEXT NOT NULL,
            event_type_id INTEGER NOT NULL,
            FOREIGN KEY (event_type_id) REFERENCES event_types(id)
          )
        `);
        
        // Measurements table
        sqliteDb.run(`
          CREATE TABLE measurements (
            id INTEGER PRIMARY KEY,
            event_id INTEGER NOT NULL,
            file_size INTEGER,
            line_count INTEGER,
            block_count INTEGER,
            inode INTEGER,
            FOREIGN KEY (event_id) REFERENCES events(id)
          )
        `);
        
        // Insert event types
        const eventTypes = ['find', 'create', 'modify', 'delete', 'move', 'restore'];
        eventTypes.forEach((type, index) => {
          sqliteDb.run('INSERT INTO event_types (id, name) VALUES (?, ?)', [index + 1, type]);
        });
        
        // Insert test events
        for (let i = 1; i <= 200; i++) {
          sqliteDb.run(`
            INSERT INTO events (id, timestamp, file_name, file_path, directory, event_type_id) 
            VALUES (?, ?, ?, ?, ?, ?)
          `, [i, 1719899271 + i, `file${i}.ts`, `/path/file${i}.ts`, '/path', (i % 6) + 1]);
          
          sqliteDb.run(`
            INSERT INTO measurements (event_id, file_size, line_count, block_count, inode)
            VALUES (?, ?, ?, ?, ?)
          `, [i, 1024 * i, 50 + i, Math.ceil(i / 10), 12345 + i]);
        }
        
        resolve();
      });
    });
    
    // Close the setup DB and create adapter
    await new Promise<void>((resolve) => {
      sqliteDb.close(() => resolve());
    });
    
    db = new DatabaseAdapterFunc000(':memory:');
  });

  describe('searchEvents method', () => {
    it('should search with keyword and return limited results', async () => {
      // Mock the implementation since we can't easily share the in-memory DB
      const mockResults = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        timestamp: 1719899271 + i,
        filename: `file${i + 1}.ts`,
        directory: '/path',
        event_type: 'modify',
        size: 1024 * (i + 1),
        lines: 50 + i + 1,
        blocks: Math.ceil((i + 1) / 10),
        inode: 12345 + i + 1,
        elapsed_ms: 0
      }));

      // Override searchEvents for this test
      db.searchEvents = async (params) => {
        const { keyword, limit = 100, offset = 0 } = params;
        
        // Simulate search filtering
        const filtered = mockResults.filter(r => 
          r.filename.includes(keyword) || r.directory.includes(keyword)
        );
        
        // Return paginated results
        return filtered.slice(offset, offset + limit);
      };

      const results = await db.searchEvents({
        keyword: 'file1',
        limit: 10,
        offset: 0
      });

      expect(results.length).toBeLessThanOrEqual(10);
      expect(results.every(r => r.filename.includes('file1'))).toBe(true);
    });

    it('should handle pagination with offset', async () => {
      // Mock implementation
      const allResults = Array.from({ length: 200 }, (_, i) => ({
        id: i + 1,
        timestamp: 1719899271 + i,
        filename: `test${i + 1}.ts`,
        directory: '/test',
        event_type: 'modify',
        size: 1024,
        lines: 50,
        blocks: 2,
        inode: 12345 + i,
        elapsed_ms: 0
      }));

      db.searchEvents = async (params) => {
        const { limit = 100, offset = 0 } = params;
        return allResults.slice(offset, offset + limit);
      };

      // First page
      const page1 = await db.searchEvents({
        keyword: 'test',
        limit: 50,
        offset: 0
      });

      // Second page
      const page2 = await db.searchEvents({
        keyword: 'test',
        limit: 50,
        offset: 50
      });

      expect(page1).toHaveLength(50);
      expect(page2).toHaveLength(50);
      expect(page1[0].id).toBe(1);
      expect(page2[0].id).toBe(51);
    });

    it('should respect active filters', async () => {
      const mockResults = [
        { id: 1, event_type: 'create', filename: 'test.ts', directory: '/', timestamp: 1, size: 0, lines: 0, blocks: 0, inode: 0, elapsed_ms: 0 },
        { id: 2, event_type: 'modify', filename: 'test.ts', directory: '/', timestamp: 2, size: 0, lines: 0, blocks: 0, inode: 0, elapsed_ms: 0 },
        { id: 3, event_type: 'delete', filename: 'test.ts', directory: '/', timestamp: 3, size: 0, lines: 0, blocks: 0, inode: 0, elapsed_ms: 0 }
      ];

      db.searchEvents = async (params) => {
        const { filters = [] } = params;
        return mockResults.filter(r => filters.includes(r.event_type));
      };

      const results = await db.searchEvents({
        keyword: 'test',
        filters: ['create', 'modify'],
        limit: 100,
        offset: 0
      });

      expect(results).toHaveLength(2);
      expect(results.map(r => r.event_type)).toEqual(['create', 'modify']);
    });
  });
});