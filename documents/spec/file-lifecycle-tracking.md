---
Created: 2026-03-13
Updated: 2026-03-13
Checked: -
Deprecated: -
Format: spec-v2.1
Source: documents/visions/functions/FUNC-001-file-lifecycle-tracking.md
---

# Specification: File Lifecycle Tracking

## 0. Meta

| Source | Runtime |
|--------|---------|
| modules/daemon/src/events/FileEventHandler.ts, modules/daemon/src/events/MoveDetector.ts | Node.js |

| Field | Value |
|-------|-------|
| Related | sqlite-database-foundation.md, chokidar-database-integration.md, background-activity-monitor.md |
| Test Type | Integration |

## 1. Overview

Comprehensive system for tracking the complete lifecycle of files using 6 event types (find/create/modify/move/delete/restore). Accurate mapping to chokidar events records all file operations including deletion, restoration, and moves.

**User value**:
- Full file change history visualization
- Deleted file restoration detection (restore)
- State consistency verification after system restart
- Accurate event judgment at monitoring boundary

## 2. Scope

**In scope** (files only - directories excluded):
- delete/restore event definition and recording (lost/refind abolished)
- Object identity management with inode reuse support
- Automatic detection of file restoration
- State verification and sync after system restart
- Configurable restoration detection window (restore: default 5 minutes)

**Out of scope**:
- Directory tracking (low value relative to complexity)
- File copy detection (copy events not tracked)
- Deletion reason identification (actual delete vs. move outside monitoring boundary not distinguished)
- Full file content backup
- Automatic file restoration
- Complex version control system

## 3. Event Type Definitions

| Event | Description |
|-------|-------------|
| `find` | Existing file discovered during initial scan |
| `create` | New file created during real-time monitoring |
| `modify` | File content or metadata changed |
| `move` | File moved or renamed |
| `delete` | File absence detected (deletion, move outside monitoring boundary, or absent on startup) |
| `restore` | Re-detection from deleted state |

**Design decision - abolishing lost/refind**:
- Eliminates complexity of representing "file does not exist" in multiple states
- Absence at scan time and real-time deletion are fundamentally the same "absence"
- Unification simplifies both implementation and user understanding

## 4. Event Information Availability

| Event | inode | stats | DB lookup | Path source | Timestamp | Notes |
|-------|-------|-------|-----------|-------------|-----------|-------|
| `find` | available | available | not needed | current FS | accurate | batch processed |
| `create` | available | available | deleted state | current FS | accurate | restore check needed |
| `modify` | available | available | active state check | current FS | accurate | high frequency |
| `move` | new: available / old: DB | new: available / old: N/A | old path inode | old: DB / new: FS | accurate | unlink→add detection |
| `delete` | N/A | N/A | active object_id | current FS/DB | accurate | unlink or startup absence |
| `restore` | available | available | deleted state check | current FS | accurate | time-limited |

## 5. chokidar Event Mapping

| cctop event | chokidar event | Monitoring phase | Timing condition |
|-------------|----------------|------------------|------------------|
| `find` | `add` | initial scan | before ready + `ignoreInitial: false` |
| `create` | `add` | real-time | after ready |
| `modify` | `change` | real-time | after ready |
| `move` | `unlink` → `add` | real-time | within 100ms + same inode |
| `delete` | `unlink` | real-time | after move timeout |
| `delete` | (none) | initial scan | in DB but absent in FS |
| `restore` | `add` | real-time | after ready + within 5min of delete (configurable) |

Note: Directory events (`addDir`/`unlinkDir`) are excluded. Files only.

## 6. Lifecycle State Management

States:
- **Non-existent**: file does not exist (initial state)
- **Active**: active as monitoring target (most common)
- **Deleted**: deleted but restorable (unifies deletion, move outside boundary, startup absence)

## 7. Implementation Challenges and Solutions

### 7.1 Identity management: inode mismatch on delete → restore

- **Challenge**: File re-created at same path after deletion has a new inode
- **Solution**:
  - Identity judgment by path + size + time window (5 minutes)
  - Always record file size (bytes) as metadata
  - Maintain `object_id`, record new inode as new entry
  - Display as continuation of same file

### 7.2 Move detection uncertainty

- **Challenge**: No guaranteed order for unlink→add, timing is indeterminate
- **Solution**:
  - Temporarily hold in `pending_unlinks` map (display delayed)
  - Judge by inode match + time threshold (default 100ms, configurable)
  - Confirm as delete after timeout
  - Process as delete & create when inode unavailable
- **Limitation**: File name swap operations may not be correctly detected depending on timing

### 7.3 History management

```
files (persistent file identification)
├── id (file_id)
├── inode
└── is_active (boolean)

events (all event records)
├── file_id (FK)
├── event_type
├── file_path
├── inode (value at that point)
└── timestamp
```

**Benefits of `is_active` boolean management**:
- Delete detection: unlink event, or check `is_active = true` files on startup for those absent
- Restore judgment: check for matching inode among `is_active = false` during real-time monitoring
- Fast state filtering with simple index

### 7.4 State transition recording policy

- **Record all events**: keep complete history including deletions
- **Update state**: manage current state via `is_active` field in `files` table
- **Restore judgment**: judge by elapsed time since latest delete event

## 8. Monitoring Boundary Consistency

| Scenario | Detection | Display policy |
|----------|-----------|----------------|
| Move outside boundary → return inside | delete → create/restore | Show as same file if within time window |
| Move via temporary outside boundary | delete → create | Show as inferred move (optional) |

## 9. Test Requirements

### 9.1 Basic event tracking
- [ ] find: existing file detection on initial scan
- [ ] create: real-time new file creation
- [ ] modify: accurate detection of file content change
- [ ] delete → immediate same-path create → restore detection
- [ ] system restart → delete detection → restore detection

### 9.2 Advanced tracking
- [ ] move: move detection via consecutive unlink→add
- [ ] appropriate new object creation on inode reuse
- [ ] complex move → delete → restore scenarios

### 9.3 Restore detection
- [ ] restore: restoration from deleted state (time limited)
- [ ] startup delete → restore detection
- [ ] large-scale file deletion → partial restore tracking

### 9.4 Performance
- [ ] 10,000 file deletion → delete detection performance
- [ ] identity judgment response time (<10ms)
- [ ] memory usage appropriateness
