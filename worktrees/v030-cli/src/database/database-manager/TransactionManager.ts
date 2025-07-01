/**
 * Transaction Manager
 * Handles database transactions with retry logic
 */

import {
  SQLiteDatabase,
  TransactionOptions,
  DatabaseError,
  DB_CONSTANTS
} from './DatabaseTypes';

export class TransactionManager {
  private db: SQLiteDatabase;
  private activeTransaction: boolean = false;
  private transactionDepth: number = 0;

  constructor(db: SQLiteDatabase) {
    this.db = db;
  }

  /**
   * Execute a function within a transaction
   */
  async transaction<T>(
    fn: () => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<T> {
    const {
      type = 'DEFERRED',
      timeout = DB_CONSTANTS.DEFAULT_TIMEOUT,
      retries = DB_CONSTANTS.MAX_RETRIES
    } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this.executeTransaction(fn, type, timeout);
      } catch (error) {
        lastError = error as Error;
        
        // Check if error is retryable
        if (!this.isRetryableError(error as DatabaseError) || attempt === retries) {
          throw error;
        }

        // Wait before retry
        await this.delay(DB_CONSTANTS.RETRY_DELAY * (attempt + 1));
      }
    }

    throw lastError;
  }

  /**
   * Execute transaction with savepoint support
   */
  private async executeTransaction<T>(
    fn: () => Promise<T>,
    type: string,
    timeout: number
  ): Promise<T> {
    // Handle nested transactions with savepoints
    if (this.activeTransaction) {
      return await this.executeSavepoint(fn);
    }

    this.activeTransaction = true;
    this.transactionDepth = 0;

    try {
      // Start transaction
      await this.exec(`BEGIN ${type} TRANSACTION`);

      // Set transaction timeout
      if (timeout > 0) {
        await this.exec(`PRAGMA busy_timeout = ${timeout}`);
      }

      // Execute function
      const result = await fn();

      // Commit transaction
      await this.exec('COMMIT');

      return result;
    } catch (error) {
      // Rollback on error
      try {
        await this.exec('ROLLBACK');
      } catch (rollbackError) {
        // Log rollback error but throw original
        console.error('Rollback failed:', rollbackError);
      }
      throw error;
    } finally {
      this.activeTransaction = false;
      this.transactionDepth = 0;
    }
  }

  /**
   * Execute with savepoint for nested transactions
   */
  private async executeSavepoint<T>(fn: () => Promise<T>): Promise<T> {
    this.transactionDepth++;
    const savepointName = `sp_${this.transactionDepth}_${Date.now()}`;

    try {
      // Create savepoint
      await this.exec(`SAVEPOINT ${savepointName}`);

      // Execute function
      const result = await fn();

      // Release savepoint
      await this.exec(`RELEASE SAVEPOINT ${savepointName}`);

      return result;
    } catch (error) {
      // Rollback to savepoint
      try {
        await this.exec(`ROLLBACK TO SAVEPOINT ${savepointName}`);
      } catch (rollbackError) {
        console.error('Savepoint rollback failed:', rollbackError);
      }
      throw error;
    } finally {
      this.transactionDepth--;
    }
  }

  /**
   * Execute SQL statement
   */
  private exec(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: DatabaseError): boolean {
    if (!error.code) {
      return false;
    }

    // SQLite error codes that are retryable
    const retryableCodes = [
      'SQLITE_BUSY',
      'SQLITE_LOCKED',
      'SQLITE_PROTOCOL'
    ];

    return retryableCodes.includes(error.code);
  }

  /**
   * Delay for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if transaction is active
   */
  isInTransaction(): boolean {
    return this.activeTransaction;
  }

  /**
   * Get current transaction depth
   */
  getTransactionDepth(): number {
    return this.transactionDepth;
  }

  /**
   * Execute multiple statements in a transaction
   */
  async batch(statements: Array<{ sql: string; params?: any[] }>): Promise<void> {
    await this.transaction(async () => {
      for (const { sql, params = [] } of statements) {
        await new Promise<void>((resolve, reject) => {
          this.db.run(sql, params, (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      }
    });
  }

  /**
   * Create a checkpoint (WAL mode)
   */
  async checkpoint(mode: 'PASSIVE' | 'FULL' | 'RESTART' | 'TRUNCATE' = 'PASSIVE'): Promise<void> {
    await this.exec(`PRAGMA wal_checkpoint(${mode})`);
  }
}