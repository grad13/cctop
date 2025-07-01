# @cctop/daemon

Background file monitoring service for cctop (v0.3.0)

## Overview

The daemon module provides real-time file system monitoring as a background service. It tracks file lifecycle events (find, create, modify, move, delete, restore) and stores them in a SQLite database using WAL mode for concurrent access.

## Features

- **Real-time File Monitoring**: Uses chokidar for high-performance file system watching
- **6 Event Types**: Comprehensive tracking of file lifecycle
  - `find` - Files discovered during initial scan
  - `create` - New files created during monitoring
  - `modify` - File content or metadata changes
  - `move` - File movement/rename (unlink→add within 100ms)
  - `delete` - File removal or move outside monitoring scope
  - `restore` - File restoration within 5 minutes after deletion
- **Move Detection**: Intelligent detection using inode tracking and timing
- **Restore Detection**: Automatic file restoration detection with configurable timeout
- **Process Management**: PID file, signal handling, graceful shutdown
- **Logging**: Structured logging with configurable levels

## Architecture

```
File System Events
        ↓
   chokidar watcher
        ↓
   FileEventHandler
        ↓
   Event Processing
   (Move/Restore Detection)
        ↓
   Database Writer
        ↓
   SQLite (WAL mode)
```

### Key Components

- **`index.ts`** - Main daemon entry point and orchestration
- **`events/FileEventHandler.ts`** - Core event processing logic
- **`events/MoveDetector.ts`** - Move operation detection
- **`logging/LogManager.ts`** - Structured logging system
- **`system/PidManager.ts`** - Process management
- **`system/SignalHandler.ts`** - Signal handling and graceful shutdown
- **`config/DaemonConfig.ts`** - Configuration management

## Installation

```bash
# Install dependencies
npm install

# Build the daemon
npm run build
```

## Usage

### Start Daemon

```bash
# Start as background service
npm run daemon &

# Or direct execution
node dist/index.js --standalone &

# Or via workspace
npm run daemon --workspace=@cctop/daemon
```

### Stop Daemon

```bash
# Using PID file
kill $(cat .cctop/daemon.pid)

# Or find and kill
pkill -f "cctop-daemon"
```

### Configuration

The daemon creates a `.cctop/` directory with:

```
.cctop/
├── data/
│   └── activity.db      # SQLite database (WAL mode)
├── logs/
│   └── daemon.log       # Daemon logs
└── daemon.pid           # Process ID file
```

## Event Detection Logic

### Move Detection (FUNC-001 Compliant)

1. **unlink** event triggers pending unlink storage
2. **add** event within 100ms with same inode → **move**
3. Timeout after 100ms → **delete** + **create**

### Restore Detection (FUNC-001 Compliant)

1. **add** event for previously deleted file path
2. Within 5 minutes of deletion → **restore**
3. After 5 minutes → **create**

### Initial Scan vs Real-time

- **Initial scan** (before chokidar 'ready') → **find** events
- **Real-time monitoring** (after 'ready') → **create** events

## Development

### Build

```bash
npm run build
```

### Test

```bash
# Run all tests
npm test

# Run specific test
npm test tests/daemon.test.ts

# Run with coverage
npm run test:coverage
```

### Debug

```bash
# Start with debug logging
DEBUG=cctop:* npm run daemon

# Monitor daemon logs
tail -f .cctop/logs/daemon.log

# Check daemon status
ps aux | grep cctop-daemon
cat .cctop/daemon.pid
```

### Key Test Files

- **`daemon.test.ts`** - Basic daemon functionality
- **`move-detection.test.ts`** - Move operation detection
- **`find-detection.test.ts`** - Initial scan behavior
- **`restore-detection.test.ts`** - File restoration detection
- **`test-helpers.ts`** - Shared test utilities with process management

## Process Management

The daemon includes comprehensive process management:

- **PID File**: `.cctop/daemon.pid` with metadata
- **Signal Handling**: Graceful shutdown on SIGTERM/SIGINT
- **Resource Cleanup**: Proper cleanup of watchers and database connections
- **Auto-restart**: Detection of stale PID files

## Error Handling

- **File Access Errors**: Graceful handling of permission issues
- **Database Errors**: Automatic recovery and reconnection
- **Watcher Errors**: Robust error handling for chokidar events
- **Memory Management**: Cleanup of pending operations and timeouts

## Specifications

Based on the following specifications:

- **FUNC-001**: File Lifecycle Tracking - Complete 6-event system
- **BP-002**: Daemon-CLI Separation Architecture
- **FUNC-003**: Background Activity Monitor

See `documents/visions/functions/` for detailed specifications.

## License

MIT