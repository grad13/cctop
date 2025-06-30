/**
 * SQLite database connection management
 */

import sqlite3 from 'sqlite3';
import { 
  DatabaseOptions, 
  DatabaseConnection, 
  QueryResult,
  DatabaseError,
  DatabaseErrorType 
} from '../types';
import { runAsync, getAsync, allAsync, closeAsync } from './helpers';

/**
 * SQLite database connection wrapper
 */
export class SqliteConnection implements DatabaseConnection {
  private db: sqlite3.Database;
  public readonly path: string;
  public readonly isReadOnly: boolean;

  constructor(db: sqlite3.Database, options: DatabaseOptions) {
    this.db = db;
    this.path = options.path;
    this.isReadOnly = options.readonly || false;
  }

  /**
   * Execute a SQL statement
   */
  async run(sql: string, params?: any[]): Promise<QueryResult> {
    try {
      const result = await runAsync(this.db, sql, params);
      return {
        rows: [],
        changes: result.changes,
        lastID: result.lastID,
      };
    } catch (error) {
      throw new DatabaseError(
        DatabaseErrorType.QUERY_FAILED,
        `Query execution failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Get a single row
   */
  async get<T>(sql: string, params?: any[]): Promise<T | undefined> {
    try {
      return await getAsync(this.db, sql, params);
    } catch (error) {
      throw new DatabaseError(
        DatabaseErrorType.QUERY_FAILED,
        `Query execution failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Get all rows
   */
  async all<T>(sql: string, params?: any[]): Promise<T[]> {
    try {
      return await allAsync(this.db, sql, params);
    } catch (error) {
      throw new DatabaseError(
        DatabaseErrorType.QUERY_FAILED,
        `Query execution failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Execute multiple SQL statements
   */
  async exec(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, (error) => {
        if (error) {
          reject(new DatabaseError(
            DatabaseErrorType.QUERY_FAILED,
            `Exec failed: ${error.message}`,
            error
          ));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    try {
      await closeAsync(this.db);
    } catch (error) {
      throw new DatabaseError(
        DatabaseErrorType.CONNECTION_FAILED,
        `Failed to close database: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Get the underlying sqlite3 database instance
   */
  getDatabase(): sqlite3.Database {
    return this.db;
  }
}

/**
 * Create a new database connection
 */
export async function createConnection(options: DatabaseOptions): Promise<SqliteConnection> {
  return new Promise((resolve, reject) => {
    const mode = options.readonly 
      ? sqlite3.OPEN_READONLY 
      : sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE;

    const db = new sqlite3.Database(options.path, mode, (error) => {
      if (error) {
        reject(new DatabaseError(
          DatabaseErrorType.CONNECTION_FAILED,
          `Failed to open database: ${error.message}`,
          error
        ));
      } else {
        if (options.verbose) {
          sqlite3.verbose();
        }
        resolve(new SqliteConnection(db, options));
      }
    });
  });
}