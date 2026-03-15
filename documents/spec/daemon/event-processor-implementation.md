---
Created: 2026-03-13
Updated: 2026-03-13
Checked: -
Deprecated: -
Format: spec-v2.1
Source: documents/visions/supplementary/CG-001-event-processor-implementation.md
---

# Specification: Event Processor Implementation

## 0. Meta

| Source | Runtime |
|--------|---------|
| daemon/src/events/FileEventHandler.ts | Node.js |

| Field | Value |
|-------|-------|
| Related | daemon/database-schema-implementation.md, daemon/file-lifecycle-state.md |
| Test Type | Unit |

## 1. Overview

Converts chokidar events into database events with appropriate metadata. Handles the distinction between initial scan (find) and runtime (create) events, and detects lost/refind scenarios on startup.

Related functions: FUNC-002 (chokidar-Database integration), FUNC-001 (file lifecycle tracking).

## 2. Event Type Mapping

| chokidar Event | isReady=false | isReady=true |
|----------------|---------------|--------------|
| `add` | `find` | `create` |
| `change` | `modify` | `modify` |
| `unlink` | `delete` | `delete` |
| `addDir` | `find` | `create` |
| `unlinkDir` | `delete` | `delete` |

The `isReady` flag is set to `true` when chokidar fires its `ready` event (initial scan complete).

## 3. Core Implementation

```javascript
// src/monitors/event-processor.js

const path = require('path');
const fs = require('fs').promises;

class EventProcessor {
  constructor(databaseManager) {
    this.db = databaseManager;
    this.isReady = false; // initial scan completion flag
  }

  // Notify that initial scan is complete
  setReady() {
    this.isReady = true;
    console.log('Initial scan complete');
    this.scanForLostFiles();
  }

  // Event conversion table (FUNC-002 compliant)
  getEventType(chokidarEvent, stats) {
    const eventMapping = {
      'add': () => this.isReady ? 'create' : 'find',
      'change': () => 'modify',
      'unlink': () => 'delete',
      'addDir': () => this.isReady ? 'create' : 'find',
      'unlinkDir': () => 'delete'
    };

    const mapper = eventMapping[chokidarEvent];
    return mapper ? mapper(stats) : 'unknown';
  }

  // Metadata collection (FUNC-001 compliant)
  async collectMetadata(targetPath, stats) {
    const isDirectory = stats?.isDirectory() || false;

    return {
      file_size: isDirectory ? 0 : (stats?.size || 0),
      line_count: isDirectory ? 0 : await this.countLines(targetPath),
      block_count: stats?.blocks || null,
      timestamp: Date.now(),
      file_path: path.resolve(targetPath),
      file_name: path.basename(targetPath),
      directory: path.dirname(path.resolve(targetPath)),
      inode: stats?.ino || null,
      is_directory: isDirectory
    };
  }

  // Line count
  async countLines(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content.split('\n').length;
    } catch (error) {
      return 0;
    }
  }

  // Object ID management for proper inheritance
  async getObjectId(filePath, stats, eventType) {
    if (eventType === 'delete') {
      // For delete events: search for existing object_id by file path
      const existing = await this.db.findByPath(filePath);
      return existing?.object_id || null;
    } else if (stats?.ino) {
      // When inode is available: check for refind scenario
      const existing = await this.db.findByInode(stats.ino);
      if (existing && existing.latest_event === 'lost') {
        // Record as refind event
        return { objectId: existing.object_id, isRefind: true };
      }
    }
    // Generate new object_id for truly new files
    return await this.db.createNewObjectId(stats?.ino);
  }

  // Lost files scanning on startup
  async scanForLostFiles() {
    try {
      const liveFiles = await this.db.getLiveFiles(); // deleted = false

      for (const file of liveFiles) {
        try {
          await fs.access(file.file_path);
        } catch (error) {
          // File not found - mark as lost
          await this.recordEvent('lost', file.object_id, {
            file_path: file.file_path,
            file_name: file.file_name,
            directory: file.directory,
            timestamp: Date.now()
          });
        }
      }
    } catch (error) {
      console.error('Failed to scan for lost files:', error);
    }
  }

  // Main event processing
  async processEvent(chokidarEvent, targetPath, stats) {
    try {
      // Determine event type
      const eventType = this.getEventType(chokidarEvent, stats);

      // Get or create object ID
      const objectIdResult = await this.getObjectId(targetPath, stats, eventType);
      const isRefind = objectIdResult?.isRefind || false;
      const objectId = objectIdResult?.objectId || objectIdResult;

      // Collect metadata
      const metadata = await this.collectMetadata(targetPath, stats);

      // Record event with proper type
      const actualEventType = isRefind ? 'refind' : eventType;
      await this.recordEvent(actualEventType, objectId, metadata);

    } catch (error) {
      console.error(`Failed to process event for ${targetPath}:`, error);
    }
  }

  // Record event to database
  async recordEvent(eventType, objectId, metadata) {
    await this.db.recordEvent({
      event_type: eventType,
      object_id: objectId,
      ...metadata
    });
  }
}

module.exports = EventProcessor;
```

## 4. FileMonitor Integration

```javascript
// src/monitors/file-monitor.js

const chokidar = require('chokidar');
const EventProcessor = require('./event-processor');

class FileMonitor {
  constructor(databaseManager, config) {
    this.processor = new EventProcessor(databaseManager);
    this.config = config;
  }

  start() {
    this.watcher = chokidar.watch(this.config.paths, {
      persistent: true,
      ignoreInitial: false,  // enable initial scan
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50
      },
      atomic: true,
      alwaysStat: true      // always provide stats object
    });

    // Event bindings
    this.watcher
      .on('add', (path, stats) => this.processor.processEvent('add', path, stats))
      .on('change', (path, stats) => this.processor.processEvent('change', path, stats))
      .on('unlink', (path) => this.processor.processEvent('unlink', path))
      .on('addDir', (path, stats) => this.processor.processEvent('addDir', path, stats))
      .on('unlinkDir', (path) => this.processor.processEvent('unlinkDir', path))
      .on('ready', () => this.processor.setReady())
      .on('error', error => console.error('Watcher error:', error));
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
    }
  }
}
```

## 5. Test Points

1. **Initial scan behavior**
   - `isReady` flag transitions correctly
   - `find` vs `create` event distinction based on timing

2. **Lost/Refind logic**
   - Lost file detection on startup via `scanForLostFiles()`
   - `refind` event when inode matches a previously `lost` file

3. **Metadata collection**
   - All 6 fields recorded accurately
   - Directory handling (file_size=0, line_count=0)

## 6. Constraints and Caveats

- The chokidar `stats` object is not always provided
- `stats` is unavailable on `delete` events (unlink)
- Line counting (`countLines`) may impact performance on large files
- Object ID continuity must be maintained across all event types
