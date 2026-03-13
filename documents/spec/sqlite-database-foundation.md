---
Created: 2026-03-13
Updated: 2026-03-13
Checked: -
Deprecated: -
Format: spec-v2.1
Source: documents/visions/functions/FUNC-000-sqlite-database-foundation.md
---

# Specification: SQLite Database Foundation

## 0. Meta

| Source | Runtime |
|--------|---------|
| modules/daemon/src/database/SchemaManager.ts | Node.js |

| Field | Value |
|-------|-------|
| Related | sqlite-database-foundation.md, file-lifecycle-tracking.md, chokidar-database-integration.md |
| Test Type | Integration |

## 1. Overview

SQLite foundation (`activity.db`) initialization and management for all cctop data. 5-table schema that maintains file identity while handling inode reuse.

**User value**: Persistent storage, fast search, and statistics generation for all file change history.

## 2. Scope

**In scope**:
- SQLite DB creation and table initialization
- Index management and transaction management
- WAL mode configuration and performance optimization
- Seed data insertion (6 event_types)

**Out of scope**:
- UI display, file monitoring, configuration management
- Integration with other systems, external data retrieval

## 3. Schema Definition (5-table structure)

**Design principles**:
- `files`: current state only (inode is latest value, history not needed)
- `events`: complete event history for files (traverse via file_id + timestamp)
- `measurements`: measured values at event time (including inode history)
- `aggregates`: aggregate statistics per file

### 3.1 events table

```sql
CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,          -- Unix timestamp
    event_type_id INTEGER NOT NULL,
    file_id INTEGER NOT NULL,             -- reference to files
    file_path TEXT NOT NULL,              -- full path
    file_name TEXT NOT NULL,              -- filename only
    directory TEXT NOT NULL,              -- directory path
    FOREIGN KEY (event_type_id) REFERENCES event_types(id),
    FOREIGN KEY (file_id) REFERENCES files(id)
);
```

### 3.2 event_types table

```sql
CREATE TABLE event_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,            -- find/create/modify/delete/move/restore
    name TEXT NOT NULL,                   -- display name
    description TEXT                      -- description
);
```

### 3.3 files table

```sql
CREATE TABLE files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inode INTEGER,                        -- current latest inode value (updated on restore)
    is_active BOOLEAN DEFAULT TRUE        -- active state flag
);
```

### 3.4 measurements table

```sql
CREATE TABLE measurements (
    event_id INTEGER PRIMARY KEY,
    inode INTEGER,                        -- inode value at this point (for history)
    file_size INTEGER,                    -- file size in bytes
    line_count INTEGER,                   -- line count (text files only)
    block_count INTEGER,                  -- block count
    FOREIGN KEY (event_id) REFERENCES events(id)
);
```

### 3.5 aggregates table

```sql
CREATE TABLE aggregates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER,                      -- reference to files table
    period_start INTEGER,                 -- period start time

    -- cumulative statistics
    total_size INTEGER DEFAULT 0,
    total_lines INTEGER DEFAULT 0,
    total_blocks INTEGER DEFAULT 0,

    -- event counts
    total_events INTEGER DEFAULT 0,
    total_creates INTEGER DEFAULT 0,
    total_modifies INTEGER DEFAULT 0,
    total_deletes INTEGER DEFAULT 0,
    total_moves INTEGER DEFAULT 0,
    total_restores INTEGER DEFAULT 0,

    -- time series statistics
    first_event_timestamp INTEGER,
    last_event_timestamp INTEGER,

    -- metric statistics (size)
    first_size INTEGER,
    max_size INTEGER,
    last_size INTEGER,

    -- metric statistics (lines)
    first_lines INTEGER,
    max_lines INTEGER,
    last_lines INTEGER,

    -- metric statistics (blocks)
    first_blocks INTEGER,
    max_blocks INTEGER,
    last_blocks INTEGER,

    -- metadata
    last_updated INTEGER DEFAULT CURRENT_TIMESTAMP,
    calculation_method TEXT DEFAULT 'trigger',

    FOREIGN KEY (file_id) REFERENCES files(id)
);
```

## 4. Index Definition

```sql
-- Phase 1: basic indexes
CREATE INDEX idx_events_timestamp ON events(timestamp);
CREATE INDEX idx_events_file_path ON events(file_path);
CREATE INDEX idx_events_file_id ON events(file_id);
CREATE INDEX idx_events_file_timestamp ON events(file_id, timestamp);  -- fast traverse

-- Phase 2+ (planned):
-- CREATE INDEX idx_events_type_timestamp ON events(event_type_id, timestamp);
-- CREATE INDEX idx_events_directory ON events(directory);
-- CREATE INDEX idx_aggregates_updated ON aggregates(last_updated);
```

## 5. Seed Data

```sql
INSERT INTO event_types (code, name, description) VALUES
('find',    'Find',    'Initial file discovery'),
('create',  'Create',  'File creation'),
('modify',  'Modify',  'File modification'),
('delete',  'Delete',  'File deletion'),
('move',    'Move',    'File move/rename'),
('restore', 'Restore', 'File restoration after deletion');
-- 'error' type planned for v0.2.0.0+
```

## 6. SQLite Configuration

| Setting | Value | Purpose |
|---------|-------|---------|
| WAL mode | enabled | Concurrent read performance |
| Sync mode | NORMAL | Balance safety and performance |
| Cache size | 64MB | Large data processing |
| Temp storage | memory | Speed |

## 7. File Layout

```
.cctop/
├── data/
│   ├── activity.db      # main DB file (persistent)
│   ├── activity.db-wal  # WAL file (auto-generated by SQLite)
│   └── activity.db-shm  # SHM file (auto-generated by SQLite)
```

**Important**:
- WAL/SHM files are auto-generated and managed by SQLite (do not delete manually)
- For backups, target `activity.db` only
- WAL/SHM files are auto-deleted on clean cctop shutdown
- On abnormal exit, WAL/SHM files remaining are auto-processed on next startup

## 8. Functional Requirements

### 8.1 DB creation

1. On first startup: auto-create `activity.db` if it does not exist
2. Schema creation order: `event_types` → `files` → `events` → `measurements` → `aggregates` (foreign key constraint ordering)
3. Error handling:
   - Missing directory: auto-create `.cctop/` directory
   - Permission error: display clear error message
   - DB corruption: propose re-creation after backup

### 8.2 Data integrity

1. Transactions: guarantee consistency of related data
2. Foreign key constraints: ensure `event_types` referential integrity
3. File identity management:
   - Reuse same `file_id` when a deleted file is restored at same path
   - Update `inode` in `files` table to latest value
   - Manage state with `is_active` flag
