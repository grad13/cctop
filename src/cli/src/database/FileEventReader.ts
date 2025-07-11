import sqlite3 from 'sqlite3';

/**
 * File Event Reader
 * Basic database connection and simple read operations for file events
 */
export class FileEventReader {
  private db: sqlite3.Database | null = null;

  constructor(private dbPath: string) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
          reject(err);
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
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  async getLatestEvents(limit: number = 50, mode: 'all' | 'unique' = 'all', offset: number = 0, filters?: string[]): Promise<any[]> {
    // Delegate to EventQueryAdapter for complex queries
    const { EventQueryAdapter } = await import('./EventQueryAdapter');
    const adapter = new EventQueryAdapter(this.dbPath);
    await adapter.connect();
    try {
      return await adapter.getLatestEvents(limit, mode, offset, filters);
    } finally {
      await adapter.disconnect();
    }
  }

  async searchEvents(params: {
    keyword: string;
    filters?: string[];
    mode?: 'all' | 'unique';
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    // Delegate to EventQueryAdapter for search operations
    const { EventQueryAdapter } = await import('./EventQueryAdapter');
    const adapter = new EventQueryAdapter(this.dbPath);
    await adapter.connect();
    try {
      return await adapter.searchEvents(params);
    } finally {
      await adapter.disconnect();
    }
  }
}