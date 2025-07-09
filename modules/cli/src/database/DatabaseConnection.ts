/**
 * Database Connection Management
 * Handles database connections and basic operations
 */

import sqlite3 from 'sqlite3';

export class DatabaseConnection {
  private db: sqlite3.Database | null = null;
  private useRandomData: boolean = false;

  constructor(private dbPath: string) {}

  async connect(): Promise<void> {
    if (this.useRandomData) {
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
        if (err) {
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

  async close(): Promise<void> {
    return this.disconnect();
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    if (this.useRandomData || !this.db) {
      throw new Error('Database not available - using random data mode');
    }

    return new Promise((resolve, reject) => {
      this.db!.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  getDatabase(): sqlite3.Database | null {
    return this.isConnected() ? this.db : null;
  }

  isUsingRandomData(): boolean {
    return this.useRandomData;
  }

  setRandomDataMode(enabled: boolean): void {
    this.useRandomData = enabled;
  }

  isConnected(): boolean {
    return this.db !== null && !this.useRandomData;
  }
}