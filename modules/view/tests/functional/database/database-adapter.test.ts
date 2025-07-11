/**
 * FUNC-000: SQLite Database Foundation - DatabaseAdapter Tests (Suite)
 * Comprehensive test suite split into focused test modules
 * 
 * Test modules:
 * - database-connection.test.ts: Connection management tests
 * - database-schema-validation.test.ts: FUNC-000 schema compliance tests  
 * - database-event-retrieval.test.ts: Event data querying tests
 */

// This file serves as the main test suite entry point
// Individual test modules are split for better maintainability
import './database-connection.test.ts';
import './database-schema-validation.test.ts';
import './database-event-retrieval.test.ts';