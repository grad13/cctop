/**
 * Connection Manager
 * Handles database connection, initialization, and configuration
 */

import sqlite3 = require('sqlite3');
import * as fs from 'fs';
import * as path from 'path';
import {
  SQLiteDatabase,
  DatabaseConfig,
  DatabaseError,
  InitializationResult,
  DB_CONSTANTS
} from './DatabaseTypes';

export class ConnectionManager {
  private dbPath: string;
  private db: SQLiteDatabase | null = null;
  private config: DatabaseConfig;
  private isConnected: boolean = false;

  constructor(config: DatabaseConfig) {
    this.config = {
      enableWAL: true,
      timeout: DB_CONSTANTS.DEFAULT_TIMEOUT,
      busyTimeout: DB_CONSTANTS.DEFAULT_BUSY_TIMEOUT,
      verbose: false,
      ...config
    };
    this.dbPath = config.path;
  }

  /**
   * Open database connection
   */
  async connect(): Promise<SQLiteDatabase> {
    if (this.db && this.isConnected) {
      return this.db;
    }

    try {
      // Ensure directory exists
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Create database connection
      this.db = await this.createConnection();
      
      // Configure database
      await this.configureDatabase();
      
      this.isConnected = true;
      return this.db;
    } catch (error) {
      throw this.wrapError(error as Error, 'Failed to connect to database');
    }
  }

  /**
   * Create SQLite connection
   */
  private createConnection(): Promise<SQLiteDatabase> {
    return new Promise((resolve, reject) => {
      const sqlite = this.config.verbose ? sqlite3.verbose() : sqlite3;
      const db = new sqlite.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(db);
        }
      });
    });
  }

  /**
   * Configure database settings
   */
  private async configureDatabase(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    // Set busy timeout
    await this.runQuery(`PRAGMA busy_timeout = ${this.config.busyTimeout}`);

    // Enable WAL mode if configured
    if (this.config.enableWAL) {
      await this.runQuery('PRAGMA journal_mode=WAL');
      await this.runQuery('PRAGMA synchronous=NORMAL');
    }

    // Set other pragmas for performance
    await this.runQuery(`PRAGMA page_size = ${DB_CONSTANTS.DEFAULT_PAGE_SIZE}`);
    await this.runQuery(`PRAGMA cache_size = ${DB_CONSTANTS.DEFAULT_CACHE_SIZE}`);
    await this.runQuery('PRAGMA temp_store = MEMORY');
    await this.runQuery('PRAGMA mmap_size = 30000000000');
  }

  /**
   * Execute a query that doesn't return results
   */
  private runQuery(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      this.db.run(sql, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (!this.db || !this.isConnected) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.db!.close((err) => {
        if (err) {
          reject(this.wrapError(err, 'Failed to close database'));
        } else {
          this.db = null;
          this.isConnected = false;
          resolve();
        }
      });
    });
  }

  /**
   * Check if connected
   */
  isConnectionActive(): boolean {
    return this.isConnected && this.db !== null;
  }

  /**
   * Get database instance
   */
  getDatabase(): SQLiteDatabase {
    if (!this.db || !this.isConnected) {
      throw new Error('Database not connected');
    }
    return this.db;
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.db) {
      return false;
    }

    try {
      await new Promise<void>((resolve, reject) => {
        this.db!.get('SELECT 1', (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wrap error with context
   */
  private wrapError(error: Error, context: string): DatabaseError {
    const dbError = error as DatabaseError;
    dbError.message = `${context}: ${error.message}`;
    return dbError;
  }

  /**
   * Get connection statistics
   */
  async getConnectionStats(): Promise<Record<string, any>> {
    if (!this.db) {
      return { connected: false };
    }

    const stats: Record<string, any> = {
      connected: true,
      path: this.dbPath,
      walEnabled: this.config.enableWAL
    };

    try {
      // Get pragma values
      const pragmas = ['page_size', 'cache_size', 'journal_mode', 'synchronous'];
      for (const pragma of pragmas) {
        const result = await new Promise<any>((resolve, reject) => {
          this.db!.get(`PRAGMA ${pragma}`, (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
        stats[pragma] = result ? result[pragma] : null;
      }
    } catch (error) {
      // Ignore pragma errors
    }

    return stats;
  }
}