---
updated: 2026-03-14 15:42
checked: -
Deprecated: -
Format: spec-v2.1
Source: documents/visions/functions/FUNC-002-chokidar-database-integration.md
---

# Specification: chokidar-Database Integration

## 0. Meta

| Source | Runtime |
|--------|---------|
| daemon/src/events/FileEventHandler.ts, daemon/src/events/MeasurementCalculator.ts, daemon/src/events/MoveDetector.ts, daemon/src/database/FileEventRecorder.ts | Node.js |

| Field | Value |
|-------|-------|
| Related | daemon/sqlite-database-foundation.md, daemon/file-lifecycle-tracking.md, daemon/background-activity-monitor.md |
| Test Type | Integration |

## 1. Overview

Core monitoring function that integrates chokidar file change detection with database recording using the schema defined in sqlite-database-foundation. Detects filesystem events and records them distributed across appropriate tables.

**User value**:
- Real-time file change detection
- Complete file lifecycle tracking
- Fast and reliable event recording

## 2. Scope

**In scope**:
- File system monitoring via chokidar
- Conversion to 6 event types (per file-lifecycle-tracking spec)
- DB recording based on sqlite-database-foundation schema
- File measurement collection (size/lines/blocks)
- Error handling and retry

**Out of scope**:
- UI display (view module responsibility)
- Configuration management (shared-config responsibility)
- File content parsing
- Plugin extension

## 3. Database Integration

### 3.1 files table management

- New file detected: INSERT (per sqlite-database-foundation schema)
- File deleted: update `is_active = FALSE`
- File restored: update `is_active = TRUE`
- Design accounts for inode reuse

### 3.2 events table recording

All events recorded chronologically. event_type: 6 types per file-lifecycle-tracking spec:
- `find`: discovered on initial scan
- `create`: newly created
- `modify`: modified
- `move`: moved/renamed
- `delete`: deleted
- `restore`: restored

### 3.3 measurements table update

Measurement values recorded on modify event:
- `size`: file size (bytes)
- `lines`: line count (text files only)
- `blocks`: block count

## 4. chokidar Configuration

```javascript
{
    ignored: ['**/node_modules/**', '**/.git/**', '**/.*', '**/.cctop/**'],
    persistent: true,
    ignoreInitial: false,
    followSymlinks: false,
    alwaysStat: true,
    awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
    }
}
```

## 5. Event Conversion

### 5.1 chokidar → cctop event mapping

| chokidar event | Condition | cctop event |
|----------------|-----------|-------------|
| `add` | before ready | `find` |
| `add` | after ready + no move pending | `create` |
| `add` | after ready + move pending (within 100ms, same inode) | `move` |
| `add` | after ready + delete history (within 5min) | `restore` |
| `change` | - | `modify` |
| `unlink` | - | hold in `pending_unlinks` |
| (100ms elapsed) | `pending_unlinks` timeout | `delete` |
| `error` | - | (not recorded) |

### 5.2 Move event detection

- Temporarily hold `unlink` event in `pending_unlinks` map
- If `add` with same inode occurs within 100ms → move
- After timeout → confirm as delete

### 5.3 Restore event detection

- `add` event at same path detected after delete event
- Within 5 minutes of deletion (configurable)
- When existing record exists in `files` table

## 6. Implementation Guidelines

### 6.1 Class design

1. **FileWatcher**: chokidar initialization and monitoring start, event handler registration, ready state management
2. **EventProcessor**: chokidar event normalization, file info collection (stat), database transaction management
3. **MeasurementCollector**: file size retrieval, line count (text file detection), block count calculation

### 6.2 Transaction design

```javascript
// 1. resolve or create file_id
// 2. insert into events table
// 3. insert into measurements table (on modify event)
// 4. update aggregates table
```

### 6.3 Usage example

```javascript
const watcher = new FileWatcher({
    path: './src',
    db: './cctop/activity.db'
});

watcher.on('event', (event) => {
    console.log(`${event.type}: ${event.path}`);
});
```

## 7. Test Requirements

1. **Basic operation**: detection of all 6 event types, database recording consistency, measurement accuracy
2. **Error handling**: behavior on permission error, processing during file deletion, retry on database error
3. **Performance**: large number of simultaneous file changes, long-duration continuous operation, memory leak verification

## 8. Success Criteria

1. **Completeness**: reliable recording of all file events
2. **Accuracy**: appropriate recording per sqlite-database-foundation schema
3. **Performance**: maintaining real-time responsiveness (within 100ms)
4. **Stability**: reliability in 24-hour continuous operation
