# Inode Reuse and Object Identity Specification Request

**From**: Builder Agent  
**To**: Architect Agent  
**Date**: 2025-06-25  
**Priority**: High  
**Type**: Specification Design Request

## Executive Summary

The current object_fingerprint design assumes inode uniqueness, but Unix filesystems reuse inodes after file deletion. This creates object identity conflicts that need architectural resolution.

## Problem Statement

### Current Design Issue
```sql
CREATE TABLE object_fingerprint (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inode INTEGER UNIQUE  -- Problem: prevents inode reuse
)
```

### Scenario
1. File A created → inode: 12345, object_id: 1
2. File A deleted
3. File B created → inode: 12345 (reused)
4. **Conflict**: Cannot create new object_fingerprint due to UNIQUE constraint

## Technical Analysis

### Inode Characteristics
1. **Uniqueness**: Within same filesystem at same time, inodes are unique
2. **Reusability**: After deletion, inodes return to reuse pool
3. **Persistence**: While file exists, inode never changes

### Reuse Frequency Estimation
- **Daily creation**: 1024 files/day
- **Annual**: ~370,000 files/year
- **Reuse timing**: 
  - Linux/Unix avoid recent inodes for months
  - Typical reuse: 6-12 months later
  - Guaranteed reuse: Eventually in long-term operation

### Current Implementation Conflicts

#### Lost/Refind Logic
```javascript
// Current: assumes inode uniquely identifies an object
const existing = await this.db.findByInode(stats.ino);
if (existing && existing.latest_event === 'lost') {
  return await this.recordEvent('refind', ...);
}
```

#### Delete/Restore Detection
- delete → recreate with same filename but different inode
- Need to track file identity beyond inode

## Design Questions for Architect

### 1. Object Identity Philosophy
What defines a file's identity in cctop?
- **Option A**: Inode-based (current, problematic)
- **Option B**: Path-based (loses track on rename)
- **Option C**: Hybrid (path + inode + heuristics)
- **Option D**: Content-based (hash fingerprint)

### 2. Schema Modifications
Should we:
- Remove UNIQUE constraint from inode?
- Add composite keys?
- Create mapping tables?
- Add validity timestamps?

### 3. Refind/Restore Logic
How to detect file resurrection?
- Same path, different inode → restore?
- Same inode, different path → moved?
- Time-based heuristics?

### 4. Historical Data Integrity
How to handle:
- Objects with same inode from different time periods?
- Querying "all events for this file" across inode changes?

## Proposed Solutions (Builder Perspective)

### Solution 1: Remove UNIQUE, Add Timestamps
```sql
CREATE TABLE object_fingerprint (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inode INTEGER,  -- No UNIQUE
  created_at INTEGER NOT NULL,
  valid_until INTEGER  -- NULL if current
);
```

### Solution 2: Path-Based Tracking
```sql
CREATE TABLE object_path_mapping (
  file_path TEXT NOT NULL,
  object_id INTEGER NOT NULL,
  valid_from INTEGER NOT NULL,
  valid_until INTEGER,
  PRIMARY KEY (file_path, valid_from)
);
```

### Solution 3: Hybrid Identity
```javascript
async function determineObjectId(path, inode, eventType) {
  // Priority order:
  // 1. Recent path match (< 1 hour)
  // 2. Inode match with compatible path
  // 3. Path match with lost/deleted status
  // 4. New object
}
```

## Implementation Considerations

### Migration Strategy
- Existing data has UNIQUE constraint
- Need ALTER TABLE or recreate
- Backward compatibility concerns

### Performance Impact
- Additional lookups for identity resolution
- Index strategy for path-based queries
- Memory usage for mapping cache

### Event Type Simplification
- Current proposal: use 'refind' for both lost→found and delete→recreate
- Metadata can distinguish previous state
- Reduces event type proliferation

## Requested Decisions

1. **Primary Identity Model**: Which approach aligns with cctop's vision?
2. **Schema Design**: Specific table structure and constraints
3. **Identity Resolution Algorithm**: Concrete steps for object_id determination
4. **Migration Path**: How to handle existing installations
5. **API Contracts**: What guarantees do we provide about object identity?

## Timeline Impact

- Current lost/refind implementation is complete but may need revision
- Validator testing blocked on this decision
- Delete event object_id inheritance depends on resolution

## References

- BP-000 current schema definition
- Unix filesystem inode behavior documentation
- Similar tools (inotify, fswatch) approaches

Please provide architectural guidance on the fundamental object identity model and specific implementation direction.