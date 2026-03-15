---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -
id: SPEC-V-SUP-011
title: UI Data Manager (Supplement)
version: 2.1
status: draft
source:
  - path: code/view/src/ui/UIDataManager.ts
    runtime: TypeScript (Node.js ESM)
type: supplement
supplements: runtime-control-management.md
created: 2026-03-14
---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -

# UI Data Manager (Supplement)

## Meta
| Source | Runtime |
|--------|---------|
| `code/view/src/ui/UIDataManager.ts` | TypeScript (Node.js ESM) |

Supplements: runtime-control-management.md (Section 3: Manual Refresh)

## Contract

```typescript
class UIDataManager {
  constructor(db: FileEventReader, uiState: UIState);
  clearUniqueCache(): void;
  async loadMore(): Promise<void>;
  async refreshData(append?: boolean): Promise<void>;
  async performDatabaseSearch(): Promise<void>;
  reset(): void;
  getState(): DataManagerState;
}
```

## Logic - Not Covered by Existing Spec

The existing spec describes manual refresh conceptually. This supplement documents data loading strategies:

### Concurrency Control

- `isRefreshing` flag prevents concurrent refresh operations
- `loadMorePromise` ensures single in-flight loadMore operation (subsequent calls await the same promise)
- Auto-refresh skipped during loadMore

### refreshData Strategy

| Search pattern | Mode | Strategy |
|---------------|------|----------|
| Active | any | `db.searchEvents()` with mode and filters; hasMoreData = false |
| None | unique | Delegate to `refreshUniqueMode()` via UniqueFileCacheManager |
| None | all | Direct `db.getLatestEvents()` with LIMIT 100 + offset |

### refreshAllMode Pagination

- Fetches 100 events per batch
- `hasMoreData` set to true only when rawEvents.length === limit
- Append mode concatenates with existing events

### performDatabaseSearch

Executes `db.searchEvents()` with current UIState search pattern, mode, and active filters. No pagination (results are complete).
