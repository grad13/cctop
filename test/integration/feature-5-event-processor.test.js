/**
 * Feature 5 Event Processor Test Suite - Main Entry Point
 * Refactored modular architecture for chokidar→DB integration testing
 */

// Import modular test suites
require('./feature-5-event-processor/suites/find-events.test.js');
require('./feature-5-event-processor/suites/create-events.test.js');
require('./feature-5-event-processor/suites/modify-events.test.js');
require('./feature-5-event-processor/suites/delete-events.test.js');
require('./feature-5-event-processor/suites/lifecycle-events.test.js');
require('./feature-5-event-processor/suites/data-integrity.test.js');

/**
 * This file serves as the main entry point for all Feature 5 Event Processor tests.
 * Individual test suites are organized in the ./feature-5-event-processor/suites/ directory:
 * 
 * - find-events.test.js: Initial file discovery and scanning functionality
 * - create-events.test.js: File creation detection and processing
 * - modify-events.test.js: File modification detection and processing
 * - delete-events.test.js: File deletion detection and processing
 * - lifecycle-events.test.js: Complete file lifecycle testing
 * - data-integrity.test.js: Chokidar-DB integration integrity verification
 * 
 * Helper utilities are in ./feature-5-event-processor/helpers/:
 * - TestSetup.js: Common setup and teardown logic for integration tests
 * 
 * Refactored from 588 lines to modular architecture:
 * - Main file: 25 lines (this file)
 * - 6 focused test suites: ~50-100 lines each
 * - 1 shared test setup utility: ~80 lines
 * - Total: Improved maintainability, focused testing, and easier debugging
 * 
 * FUNC-002 Compliance:
 * ✅ Chokidar file monitoring integration
 * ✅ Event processing and database recording
 * ✅ File lifecycle event tracking
 * ✅ Data integrity verification
 * ✅ Error handling and edge cases
 */