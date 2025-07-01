/**
 * Database connection and basic operations
 */

import sqlite3 from 'sqlite3';
import { FileEvent } from './types';

export class Database {
  private db: sqlite3.Database | null = null;

  constructor(private dbPath: string) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) reject(err);
        else {
          // Enable WAL mode for concurrent access
          this.db!.run('PRAGMA journal_mode=WAL', (err) => {
            if (err) reject(err);
            else resolve();
          });
        }
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }

  async insertEvent(event: FileEvent): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }
      
      const sql = `
        INSERT INTO file_events (
          event_type, file_path, directory, filename, 
          file_size, timestamp, inode_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(
        sql, 
        [
          event.eventType,
          event.filePath,
          event.directory,
          event.filename,
          event.fileSize,
          event.timestamp.toISOString(),
          event.inodeNumber
        ],
        (err) => {
          if (err) reject(err);
          else {
            console.log('Event inserted:', event.filename);
            resolve();
          }
        }
      );
    });
  }

  async getRecentEvents(limit: number = 100): Promise<FileEvent[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }
      
      const sql = `
        SELECT * FROM file_events 
        ORDER BY timestamp DESC 
        LIMIT ?
      `;
      
      this.db.all(sql, [limit], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const events: FileEvent[] = rows.map(row => ({
            id: row.id,
            eventType: row.event_type,
            filePath: row.file_path,
            directory: row.directory,
            filename: row.filename,
            fileSize: row.file_size,
            timestamp: new Date(row.timestamp),
            inodeNumber: row.inode_number
          }));
          resolve(events);
        }
      });
    });
  }
}