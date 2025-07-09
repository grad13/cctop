/**
 * Database Connection Management
 */

import sqlite3 from 'sqlite3';

export class DatabaseConnection {
  private db: sqlite3.Database | null = null;

  constructor(private dbPath: string) {}

  async connect(): Promise<sqlite3.Database> {
    return new Promise((resolve, reject) => {
      const fs = require('fs');
      const path = require('path');
      const dbDir = path.dirname(this.dbPath);
      
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      
      this.db = new sqlite3.Database(this.dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
        if (err) reject(err);
        else {
          // Enable serialized mode to prevent transaction conflicts
          this.db!.serialize(() => {
            this.db!.run('PRAGMA journal_mode=WAL', (err) => {
              if (err) reject(err);
            });
            this.db!.run('PRAGMA foreign_keys=ON', (err) => {
              if (err) reject(err);
              else resolve(this.db!);
            });
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
          else {
            this.db = null;
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  getConnection(): sqlite3.Database | null {
    return this.db;
  }

  isConnected(): boolean {
    return this.db !== null;
  }
}