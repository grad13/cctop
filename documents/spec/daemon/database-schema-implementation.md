---
updated: 2026-03-14 15:42
checked: -
Deprecated: -
Format: spec-v2.1
Source: documents/visions/supplementary/CG-003-database-schema-implementation.md
---

# Specification: Database Schema Implementation

## 0. Meta

| Source | Runtime |
|--------|---------|
| daemon/src/database/SchemaManager.ts | Node.js |

| Field | Value |
|-------|-------|
| Related | daemon/src/database/FileEventRecorder.ts, daemon/src/database/EventOperations.ts, daemon/src/database/AggregateOperations.ts, daemon/src/database/MeasurementOperations.ts |
| Test Type | Unit |

## 1. Overview

5-table SQLite database schema implementing FUNC-000. WAL mode operation. All event history is recorded with measurements and per-file aggregates maintained.

Related function: FUNC-000 (SQLite database foundation).

## 2. Table Structure

### 2.1 event_types

Lookup table for event type definitions. Populated once on initialization.

```sql
CREATE TABLE event_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT
)
```

Initial data:

| code | name | description |
|------|------|-------------|
| `find` | Find | File discovered during initial scan |
| `create` | Create | New file created |
| `modify` | Modify | File content modified |
| `delete` | Delete | File deleted |
| `move` | Move | File moved/renamed |
| `lost` | Lost | File detected as missing on startup |
| `refind` | Refind | Previously lost file rediscovered |

### 2.2 files

Current state of each tracked file. One row per unique file path.

```sql
CREATE TABLE files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  directory TEXT NOT NULL,
  inode INTEGER,
  is_directory INTEGER DEFAULT 0,
  is_deleted INTEGER DEFAULT 0,
  last_event_id INTEGER,
  created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
  updated_at INTEGER DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (last_event_id) REFERENCES events(id)
)
```

### 2.3 events

Full event history. One row per event occurrence.

```sql
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  event_type_id INTEGER NOT NULL,
  file_id INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  directory TEXT NOT NULL,
  is_directory INTEGER DEFAULT 0,
  previous_event_id INTEGER,
  source_path TEXT,
  FOREIGN KEY (event_type_id) REFERENCES event_types(id),
  FOREIGN KEY (file_id) REFERENCES files(id),
  FOREIGN KEY (previous_event_id) REFERENCES events(id)
)
```

### 2.4 measurements

Per-event file measurement snapshots.

```sql
CREATE TABLE measurements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  file_size INTEGER,
  line_count INTEGER,
  block_count INTEGER,
  inode INTEGER,
  measured_at INTEGER DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id)
)
```

### 2.5 aggregates

Running totals per file. Updated on each event.

```sql
CREATE TABLE aggregates (
  file_id INTEGER PRIMARY KEY,
  current_file_size INTEGER DEFAULT 0,
  current_line_count INTEGER DEFAULT 0,
  current_block_count INTEGER DEFAULT 0,
  total_events INTEGER DEFAULT 0,
  total_modifications INTEGER DEFAULT 0,
  total_line_changes INTEGER DEFAULT 0,
  total_size_changes INTEGER DEFAULT 0,
  create_events INTEGER DEFAULT 0,
  modify_events INTEGER DEFAULT 0,
  move_events INTEGER DEFAULT 0,
  delete_events INTEGER DEFAULT 0,
  last_updated INTEGER DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (file_id) REFERENCES files(id)
)
```

### 2.6 Indexes

```sql
CREATE INDEX idx_events_timestamp ON events(timestamp);
CREATE INDEX idx_events_file_id ON events(file_id);
CREATE INDEX idx_events_event_type_id ON events(event_type_id);
CREATE INDEX idx_measurements_event_id ON measurements(event_id);
CREATE INDEX idx_files_path ON files(file_path);
CREATE INDEX idx_files_inode ON files(inode);
```

## 3. DatabaseManager Implementation

```javascript
// src/database/database-manager.js

const sqlite3 = require('sqlite3').verbose();
const schema = require('./schema');

class DatabaseManager {
  constructor(configPath) {
    this.dbPath = configPath;
    this.db = null;
  }

  async initialize() {
    await this.connect();
    await this.createTables();
    await this.createIndexes();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          // Enable WAL mode
          this.db.run('PRAGMA journal_mode = WAL', (err) => {
            if (err) reject(err);
            else resolve();
          });
        }
      });
    });
  }

  async createTables() {
    await this.run(schema.event_types);
    await this.run(schema.files);
    await this.run(schema.events);
    await this.run(schema.measurements);
    await this.run(schema.aggregates);
    await this.initializeEventTypes();
  }

  async createIndexes() {
    for (const indexSql of schema.indexes) {
      await this.run(indexSql);
    }
  }

  async initializeEventTypes() {
    const count = await this.get('SELECT COUNT(*) as count FROM event_types');
    if (count.count === 0) {
      await this.run(schema.event_types_init);
    }
  }

  // Event recording (transactional)
  async recordEvent(eventData) {
    const { event_type, file_path, file_name, directory, ...metadata } = eventData;

    await this.run('BEGIN TRANSACTION');

    try {
      // 1. Get or create file record
      let file = await this.getOrCreateFile(file_path, file_name, directory);

      // 2. Resolve event type ID
      const eventType = await this.get(
        'SELECT id FROM event_types WHERE code = ?',
        [event_type]
      );

      // 3. Insert event
      const eventResult = await this.run(`
        INSERT INTO events (
          timestamp, event_type_id, file_id, file_path,
          file_name, directory, is_directory, previous_event_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          metadata.timestamp || Date.now(),
          eventType.id,
          file.id,
          file_path,
          file_name,
          directory,
          metadata.is_directory || 0,
          file.last_event_id
        ]
      );

      // 4. Insert measurement (if available)
      if (metadata.file_size !== undefined || metadata.line_count !== undefined) {
        await this.run(`
          INSERT INTO measurements (
            event_id, file_size, line_count, block_count, inode
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            eventResult.lastID,
            metadata.file_size,
            metadata.line_count,
            metadata.block_count,
            metadata.inode
          ]
        );
      }

      // 5. Update files table
      await this.updateFile(file.id, eventResult.lastID, event_type);

      // 6. Update aggregates
      await this.updateAggregates(file.id, event_type, metadata);

      await this.run('COMMIT');
      return eventResult.lastID;

    } catch (error) {
      await this.run('ROLLBACK');
      throw error;
    }
  }

  async getOrCreateFile(file_path, file_name, directory) {
    let file = await this.get(
      'SELECT * FROM files WHERE file_path = ?',
      [file_path]
    );

    if (!file) {
      const result = await this.run(`
        INSERT INTO files (file_path, file_name, directory)
        VALUES (?, ?, ?)`,
        [file_path, file_name, directory]
      );

      file = {
        id: result.lastID,
        file_path,
        file_name,
        directory,
        last_event_id: null
      };
    }

    return file;
  }

  async updateFile(fileId, eventId, eventType) {
    const updates = ['last_event_id = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const params = [eventId];

    if (eventType === 'delete') {
      updates.push('is_deleted = 1');
    } else if (eventType === 'create' || eventType === 'refind') {
      updates.push('is_deleted = 0');
    }

    params.push(fileId);

    await this.run(
      `UPDATE files SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
  }

  async updateAggregates(fileId, eventType, metadata) {
    // Implementation per FUNC-000 specification
  }

  // Query helpers
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Lost file detection
  async getLiveFiles() {
    return await this.all(
      'SELECT * FROM files WHERE is_deleted = 0'
    );
  }

  // Refind detection by inode
  async findByInode(inode) {
    return await this.get(`
      SELECT f.*, et.code as latest_event
      FROM files f
      JOIN events e ON f.last_event_id = e.id
      JOIN event_types et ON e.event_type_id = et.id
      WHERE f.inode = ?`,
      [inode]
    );
  }

  // Recent events for display
  async getRecentEvents(limit = 100) {
    return await this.all(`
      SELECT
        e.timestamp,
        et.code as event_type,
        e.file_name,
        e.directory,
        m.file_size,
        m.line_count,
        m.block_count
      FROM events e
      JOIN event_types et ON e.event_type_id = et.id
      LEFT JOIN measurements m ON e.id = m.event_id
      ORDER BY e.timestamp DESC
      LIMIT ?`,
      [limit]
    );
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = DatabaseManager;
```

## 4. Test Points

1. **Schema integrity**
   - Foreign key constraint behavior
   - Index effectiveness under query load

2. **Transaction processing**
   - Rollback on error
   - Behavior under concurrent access

3. **Performance**
   - Throughput under high event volume
   - Index impact on query speed

## 5. Constraints and Caveats

- SQLite is file-based; DB path must be an absolute path
- WAL mode operation is assumed throughout
- inode reuse requires careful handling (same inode may refer to a different file after deletion)
- `aggregates.updateAggregates` implementation must follow FUNC-000 specification
