/**
 * Database module exports
 */

export { Database } from './database';
export { SqliteConnection, createConnection } from './connection';

// Re-export types
export type { 
  DatabaseOptions,
  DatabaseConnection,
  QueryResult,
  Transaction,
  TransactionCallback 
} from '../types';

// Re-export error types
export { DatabaseError, DatabaseErrorType } from '../types';