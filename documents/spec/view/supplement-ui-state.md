---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -
id: SPEC-V-SUP-015
title: UIState (Supplement)
version: 2.1
status: draft
source:
  - path: code/view/src/ui/UIState.ts
    runtime: TypeScript (Node.js ESM)
type: supplement
supplements: filter-state-management.md
created: 2026-03-14
---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -

# UIState (Supplement)

## Meta
| Source | Runtime |
|--------|---------|
| `code/view/src/ui/UIState.ts` | TypeScript (Node.js ESM) |

Supplements: filter-state-management.md (Section 5: State Manager Implementation)

## Contract

```typescript
type DisplayState = 'stream_live' | 'event_type_filter' | 'keyword_filter' | 'stream_paused' | 'detail';
type DisplayMode = 'all' | 'unique';

class UIState {
  // Delegated sub-states
  private viewportState: UIViewportState;
  private dataState: UIDataState;
  private eventTypeFilters: EventTypeFilterFlags;
  private savedState?: SavedState;

  // State accessors and mutators (see full interface below)
}
```

## Logic - Implementation Details Not in Existing Spec

### State Delegation Architecture

The existing spec describes FilterStateManager as a single class. The implementation separates concerns into:

| Responsibility | Delegate |
|---------------|----------|
| Viewport/scroll | UIViewportState |
| Data loading/pagination | UIDataState |
| Event type filters | EventTypeFilterFlags |
| Core state (displayMode, displayState, searchPattern) | UIState directly |

### Edit Mode with Save/Restore

| Method | Behavior |
|--------|----------|
| `startEditing(type)` | Sets displayState to 'event_type_filter' or 'keyword_filter' |
| `cancelEditing()` | Restores from savedState, returns to 'stream_live' |
| `confirmEditing()` | Clears savedState, returns to 'stream_live' |
| `resetAllFilters()` | Clears all filters + search, returns to 'stream_live' |

### calculateDynamicWidth

Computes available viewport height: `terminalHeight - headerHeight(3) - controlHeight(4)`, minimum 1 row.

### Mode Switch Side Effects

`setDisplayMode()` resets viewport to top and re-enables data loading (`hasMoreData = true`).
