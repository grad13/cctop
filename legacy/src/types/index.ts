/**
 * Type Definitions Index
 * Re-exports all type definitions for backward compatibility
 */

// Export all event types
export * from './event.types';

// Export all database types (except DatabaseConfig which is in config.types)
export {
  DatabaseConnection,
  DatabaseManager,
  TimeStats,
  DatabaseStatistics,
  AggregateData,
  TableColumnInfo,
  EventRecord,
  SchemaVersion,
  Migration,
  QueryResult,
  InotifyLimitResult,
  FileRecord,
  AggregateRecord,
  EventTypeRecord,
  MeasurementRecord,
  DatabaseManagerStats,
  EventWithDetails,
} from './database.types';

// Export all config types
export * from './config.types';

// Export all UI types
export * from './ui.types';

// Export all process types
export * from './process.types';

// Export all interactive types
export * from './interactive.types';

// Export all utility types
export * from './utility.types';