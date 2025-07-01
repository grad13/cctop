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
    // TODO: Implement insert
    console.log('Insert event:', event);
  }

  async getRecentEvents(limit: number = 100): Promise<FileEvent[]> {
    // TODO: Implement query
    return [];
  }
}