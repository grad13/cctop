/**
 * Progressive Loader Test Suite - Main Entry Point
 * Refactored modular test architecture for maintainability
 */

// Import modular test suites
import './progressive-loader/suites/initialization.test.js';
import './progressive-loader/suites/data-loading.test.js';
import './progressive-loader/suites/error-handling.test.js';
import './progressive-loader/suites/streaming.test.js';
import './progressive-loader/suites/recent-events.test.js';

/**
 * This file serves as the main entry point for all progressive loader tests.
 * Individual test suites are organized in the ./progressive-loader/suites/ directory:
 * 
 * - initialization.test.js: Basic initialization and configuration tests
 * - data-loading.test.js: FUNC-206 progressive data loading functionality
 * - error-handling.test.js: Error scenarios and edge cases
 * - streaming.test.js: Real-time event streaming functionality
 * - recent-events.test.js: Priority loading of recent events for UX
 * 
 * Mock utilities are in ./progressive-loader/mocks/:
 * - MockProgressiveLoader.js: Complete mock implementation
 * - testMocks.js: Common mock objects and utilities
 * 
 * Refactored from 561 lines to modular architecture:
 * - Main file: 25 lines (this file)
 * - 5 focused test suites: ~50-80 lines each
 * - 2 reusable mock modules: ~30-80 lines each
 * - Total: Improved maintainability and readability
 */