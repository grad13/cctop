---
updated: 2026-03-17 12:08
checked: -
id: SPEC-V-SUP-024
title: UIDataState (Supplement)
version: 2.1
status: draft
source:
  - path: code/app/view/src/ui/state/UIDataState.ts
    runtime: TypeScript (Node.js ESM)
type: supplement
supplements: filter-state-management.md
---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -

# UIDataState (Supplement)

## Meta
| Source | Runtime |
|--------|---------|
| `code/app/view/src/ui/state/UIDataState.ts` | TypeScript (Node.js ESM) |

Supplements: filter-state-management.md (Section 5: State Manager Implementation)

## Contract

```typescript
class UIDataState {
  getEvents(): EventRow[];
  setEvents(events: EventRow[]): void;
  appendEvents(newEvents: EventRow[]): void;
  getCurrentOffset(): number;
  setCurrentOffset(offset: number): void;
  incrementOffset(amount: number): void;
  getTotalLoaded(): number;
  hasMoreDataToLoad(): boolean;
  setHasMoreData(hasMore: boolean): void;
  isLoadingMoreData(): boolean;
  setLoadingMore(loading: boolean): void;
  shouldLoadMoreData(selectedIndex: number, totalEvents: number): boolean;
  reset(): void;
  getEventsCount(): number;
  getDataInfo(): DataInfo;
}
```

## Logic - Not in Existing Spec

### shouldLoadMoreData (Preload Threshold)

Triggers preloading when the selected index is within 3 rows of the bottom:

```
selectedIndex >= totalEvents - 3 AND hasMoreData AND !isLoadingMore
```

This implements a look-ahead preload pattern for smooth infinite scrolling.

### setEvents vs appendEvents

| Method | Behavior |
|--------|----------|
| `setEvents()` | Replace all events, update totalLoaded |
| `appendEvents()` | Concatenate to existing, update totalLoaded |

### reset()

Resets all state to initial values: empty events, offset 0, hasMoreData true, loading false.
