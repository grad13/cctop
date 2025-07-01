/**
 * Database manager with connection pooling and initialization
 */

import { existsSync } from 'fs';
import { dirname } from 'path';
import { mkdirSync } from 'fs';
import { 
  DatabaseOptions,
  DatabaseError,
  DatabaseErrorType,
  Transaction,
  TransactionCallback
} from '../types';
import { SqliteConnection, createConnection } from './connection';
import { getInitializationSql } from '../schema';

/**
 * Database manager
 */
export class Database {
  private connection: SqliteConnection | null = null;
  private options: DatabaseOptions;
  private isInitialized = false;

  constructor(options: DatabaseOptions) {
    this.options = options;
  }

  /**
   * Open database connection
   */
  async open(): Promise<void> {
    if (this.connection) {
      return;
    }

    // Ensure directory exists
    const dir = dirname(this.options.path);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Create connection
    this.connection = await createConnection(this.options);

    // Initialize if needed
    if (!this.options.readonly && !this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Initialize database schema
   */
  private async initialize(): Promise<void> {
    if (!this.connection) {
      throw new DatabaseError(
        DatabaseErrorType.CONNECTION_FAILED,
        'Database not connected'
      );
    }

    try {
      // Execute initialization SQL
      const initSql = getInitializationSql();
      for (const sql of initSql) {
        await this.connection.exec(sql);
      }
      this.isInitialized = true;
    } catch (error) {
      throw new DatabaseError(
        DatabaseErrorType.SCHEMA_INVALID,
        `Failed to initialize database: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
      this.isInitialized = false;
    }
  }

  /**
   * Execute a query
   */
  async run(sql: string, params?: any[]): Promise<any> {
    await this.ensureConnected();
    return this.connection!.run(sql, params);
  }

  /**
   * Get a single row
   */
  async get<T>(sql: string, params?: any[]): Promise<T | undefined> {
    await this.ensureConnected();
    return this.connection!.get<T>(sql, params);
  }

  /**
   * Get all rows
   */
  async all<T>(sql: string, params?: any[]): Promise<T[]> {
    await this.ensureConnected();
    return this.connection!.all<T>(sql, params);
  }

  /**
   * Execute within a transaction
   */
  async transaction<T>(callback: TransactionCallback<T>): Promise<T> {
    await this.ensureConnected();
    
    // Begin transaction
    await this.connection!.run('BEGIN TRANSACTION');

    const tx: Transaction = {
      run: (sql, params) => this.connection!.run(sql, params),
      get: (sql, params) => this.connection!.get(sql, params),
      all: (sql, params) => this.connection!.all(sql, params),
      commit: async () => { await this.connection!.run('COMMIT'); },
      rollback: async () => { await this.connection!.run('ROLLBACK'); },
    };

    try {
      const result = await callback(tx);
      await tx.commit();
      return result;
    } catch (error) {
      await tx.rollback();
      throw new DatabaseError(
        DatabaseErrorType.TRANSACTION_FAILED,
        `Transaction failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Ensure database is connected
   */
  private async ensureConnected(): Promise<void> {
    if (!this.connection) {
      await this.open();
    }
  }

  /**
   * Get database path
   */
  getPath(): string {
    return this.options.path;
  }

  /**
   * Check if database is read-only
   */
  isReadOnly(): boolean {
    return this.options.readonly || false;
  }

  /**
   * Check if database is connected
   */
  isConnected(): boolean {
    return this.connection !== null;
  }
}