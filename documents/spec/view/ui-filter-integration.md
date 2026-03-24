---
updated: 2026-03-14 16:09
checked: 2026-03-14 00:00
Deprecated: -
Format: spec-v2.1
Source: documents/visions/functions/FUNC-208-ui-filter-integration.md
---

# Specification: UI Filter Integration

## 0. Meta

| Source | Runtime |
|--------|---------|
| view/src/ui/ | Node.js |

| Field | Value |
|-------|-------|
| Related | view/view-display-integration.md, view/event-type-filtering.md, view/filter-state-management.md |
| Test Type | Unit |

## 1. Overview

Unified specification for three filter features (Display Mode, Event Filter, Keyword Filter). Achieves consistent behavior through a set-theoretic approach and fundamentally resolves processing order issues by defining **Unique processing = show the latest event per file**.

**Scope (in)**:
- Processing order definition for three filter features
- Integration of filtering logic
- Set-theoretic approach implementation strategy
- Proper display control rules for deleted files
- Correct processing order definition for unique mode + event filter

**Scope (out)**:
- Filter state management and persistence (FUNC-301 responsibility)
- Vanilla table management and operation history (FUNC-301 responsibility)
- Individual filter implementation (FUNC-202, FUNC-203 responsibility)
- Keyboard input processing (FUNC-300 responsibility)
- Database management (FUNC-000 responsibility)

## 2. Set Theory Approach

- **Table**: represents the current working set at a point in time
- **Operations**: all/unique, event filter, keyword filter each transform the set
- **Display**: the final set is rendered to the CLI

**Update flow** (implemented in FUNC-301):
```
1. vanilla table set is updated
2. apply operation history
3. if new elements exist, reflect on screen
```

## 3. Responsibility Separation

| Component | Responsibility |
|-----------|---------------|
| FUNC-208 (this spec) | Filter processing order, unique mode behavior, deleted file rules |
| FUNC-301 | FilterState management, vanilla table, operation history |

## 4. Unique Mode Definition

**"unique = show the latest event per file"**

**Processing order: Unique First → Filter Check**

1. Identify the latest event for each file
2. Check whether that latest event satisfies the event filter conditions
3. Display only files whose latest event passes the filter

**Concrete example**:
```
File A: Create → Modify → Delete (latest)
Event filter: Delete excluded
Result: File A is entirely hidden (Create and Modify are not shown)
```

## 5. Filter Details

### Display Mode (all / unique)

**All Mode**:
- Show all events in time order
- Multiple events for the same file appear as separate rows

**Unique Mode**:
- Show only the latest event per file
- Implemented via GROUP BY file_id to get latest event_id

### Event Filter

- Target events: Create, Modify, Delete, Move, Find, Restore
- Shows only checked event types
- SQL: `WHERE event_type IN (...)`

### Keyword Filter

- Target fields: file_name, directory
- Partial match: `WHERE (file_name LIKE '%keyword%' OR directory LIKE '%keyword%')`
- **Execution timing**: NOT real-time; DB search triggered by `[Shift+Enter]`
- Search results are merged into the vanilla table set

## 6. ESC / Enter Key Behavior

| Context | Key | Action |
|---------|-----|--------|
| Edit mode (filter/search input) | `[ESC]` | Discard edits, restore pre-edit state, return to normal mode |
| Edit mode (filter/search input) | `[Enter]` | Keep edits, overwrite filter settings, return to normal mode |
| Keyword filter input | `[Shift+Enter]` | Execute DB search |
| Normal mode | `[ESC]` | Clear all edits; reset to all mode + no filters |

## 7. Application Timing

- **Real-time**: all filter operations except keyword DB search
- **Exception**: keyword search DB lookup triggered by `[Shift+Enter]`

## 8. State Visualization

| Filter | Visualization |
|--------|--------------|
| Display Mode (all/unique) | Active mode highlighted in red |
| Event Filter | Visible through current display content |
| Keyword Filter | Shown at top of screen |

## 9. Screen Update Control

When a newly added DB event does not match current filter conditions:
- **No screen update** (retained in table only)

## 10. Progressive Data Fetching

- Initial fetch: 100 records
- Progressive up to 1000 records maximum
- Repeat until 50 displayable records are secured
- Include filter conditions in SQL for efficiency

## 11. Dynamic Data Loading Triggers

- Screen rows not filled
- Selected row reaches bottom of table
- 100ms polling
- "end of data not visible" condition with above triggers

On trigger: re-apply operation history, reflect results on screen.

## 12. Processing Order Independence

- Event filter and keyword filter are **AND conditions (non-contradicting)**
- Combined with unique processing: **order-independent**
- Simplified by the "latest event per file" definition

## 13. Implementation Constraints

| Item | Constraint |
|------|-----------|
| Memory usage | ~1GB is sufficient |
| Error handling | Output to .cctop directory |
| UI implementation details | Runner discretion |
| End-of-data display | Show when no matching data |

## 14. Test Requirements

- Deleted files are properly excluded in Unique Mode
- Expected behavior for filter combinations
- Edge cases (file with only delete event, etc.)
- All 3 filters applied simultaneously
- Independence of each filter
- ESC filter clear behavior
