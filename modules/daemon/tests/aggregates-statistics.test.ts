/**
 * Aggregates Statistics Tests - Main Test Suite
 * Refactored modular test architecture
 */

// Import all test suites
import './suites/basic-aggregates.test';
import './suites/statistics-tests.test';
import './suites/performance-tests.test';
import './suites/edge-cases.test';

/**
 * This file serves as the main entry point for all aggregates statistics tests.
 * Individual test suites are organized in the ./suites/ directory:
 * 
 * - basic-aggregates.test.ts: Core aggregation functionality
 * - statistics-tests.test.ts: Size tracking and global statistics  
 * - performance-tests.test.ts: Load and performance validation
 * - edge-cases.test.ts: Error handling and edge cases
 * 
 * Helper modules are in ./helpers/:
 * - TestHelpers.ts: Common test utilities and environment setup
 * - DatabaseQueries.ts: Database query operations
 * - DaemonManager.ts: Daemon lifecycle management
 */