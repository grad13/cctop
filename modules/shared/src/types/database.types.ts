/**
 * Database-related type definitions
 */

/**
 * Database connection options
 */
export interface DatabaseOptions {
  path: string;
  readonly?: boolean;
  verbose?: boolean;
}

/**
 * Database connection instance
 */
export interface DatabaseConnection {
  path: string;
  isReadOnly: boolean;
  close(): Promise<void>;
}

/**
 * Query result
 */
export interface QueryResult<T = any> {
  rows: T[];
  changes?: number;
  lastID?: number;
}

/**
 * Transaction callback
 */
export type TransactionCallback<T> = (tx: Transaction) => Promise<T>;

/**
 * Transaction interface
 */
export interface Transaction {
  run(sql: string, params?: any[]): Promise<QueryResult<any>>;
  get<T>(sql: string, params?: any[]): Promise<T | undefined>;
  all<T>(sql: string, params?: any[]): Promise<T[]>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

/**
 * Database error types
 */
export enum DatabaseErrorType {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  QUERY_FAILED = 'QUERY_FAILED',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  SCHEMA_INVALID = 'SCHEMA_INVALID',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
}

/**
 * Database error
 */
export class DatabaseError extends Error {
  constructor(
    public type: DatabaseErrorType,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}