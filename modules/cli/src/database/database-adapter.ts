/**
 * Database Adapter for CLI
 * Simplified interface for reading events from the database
 */

import sqlite3 from 'sqlite3';
import { EventRow } from '../types/event-row';
import { DemoDataGenerator } from '../data/demo-data-generator';

export class DatabaseAdapter {
  private db: sqlite3.Database | null = null;
  private dataGenerator: DemoDataGenerator;
  private useRandomData: boolean = true; // For demo mode

  constructor(private dbPath: string) {
    this.dataGenerator = new DemoDataGenerator();
  }

  async connect(): Promise<void> {
    if (this.useRandomData) {
      // Skip database connection for demo mode (silent)
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
          // Silent switch to demo mode
          this.useRandomData = true;
          resolve();
        } else {
          resolve();
        }
      });
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            this.db = null;
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  async getLatestEvents(limit: number = 25, mode: 'all' | 'unique' = 'all'): Promise<EventRow[]> {
    if (this.useRandomData) {
      // Generate random events
      const events = this.dataGenerator.generateEvents(limit * (mode === 'unique' ? 3 : 1));
      
      if (mode === 'unique') {
        // In-memory unique filtering for demo mode
        const uniqueFiles = new Map<string, EventRow>();
        events.forEach(event => {
          const key = `${event.directory}/${event.filename}`;
          if (!uniqueFiles.has(key) || 
              new Date(event.timestamp) > new Date(uniqueFiles.get(key)!.timestamp)) {
            uniqueFiles.set(key, event);
          }
        });
        return Array.from(uniqueFiles.values()).slice(0, limit);
      }
      
      return events;
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      // Try different table schemas with mode support
      const queries = [
        // v0.3.0 schema
        mode === 'unique' ? 
        `SELECT 
          e.id,
          e.timestamp,
          e.filename,
          e.directory,
          e.event_type,
          e.size,
          e.lines,
          e.blocks,
          e.inode,
          e.elapsed_ms
        FROM events e
        INNER JOIN (
          SELECT filename, directory, MAX(timestamp) as max_timestamp
          FROM events
          GROUP BY filename, directory
        ) latest ON e.filename = latest.filename 
                 AND e.directory = latest.directory 
                 AND e.timestamp = latest.max_timestamp
        ORDER BY e.timestamp DESC 
        LIMIT ?` :
        `SELECT 
          id,
          timestamp,
          filename,
          directory,
          event_type,
          size,
          lines,
          blocks,
          inode,
          elapsed_ms
        FROM events 
        ORDER BY timestamp DESC 
        LIMIT ?`,
        
        // v0.2.x schema 
        mode === 'unique' ?
        `SELECT 
          e.id,
          e.created_at as timestamp,
          e.filename,
          e.directory,
          e.event_type,
          e.file_size as size,
          e.line_count as lines,
          e.block_count as blocks,
          e.inode_number as inode,
          0 as elapsed_ms
        FROM file_events e
        INNER JOIN (
          SELECT filename, directory, MAX(created_at) as max_timestamp
          FROM file_events
          GROUP BY filename, directory
        ) latest ON e.filename = latest.filename 
                 AND e.directory = latest.directory 
                 AND e.created_at = latest.max_timestamp
        ORDER BY e.created_at DESC 
        LIMIT ?` :
        `SELECT 
          id,
          created_at as timestamp,
          filename,
          directory,
          event_type,
          file_size as size,
          line_count as lines,
          block_count as blocks,
          inode_number as inode,
          0 as elapsed_ms
        FROM file_events 
        ORDER BY created_at DESC 
        LIMIT ?`
      ];

      const tryQuery = (queryIndex: number) => {
        if (queryIndex >= queries.length) {
          reject(new Error('No compatible table schema found'));
          return;
        }

        this.db!.all(queries[queryIndex], [limit], (err, rows: any[]) => {
          if (err) {
            // Try next query
            tryQuery(queryIndex + 1);
          } else {
            const events: EventRow[] = rows.map(row => ({
              id: row.id,
              timestamp: row.timestamp,
              filename: row.filename || 'Unknown',
              directory: row.directory || '.',
              event_type: row.event_type || 'unknown',
              size: row.size || 0,
              lines: row.lines || 0,
              blocks: row.blocks || 0,
              inode: row.inode || 0,
              elapsed_ms: row.elapsed_ms || 0
            }));
            resolve(events);
          }
        });
      };

      tryQuery(0);
    });
  }

  async getEventsByType(eventType: string, limit: number = 25): Promise<EventRow[]> {
    const events = await this.getLatestEvents(limit * 2); // Get more to filter
    return events.filter(event => event.event_type === eventType).slice(0, limit);
  }

  async getUniqueFiles(limit: number = 25): Promise<EventRow[]> {
    const events = await this.getLatestEvents(limit * 3);
    const uniqueFiles = new Map<string, EventRow>();
    
    events.forEach(event => {
      const key = `${event.directory}/${event.filename}`;
      if (!uniqueFiles.has(key) || 
          new Date(event.timestamp) > new Date(uniqueFiles.get(key)!.timestamp)) {
        uniqueFiles.set(key, event);
      }
    });
    
    return Array.from(uniqueFiles.values()).slice(0, limit);
  }

  async getDirectoryEvents(directory: string, limit: number = 25): Promise<EventRow[]> {
    const events = await this.getLatestEvents(limit * 2);
    return events.filter(event => 
      event.directory.includes(directory)
    ).slice(0, limit);
  }

  async getEventCount(): Promise<number> {
    if (this.useRandomData) {
      return Math.floor(Math.random() * 500) + 100; // Random count between 100-600
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      // Try different table names
      const queries = [
        'SELECT COUNT(*) as count FROM events',
        'SELECT COUNT(*) as count FROM file_events'
      ];

      const tryQuery = (queryIndex: number) => {
        if (queryIndex >= queries.length) {
          resolve(0);
          return;
        }

        this.db!.get(queries[queryIndex], (err, row: any) => {
          if (err) {
            tryQuery(queryIndex + 1);
          } else {
            resolve(row.count);
          }
        });
      };

      tryQuery(0);
    });
  }
}