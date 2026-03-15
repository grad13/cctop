---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -
id: SPEC-V-SUP-014
title: BlessedFramelessUI (Supplement)
version: 2.1
status: draft
source:
  - path: code/view/src/ui/BlessedFramelessUI.ts
    runtime: TypeScript (Node.js ESM)
type: supplement
supplements: view-display-integration.md
created: 2026-03-14
---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -

# BlessedFramelessUI (Supplement)

## Meta
| Source | Runtime |
|--------|---------|
| `code/view/src/ui/BlessedFramelessUI.ts` | TypeScript (Node.js ESM) |

Supplements: view-display-integration.md (Section 8: Display Modes, Section 13: Pause/Resume)

## Contract

```typescript
interface UIFramelessConfigSimple {
  refreshInterval?: number;
  maxRows?: number;
  displayMode?: DisplayMode;
  viewConfig?: ViewConfig;
}

class BlessedFramelessUISimple {
  constructor(db: FileEventReader, config?: UIFramelessConfigSimple);
  async start(): Promise<void>;
  async stop(): Promise<void>;
}
```

## Logic - Orchestration Not in Existing Spec

This class is the main UI controller. The existing spec covers display modes and pause/resume at specification level. This supplement documents the orchestration:

### start() Sequence

1. Load configuration (ViewConfig from files or defaults)
2. Initialize daemon monitor
3. Create blessed screen via UIScreenManager
4. Create layout via UILayoutManager
5. Setup key handlers via UIKeyHandler (with callback wiring)
6. Register terminal resize handler
7. Initial data refresh
8. Auto-fill screen (loop loadMore until screen is filled or no more data)
9. Start periodic refresh timer

### Auto-Refresh Guard Conditions

The periodic refresh (default 1000ms from config) skips when:
- UI is paused
- Data is currently loading
- Viewport is scrolled down (top row not visible)
- Filters active with no more data available

### autoFillScreen

Loops `loadMore()` until:
- `shouldLoadMoreData()` returns false
- `hasMoreDataToLoad()` returns false
- No new events loaded in iteration
- Total events exceed 1000 (safety limit)

### Daemon Status Integration

`updateDaemonStatus()` is called asynchronously (fire-and-forget) during each refresh. Status displayed as colored blessed tags in the header.
