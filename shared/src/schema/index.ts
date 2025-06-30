/**
 * Database schema module exports
 */

export { schema, pragmas, getInitializationSql } from './schema';

// Re-export schema as string constants for direct access
export { schema as dbSchema } from './schema';