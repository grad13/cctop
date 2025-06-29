/**
 * Database Types and Interfaces
 * Core type definitions for database management system
 */

import { Database } from 'sqlite3';

// Re-export common types
export {
  EventType,
  FileEventMetadata,
  EventRecord,
  FileRecord,
  AggregateRecord,
  EventTypeRecord,
  MeasurementRecord,
  DatabaseManagerStats,
  QueryResult,
  EventWithDetails
} from '../../types/common';

/**
 * SQLite database instance type
 */
export type SQLiteDatabase = Database;

/**
 * Database configuration
 */
export interface DatabaseConfig {
  path: string;
  enableWAL?: boolean;
  timeout?: number;
  busyTimeout?: number;
  verbose?: boolean;
}

/**
 * Schema definition
 */
export interface SchemaDefinition {
  version: number;
  tables: TableDefinition[];
  indexes: IndexDefinition[];
  views?: ViewDefinition[];
}

/**
 * Table definition
 */
export interface TableDefinition {
  name: string;
  sql: string;
}

/**
 * Index definition
 */
export interface IndexDefinition {
  name: string;
  table: string;
  sql: string;
}

/**
 * View definition
 */
export interface ViewDefinition {
  name: string;
  sql: string;
}

/**
 * Transaction options
 */
export interface TransactionOptions {
  type?: 'DEFERRED' | 'IMMEDIATE' | 'EXCLUSIVE';
  timeout?: number;
  retries?: number;
}

/**
 * Query execution result
 */
export interface QueryExecutionResult {
  changes?: number;
  lastID?: number;
  rows?: any[];
}

/**
 * Database initialization result
 */
export interface InitializationResult {
  success: boolean;
  schemaVersion?: number;
  tablesCreated?: number;
  indexesCreated?: number;
  error?: Error;
}

/**
 * Database operation error
 */
export interface DatabaseError extends Error {
  code?: string;
  errno?: number;
  syscall?: string;
}

/**
 * Schema and initial data interface
 */
export interface DatabaseSchema {
  tables: {
    events: string;
    files: string;
    event_types: string;
    measurements: string;
    aggregates: string;
  };
  indexes: string[];
  triggers?: string[];
}

/**
 * Initial data for database
 */
export interface DatabaseInitialData {
  event_types: Array<{
    code: string;
    name: string;
    description: string;
  }>;
}

/**
 * Database constants
 */
export const DB_CONSTANTS = {
  DEFAULT_TIMEOUT: 5000,
  DEFAULT_BUSY_TIMEOUT: 10000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 100,
  WAL_CHECKPOINT_INTERVAL: 1000,
  DEFAULT_PAGE_SIZE: 4096,
  DEFAULT_CACHE_SIZE: 2000
};