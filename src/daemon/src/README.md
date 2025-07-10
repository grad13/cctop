# @cctop/daemon

Real-time file monitoring daemon for cctop - a high-performance file change tracking system with **SQLite Foundation** compliance.

## Overview

The daemon module provides continuous background file monitoring capabilities, tracking file system events (create, modify, delete, move, restore) and persisting them to a SQLite database. It implements **complete compliance** with 5-table normalized architecture for comprehensive file system monitoring with production-ready reliability.

## Features

- **Real-time File Monitoring**: Powered by chokidar for efficient file system watching
- **Complete Database Compliance**: 5-table normalized architecture
  - `events` - Main event records with foreign key relationships
  - `event_types` - Event type definitions (find/create/modify/delete/move/restore)
  - `files` - File metadata with inode tracking
  - `measurements` - Detailed file measurements (size, line count, block count)
  - `aggregates` - Automated statistical summaries
- **6 Event Types**: Comprehensive tracking of file lifecycle
  - `find` - Files discovered during initial scan
  - `create` - New files created during monitoring
  - `modify` - File content or metadata changes
  - `move` - File movement/rename (intelligent detection using inode tracking)
  - `delete` - File removal (with pending state for move detection)
  - `restore` - File restoration within 5 minutes after deletion
- **Measurement Calculation**: Automatic file size, line count, and block count measurement
- **Smart Move Detection**: Detects file moves within 100ms using inode tracking
- **Restore Detection**: Identifies when deleted files reappear within 5 minutes
- **Startup Delete Detection**: Detects files deleted while daemon was offline
- **SQLite WAL Mode**: High-performance concurrent read/write access
- **Automatic Aggregation**: Real-time statistical updates via database triggers
- **Process Management**: PID file management for single instance enforcement
- **Configurable Exclusions**: Flexible pattern-based file/directory exclusion
- **Heartbeat Monitoring**: Regular health check logging (configurable interval)
- **Production Ready**: Comprehensive error handling and graceful shutdown

## Installation

```bash
# Install dependencies
npm install

# Build the daemon
npm run build
```

## Dependencies

**Important**: This daemon module has dependencies on `@cctop/shared` for:
- Type definitions (`DaemonConfig`, `FileEvent`, `DaemonState`)
- Database operations (`Database` class and related operations)

The shared module must be built before running daemon tests:
```bash
# Build shared module first
cd ../shared && npm run build

# Then run daemon tests
cd ../daemon && npm test
```

## Usage

### Command Line Interface (Recommended)

```bash
# Start daemon in the current directory
cctop daemon start

# Stop running daemon
cctop daemon stop

# Check daemon status
cctop daemon status

# Start UI (requires daemon running)
cctop ui
# or just
cctop
```

### Features

- **Duplicate Prevention**: Only one daemon instance per directory
- **Automatic Cleanup**: Stale PID files are cleaned automatically
- **Graceful Shutdown**: SIGTERM with 10-second timeout before SIGKILL
- **Status Monitoring**: Check if daemon is running with detailed info

### Direct Execution

```bash
# Start daemon in standalone mode
npm run daemon

# Or directly with Node.js
node dist/index.js --standalone

# Start from parent process (e.g., CLI)
node dist/index.js  # without --standalone flag
```

### Programmatic Usage

```javascript
// Start daemon from parent process
const { spawn } = require('child_process');

const daemon = spawn('node', ['path/to/daemon/dist/index.js'], {
  stdio: 'pipe',
  detached: false
});

// Handle daemon output
daemon.stdout.on('data', (data) => {
  console.log(`Daemon: ${data}`);
});
```

### Process Management

```bash
# Check if daemon is running
cat .cctop/runtime/daemon.pid

# Stop daemon gracefully (use cctop daemon stop instead)
kill $(cat .cctop/runtime/daemon.pid)

# Force stop all daemon processes
pkill -f "node.*daemon.*standalone"
```

## Configuration

The daemon uses a configuration system:

### Directory Structure

```
.cctop/
├── config/
│   └── daemon-config.json    # Daemon-specific settings
├── data/
│   └── activity.db          # SQLite database with WAL mode
├── logs/
│   └── daemon.log          # Daemon logs with rotation
├── runtime/
│   └── daemon.pid          # Process ID file with metadata
└── temp/                   # Temporary files
```

### Configuration File

#### daemon-config.json
```json
{
  "monitoring": {
    "watchPaths": ["."],
    "excludePatterns": [
      "**/node_modules/**",
      "**/.git/**",
      "**/.*",
      "**/.cctop/**",
      "**/dist/**",
      "**/coverage/**",
      "**/build/**",
      "**/*.log",
      "**/.DS_Store"
    ],
    "debounceMs": 100,
    "maxDepth": 10,
    "moveThresholdMs": 100,
    "systemLimits": {
      "requiredLimit": 524288,
      "checkOnStartup": true,
      "warnIfInsufficient": true
    }
  },
  "daemon": {
    "pidFile": ".cctop/runtime/daemon.pid",
    "logFile": ".cctop/logs/daemon.log",
    "logLevel": "info",
    "heartbeatInterval": 30000,
    "autoStart": true,
    "maxRestarts": 3,
    "restartDelay": 5000
  },
  "database": {
    "writeMode": "WAL",
    "syncMode": "NORMAL",
    "cacheSize": 65536,
    "busyTimeout": 5000,
    "checkpointInterval": 300000
  }
}
```

### Configuration Loading Order

1. Default configuration (built-in)
2. daemon-config.json (if exists)
3. Command-line arguments (highest priority)

## Database Schema (Standard Compliant)

The daemon writes to an SQLite database with the following **normalized 5-table structure**:

### 1. event_types table
```sql
CREATE TABLE event_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,     -- find/create/modify/delete/move/restore
  name TEXT NOT NULL,
  description TEXT
);
```

### 2. files table
```sql
CREATE TABLE files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inode INTEGER,                 -- File system inode number
  is_active BOOLEAN DEFAULT TRUE
);
```

### 3. events table (Main event records)
```sql
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,    -- Unix timestamp
  event_type_id INTEGER NOT NULL,
  file_id INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  directory TEXT NOT NULL,
  FOREIGN KEY (event_type_id) REFERENCES event_types(id),
  FOREIGN KEY (file_id) REFERENCES files(id)
);
```

### 4. measurements table
```sql
CREATE TABLE measurements (
  event_id INTEGER PRIMARY KEY,
  inode INTEGER,                 -- File inode at measurement time
  file_size INTEGER,             -- File size in bytes
  line_count INTEGER,            -- Number of lines (text files)
  block_count INTEGER,           -- File system blocks
  FOREIGN KEY (event_id) REFERENCES events(id)
);
```

### 5. aggregates table (Auto-updated by triggers)
```sql
CREATE TABLE aggregates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id INTEGER UNIQUE NOT NULL,
  total_events INTEGER DEFAULT 0,
  total_creates INTEGER DEFAULT 0,
  total_modifies INTEGER DEFAULT 0,
  total_deletes INTEGER DEFAULT 0,
  total_moves INTEGER DEFAULT 0,
  total_restores INTEGER DEFAULT 0,
  total_finds INTEGER DEFAULT 0,
  first_event_timestamp INTEGER,
  last_event_timestamp INTEGER,
  first_size INTEGER,
  last_size INTEGER,
  max_size INTEGER DEFAULT 0,
  dominant_event_type TEXT,
  last_event_type_id INTEGER,
  FOREIGN KEY (file_id) REFERENCES files(id),
  FOREIGN KEY (last_event_type_id) REFERENCES event_types(id)
);
```

### Key Database Features
- **Foreign Key Relationships**: Normalized data integrity
- **Automatic Indexing**: Performance-optimized queries
- **Trigger-based Aggregation**: Real-time statistical updates
- **WAL Mode**: Concurrent read/write access
- **Measurement Integration**: Detailed file analysis

## Architecture

```
DaemonManager
├── ConfigManager             # 3-layer configuration management
├── LogManager               # Structured logging with rotation
├── PidManager               # Process ID file management
├── SignalHandler            # Signal handling (SIGTERM/SIGINT)
├── FileEventHandler         # Event processing core
│   ├── MoveDetector        # Move detection logic
│   └── MeasurementCalculator # File measurement calculation
└── Database                 # SQLite with WAL mode
    ├── SchemaManager        # 5-table schema initialization
    ├── EventOperations      # Event CRUD operations
    ├── MeasurementOperations # Measurement handling
    ├── AggregateOperations  # Statistical queries
    └── TriggerManager       # Automatic aggregation triggers
```

### Event Processing Flow

1. **File System Event** → chokidar detects change
2. **Event Handler** → FileEventHandler processes event
3. **Move Detection** → MoveDetector checks for move patterns using inode tracking
4. **Measurement Calculation** → MeasurementCalculator computes file metrics
5. **Database Write** → Event + measurement persisted to normalized tables
6. **Trigger Execution** → Automatic aggregation updates via SQL triggers
7. **Startup Delete Detection** → Detects files deleted while daemon offline

## Development

### Running Tests

```bash
# Run unit tests only (fast) - 52 tests
npm run test:unit

# Run integration tests in parts (comprehensive coverage)
npm run test:integration:1  # basic-aggregates, daemon, edge-cases (16 tests)
npm run test:integration:2  # find-detection, move-detection (16 tests)  
npm run test:integration:3  # restore-detection, startup-delete, statistics (18 tests)
npm run test:integration:4  # measurement integration (11 tests + 1 skip)

# Run E2E tests (production scenarios) - 4 tests
npm run test:e2e

# All tests summary:
# - Unit: 52/52 (100%)
# - Integration: 58/59 (98.3% - 1 intentional skip)
# - E2E: 4/4 (100%)
# - Total: 114/115 (99.1%)

# Run specific test file
npm test tests/unit/duplicate-prevention.test.ts

# Watch mode for development
npm run test:watch

# Note: npm test and npm run test:integration are disabled due to timeout issues
```

### Test Architecture

The test suite uses a comprehensive `DaemonTestManager` for reliable process management:

```javascript
// Test helper usage example
import { DaemonTestManager, setupDaemonTest, teardownDaemonTest } from './test-helpers';

beforeEach(async () => {
  await setupDaemonTest(testDir);
});

afterEach(async () => {
  await teardownDaemonTest(daemon, testDir);
});
```

### Building

```bash
# Clean and rebuild
npm run clean
npm run build

# Watch mode for development
npm run build:watch
```

### Project Structure

```
modules/daemon/
├── src/
│   ├── config/           # Configuration management
│   │   └── DaemonConfig.ts
│   ├── events/           # Event processing
│   │   ├── FileEventHandler.ts
│   │   └── MoveDetector.ts
│   ├── logging/          # Logging system
│   │   └── LogManager.ts
│   ├── system/           # System utilities
│   │   ├── PidManager.ts
│   │   └── SignalHandler.ts
│   └── index.ts          # Main entry point
├── tests/
│   ├── suites/           # Test suites
│   │   ├── basic-aggregates.test.ts
│   │   ├── edge-cases.test.ts
│   │   └── statistics-tests.test.ts
│   ├── daemon.test.ts
│   ├── find-detection.test.ts
│   ├── move-detection.test.ts
│   ├── restore-detection.test.ts
│   └── test-helpers.ts   # Shared test utilities
├── dist/                 # Compiled output
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Performance Characteristics

- **Low CPU Usage**: Event-driven architecture with minimal polling
- **Memory Efficient**: Streaming event processing without buffering
- **Fast Startup**: < 1 second initialization time
- **Concurrent Access**: SQLite WAL mode enables parallel read/write
- **Scalable**: Tested with thousands of files and high-frequency changes
- **Single Instance**: Automatic duplicate daemon prevention per directory

### Resource Usage

- **CPU**: < 1% idle, < 5% during active monitoring
- **Memory**: ~50MB base, scales with file count
- **Disk I/O**: Optimized batch writes with WAL mode
- **File Descriptors**: Efficient inotify usage on Linux

## Error Handling

### Graceful Shutdown
- Proper cleanup on SIGTERM/SIGINT signals
- Pending event flushing before exit
- Database connection cleanup
- PID file removal

### Automatic Recovery
- File watcher restart on errors
- Database reconnection with exponential backoff
- Corrupted state detection and recovery
- Stale PID file cleanup

### Comprehensive Logging
- Structured JSON logging
- Configurable log levels (debug/info/warn/error)
- Automatic log rotation
- Error stack traces

## Troubleshooting

### Common Issues

1. **Daemon won't start**
   ```bash
   # Check for existing daemon
   cctop daemon status
   
   # If daemon shows as not running but start fails:
   cctop daemon stop  # This will clean up stale PID files
   cctop daemon start
   
   # Manual cleanup if needed
   rm .cctop/runtime/daemon.pid
   ```

2. **High CPU usage**
   - Check exclude patterns in daemon-config.json
   - Verify not monitoring node_modules or .git
   - Increase debounceMs for high-frequency changes

3. **Database locked errors**
   - Ensure only one daemon instance is running
   - Check file permissions on .cctop/data/
   - Verify WAL mode is enabled

4. **Missing events**
   - Check log file for errors
   - Verify watch paths in configuration
   - Ensure file system limits are adequate

### Debug Mode

```bash
# Enable debug logging
export DEBUG=cctop:*
npm run daemon

# Monitor logs in real-time
tail -f .cctop/logs/daemon.log | jq '.'
```

## API Reference

### Command Line Arguments

- `--standalone`: Run as independent background process
- `--config <path>`: Custom configuration file path
- `--debug`: Enable debug logging
- `--version`: Show version information

### Environment Variables

- `CCTOP_CONFIG_PATH`: Override default config directory
- `CCTOP_LOG_LEVEL`: Set log level (debug/info/warn/error)
- `DEBUG`: Enable debug output (e.g., `DEBUG=cctop:*`)

## Contributing

See the main project CONTRIBUTING.md for guidelines.

## License

MIT License - see the project root LICENSE file for details.