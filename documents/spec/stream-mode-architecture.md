---
Created: 2026-03-13
Updated: 2026-03-13
Checked: -
Deprecated: -
Format: spec-v2.1
Source: daemon/src/index.ts, view/src/index.ts, shared/src/index.ts
---

# Specification: Stream Mode Architecture

## 0. Meta

| Source | Runtime |
|--------|---------|
| daemon/src/index.ts | Node.js |
| view/src/index.ts | Node.js |
| shared/src/index.ts | Node.js |

| Field | Value |
|-------|-------|
| Related | spec/component-architecture-overview.md, spec/module-dependency-diagram.md, spec/milestones-strategy.md |
| Test Type | Integration |

## Overview

Stream mode is the foundational real-time file monitoring and display feature of cctop. It achieves stable operation with a minimal feature set, covering everything from immediate detection of file changes through to screen display.

**Implementation status**: Complete (documentation of existing implementation)

## System Architecture

```
+----------------------------------------------------------+
|                Stream Mode Architecture                   |
|                                                          |
|  +-----------+    +-------------+    +---------------+  |
|  |  chokidar |    |   Database  |    |  CLI Display  |  |
|  | File Mon. |--->|  (SQLite)   |--->|   (blessed)   |  |
|  +-----------+    +-------------+    +---------------+  |
|        |                 |                   |          |
|        v                 v                   v          |
|  +-----------+    +-------------+    +---------------+  |
|  |   Config  |    | Event Types |    |  All/Unique   |  |
|  | Management|    |  Tracking   |    |    Modes      |  |
|  +-----------+    +-------------+    +---------------+  |
+----------------------------------------------------------+
```

## Data Flow

```
[File Change]
    | (chokidar watch)
    v
[FUNC-002: Event Detection]      daemon/src/events/FileEventHandler.ts
    | (normalize and classify)
    v
[FUNC-001: Lifecycle Tracking]   daemon/src/database/FileEventRecorder.ts
    | (persist to database)
    v
[FUNC-000: SQLite Storage]       daemon/src/database/SchemaManager.ts
    | (read-only query)
    v
[FUNC-202: CLI Display]          view/src/ui/BlessedFramelessUI.ts
    | (render to screen)
    v
[FUNC-200/201: Display Optimization]
    |
    v
[Terminal Screen]
```

## Configuration Flow

```
[FUNC-105: Initialization]       shared/src/config/LocalSetupInitializer.ts
    | (create directory)
    v
[FUNC-101: Common Config]        shared/src/config-manager.ts
    | (generate config files)
    v
[FUNC-106: Daemon Config] + [FUNC-107: CLI Config]
    | (load config)
    v
[FUNC-002: Start Monitoring] + [FUNC-202: Start Display]
```

## Implemented Functions

### Foundation Layer (000-series)

#### FUNC-000: SQLite Database Foundation

**Source**: `daemon/src/database/SchemaManager.ts`

**Implementation**:
- 5-table schema (files, events, directories, configurations, metadata)
- SQLite WAL mode
- Index optimization
- Data integrity constraints

**Primary schema**:
```sql
CREATE TABLE events (
    event_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id    INTEGER NOT NULL,
    event_type TEXT    NOT NULL,
    timestamp  DATETIME DEFAULT CURRENT_TIMESTAMP,
    file_size  INTEGER,
    line_count INTEGER,
    FOREIGN KEY (file_id) REFERENCES files(file_id)
);
```

#### FUNC-001: File Lifecycle Tracking

**Source**: `daemon/src/database/FileEventRecorder.ts`, `daemon/src/events/FileEventHandler.ts`

**Implementation**:
- 6 event types tracked (Find/Create/Modify/Delete/Move/Restore)
- File lifecycle management
- Automatic metadata collection
- Duplicate event prevention

**Event classification**:

| Event | Description |
|-------|-------------|
| Find | Discovered during initial scan |
| Create | New file created |
| Modify | File content changed |
| Delete | File deleted |
| Move | File moved or renamed |
| Restore | Restored from deleted state |

#### FUNC-002: Chokidar Database Integration

**Source**: `daemon/src/events/FileEventHandler.ts`

**Implementation**:
- chokidar v3.5.3 integration
- High-performance file monitoring
- Event normalization and database storage
- Watch exclusion configuration

**Watch configuration**:
```javascript
const watcher = chokidar.watch('.', {
  ignored: /node_modules|\.git/,
  persistent: true,
  ignoreInitial: false
});
```

#### FUNC-003: Background Activity Monitor

**Source**: `daemon/src/system/PidManager.ts`, `daemon/src/system/SignalHandler.ts`

**Implementation**:
- Daemon process management
- PID file management
- Start/stop control
- Heartbeat monitoring

### Configuration Layer (100-series)

#### FUNC-101: Hierarchical Config Management

**Source**: `shared/src/config-manager.ts`, `shared/src/config/SharedConfig.ts`

**Implementation**:
- Hierarchical configuration system
- JSON configuration files
- Default value management
- Configuration validation

**Config hierarchy**:
```
~/.cctop/
+-- config/
|   +-- daemon-config.json
|   +-- cli-config.json
|   +-- master-config.json
+-- data/
    +-- cctop.db
```

#### FUNC-104: CLI Interface Specification

**Source**: `view/src/index.ts`

**Basic commands**:
```bash
cctop                     # standard launch
cctop --help              # show help
cctop --version           # show version
cctop --daemon --status   # daemon status check
```

#### FUNC-105: Local Setup Initialization

**Source**: `shared/src/config/LocalSetupInitializer.ts`

**Implementation**:
- `.cctop` directory initialization
- Config file generation
- Database initialization
- Permission setup

#### FUNC-106: Daemon Configuration Management

**Source**: `daemon/src/config/DaemonConfig.ts`

**Manages**: daemon-config.json, process settings, log settings, watch settings

#### FUNC-107: CLI Configuration Management

**Source**: `shared/src/config/CLIConfig.ts`

**Manages**: cli-config.json, display settings, key binding settings, theme settings

### Display Layer (200-series)

#### FUNC-200: East Asian Width Display

**Source**: `view/src/ui/components/EventTable/utils/stringUtils.ts`

**Implementation**:
- Full-width character support (Japanese, Chinese etc.)
- Accurate character width calculation
- Prevention of display corruption
- Unicode normalization

```javascript
const eastAsianWidth = require('eastasianwidth');
const displayWidth = eastAsianWidth.length(text);
```

#### FUNC-201: Double Buffer Rendering

**Source**: `view/src/ui/UIScreenManager.ts`

**Implementation**:
- Double buffering
- Flicker prevention
- Efficient screen updates
- blessed.js optimization

#### FUNC-202: CLI Display Integration

**Source**: `view/src/ui/BlessedFramelessUI.ts`, `view/src/ui/UIDataManager.ts`

**Implementation**:
- Main display system
- Real-time updates
- 4-area layout (Header / Event Rows / Command Keys / Dynamic Control)
- All/Unique display modes

**Screen layout**:
```
+---------------------------------------------+
| Header: cctop v0.3.0 - File Monitor         |  <- header area
+---------------------------------------------+
| Event Timestamp      File Name        Event  |  <- event row area
| 2025-07-07 22:30:15  index.js        modify  |
| 2025-07-07 22:30:10  README.md       create  |
+---------------------------------------------+
| [a] All [u] Unique [r] Refresh [q] Exit      |  <- command key area
+---------------------------------------------+
```

## Technology Stack

### Monitoring and Data Layer

| Technology | Version | Role |
|------------|---------|------|
| chokidar | v3.5.3 | File monitoring |
| SQLite | v3.x | Data persistence |
| Node.js | v24.2.0 | Runtime |

### Display and UI Layer

| Technology | Role |
|------------|------|
| blessed | CLI UI framework |
| eastasianwidth | Character width calculation |
| ANSI escape codes | Display control |

### Config and Management Layer

| Technology | Role |
|------------|------|
| JSON | Configuration file format |
| fs-extra | Filesystem operations |
| path | Path manipulation |

## Performance Characteristics

| Metric | Target | Achieved |
|--------|--------|---------|
| File change detection | Within 1ms | Yes |
| Database save | Within 10ms | Yes |
| Screen update | Within 100ms | Yes |
| Memory (normal) | Under 50MB | Yes |
| Memory (large watch) | Under 200MB | Yes |
| Disk (10K events) | ~10MB | Yes |
| Continuous operation | 24 hours | Yes |
| Max monitored files | 100K | Yes |

## Display Mode Behavior

### All Mode

Displays all events in time-series order. New events appear at the top.

### Unique Mode

Displays only the latest event per file. Multiple events for the same file are deduplicated, showing only the most recent state.

**Key binding**:

| Key | Action |
|-----|--------|
| `a` | Switch to All mode |
| `u` | Switch to Unique mode |
| `r` | Refresh display |
| `q` | Exit |

## Sample Output

```
cctop v0.3.0 - File Monitor                     [22:35:12]
---------------------------------------------------------
Event Timestamp      Elapsed  File Name                 Event
2025-07-07 22:35:10    00:02  src/index.js             modify
2025-07-07 22:35:08    00:04  README.md                create
2025-07-07 22:35:05    00:07  package.json             modify
2025-07-07 22:35:02    00:10  .gitignore               create
---------------------------------------------------------
All Activities (4 events)
[a] All  [u] Unique  [r] Refresh  [q] Exit
```

## Foundation for Milestone 2 (Filter)

### Foundation Established in Stream Mode

- Stable file monitoring system
- High-performance database foundation
- Flexible configuration management system
- Extensible CLI display framework
- Process separation ready
- Modular design with clear separation of responsibilities

### New Functions Planned for Milestone 2

| Function | Purpose |
|----------|---------|
| FUNC-301 | Filter State Management (core of filter system) |
| FUNC-203 | Event Type Filtering |
| FUNC-208 | UI Filter Integration |

### Existing Functions Extended in Milestone 2

| Function | Extension |
|----------|-----------|
| FUNC-202 | Add filter display foundation |
| FUNC-000 | Add filter query foundation |
| FUNC-300 | Add filter key input |

## Lessons Learned

| Area | Learning |
|------|---------|
| blessed.js | Character width issue and workaround (eastasianwidth) |
| SQLite | Effectiveness of WAL mode for concurrent read/write |
| chokidar | Config optimization for large directory trees |
| Architecture | Importance of process separation (daemon vs view) |
| Config | Benefits of hierarchical configuration management |
| UX | All/Unique mode switching provides clear value to users |
