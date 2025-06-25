# Lost/Refind Event Type Implementation Task

**From**: Builder Agent  
**To**: Validator Agent  
**Date**: 2025-06-25  
**Priority**: High  
**Type**: Feature Implementation & Bug Fix

## Summary

Implementation of new event types `lost` and `refind` to properly track file lifecycle and fix object_id inheritance issues in delete events.

## Background

Current issues:
1. Delete events cannot inherit object_id when inode is null
2. No way to track files that disappeared while cctop was not running
3. File lifecycle tracking is incomplete

## Changes Made to BP-000

### 1. Event Types Definition
Added new event types in schema initialization:
```sql
INSERT INTO event_types (code, name, description) VALUES
  ('lost', 'Lost', 'File detected as missing on startup'),
  ('refind', 'Refind', 'Previously lost file rediscovered');
```

### 2. Lost Detection on Startup
```javascript
watcher.on('ready', async () => {
  isReady = true;
  console.log('Initial scan complete');
  
  // Scan for lost files after initial scan
  await scanForLostFiles();
});

async function scanForLostFiles() {
  const liveFiles = await databaseManager.getLiveFiles(); // deleted = false
  for (const file of liveFiles) {
    if (!fs.existsSync(file.file_path)) {
      await eventProcessor.recordEvent('lost', file.object_id, {
        file_path: file.file_path,
        file_name: file.file_name,
        directory: file.directory,
        timestamp: Date.now()
      });
    }
  }
}
```

### 3. Object ID Inheritance Logic
```javascript
async function getObjectId(filePath, stats, eventType) {
  if (eventType === 'delete') {
    // For delete events: search for existing object_id by file path
    const existing = await databaseManager.findByPath(filePath);
    return existing?.object_id || null;
  } else if (stats?.ino) {
    // When inode is available: check for refind scenario
    const existing = await databaseManager.findByInode(stats.ino);
    if (existing && existing.latest_event === 'lost') {
      // Record as refind event
      return { objectId: existing.object_id, isRefind: true };
    }
  }
  // Generate new object_id for truly new files
  return await databaseManager.createNewObjectId(stats?.ino);
}
```

### 4. UI Color Coding
Added visual distinction for new event types:
- lost: Dark red (chalk.red.dim)
- refind: Bright yellow (chalk.yellowBright)

## Implementation Requirements

1. **DatabaseManager Enhancement**
   - Add `getLiveFiles()` method to query non-deleted files
   - Add `findByPath()` method for delete event object_id lookup
   - Add `findByInode()` method for refind detection
   - Track latest event type per object_id

2. **EventProcessor Updates**
   - Implement `scanForLostFiles()` function
   - Update event recording to handle refind scenario
   - Ensure proper object_id inheritance for all event types

3. **FileMonitor Integration**
   - Call lost detection after chokidar ready event
   - Update create event handler to check for refind

4. **Testing Requirements**
   - Test lost detection on startup
   - Test object_id inheritance for delete events
   - Test refind detection when lost file reappears
   - Verify color coding in UI

## Expected Benefits

1. **Fixes integrity-005 test**: Delete events will properly inherit object_id
2. **Complete lifecycle tracking**: Lost/refind provides full visibility
3. **Better debugging**: Clear indication of file state transitions
4. **Data consistency**: Maintains object_id continuity across all events

## Files to Update

- `src/database/database-manager.js`: New query methods
- `src/monitors/event-processor.js`: Lost/refind logic
- `src/monitors/file-monitor.js`: Integration points
- `src/ui/cli-display.js`: Color coding for new event types
- `test/integration/file-lifecycle.test.js`: New test cases

## Notes

- NODE_ENV dependency should be removed in final implementation
- Use ConfigManager settings instead of environment variables
- Ensure backward compatibility with existing database

Please review the BP-000 changes and implement accordingly. Focus on fixing the delete event object_id inheritance issue first, then add the lost/refind functionality.