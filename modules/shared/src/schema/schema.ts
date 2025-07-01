/**
 * Database schema definitions and initialization
 */

import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Read SQL file from schema directory
 */
function readSqlFile(filename: string): string {
  const filepath = join(__dirname, filename);
  return readFileSync(filepath, 'utf8');
}

/**
 * Database schema SQL statements
 */
export const schema = {
  tables: readSqlFile('tables.sql'),
  indexes: readSqlFile('indexes.sql'),
  initialData: readSqlFile('initial-data.sql'),
};

/**
 * Database pragma settings for optimization
 */
export const pragmas = [
  'PRAGMA journal_mode = WAL',           // Enable WAL mode
  'PRAGMA synchronous = NORMAL',         // Balance safety and performance
  'PRAGMA cache_size = -65536',          // 64MB cache
  'PRAGMA temp_store = MEMORY',          // Use memory for temp storage
  'PRAGMA foreign_keys = ON',            // Enable foreign key constraints
];

/**
 * Initialize database schema
 */
export function getInitializationSql(): string[] {
  return [
    ...pragmas,
    schema.tables,
    schema.indexes,
    schema.initialData,
  ];
}