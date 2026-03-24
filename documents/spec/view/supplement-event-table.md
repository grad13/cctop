---
updated: 2026-03-17 12:08
checked: -
id: SPEC-V-SUP-017
title: EventTable Component (Supplement)
version: 2.1
status: draft
source:
  - path: code/app/view/src/ui/components/EventTable/EventTable.ts
    runtime: TypeScript (Node.js ESM)
type: supplement
supplements: view-display-integration.md
---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -

# EventTable Component (Supplement)

## Meta
| Source | Runtime |
|--------|---------|
| `code/app/view/src/ui/components/EventTable/EventTable.ts` | TypeScript (Node.js ESM) |

Supplements: view-display-integration.md (Section 12: Component Design)

## Logic - Not in Existing Spec

### Row Instance Management

EventTable maintains a `Map<number, EventRow>` keyed by event ID. On each update:
1. Remove rows whose IDs are no longer present
2. Update existing rows with new data
3. Create new EventRow instances for new IDs
4. Update selection state on all affected rows

### Diff-Based Rendering

`updateBoxContent()` strips blessed tags from both current and new content, then compares plain text. Screen render is skipped if content is unchanged.

### Dynamic Directory Width

`calculateDirectoryWidth()` sums all fixed-width columns from ViewConfig, adds spacing, then assigns remaining terminal width to directory (minimum 20 chars).

### End of Data Indicator

When `hasMoreData === false`, renders a centered `--- end of data ---` message in bold white below the last row.

### EventTableViewport Interface

Implements `EventTableViewport` with `updateContent()`, `getColumnHeader()`, `getViewportInfo()`, `refresh()`, `getBox()`, `updateScreenWidth()`, `setViewConfig()`.
