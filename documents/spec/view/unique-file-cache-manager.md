---
Created: 2026-03-13
Updated: 2026-03-13
Checked: -
Deprecated: -
Format: spec-v2.1
Source: documents/visions/functions/FUNC-211-unique-file-cache-manager.md
---

# Specification: Unique File Cache Manager

## 0. Meta

| Source | Runtime |
|--------|---------|
| view/src/cache/UniqueFileCacheManager.ts | Node.js |

| Field | Value |
|-------|-------|
| Related | view/view-display-integration.md, view/ui-filter-integration.md |
| Test Type | Unit |

## 1. Overview

unique modeの表示パフォーマンスを最適化するキャッシュ機構。イベント駆動の差分更新によりディスクI/Oを99%以上削減する。

Implemented: v0.6.7

## 2. Problem

従来の実装では unique mode で毎refresh（100ms）に全テーブルスキャンが発生していた:
- Window Function (`ROW_NUMBER OVER PARTITION BY`) による一時テーブル作成
- SQLite が一時データをディスクに書き込み → 約2MB/s の継続的書き込み
- SSD寿命への悪影響

Root cause: "compute all then filter" design ignoring coding patterns (concentration, completion, temporal locality).

## 3. Architecture

```
┌─────────────────────────────────────────┐
│          UniqueFileCacheManager         │
├─────────────────────────────────────────┤
│  fileMap: Map<string, EventRow>         │  ← file path → event
│  orderedKeys: string[]                  │  ← display order (newest first)
│  lastProcessedEventId: number           │  ← incremental update marker
└─────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│           UIDataManager                 │
├─────────────────────────────────────────┤
│  refreshUniqueMode()                    │
│    - cache not initialized → initialize()│
│    - initialized → getEventsAfterId()   │
│                  → updateWithNewEvents() │
└─────────────────────────────────────────┘
```

## 4. Algorithm

### Initial Load

```
1. DB.getLatestEvents(500, 'all')  - fetch latest events
2. uniqueCache.initialize(events)  - build cache
3. uniqueCache.getDisplayData(0, 100)  - get display data
```

### Periodic Refresh

```
1. DB.getEventsAfterId(lastProcessedEventId)  - fetch diff
2. No new events → do nothing (zero I/O)
3. New events → uniqueCache.updateWithNewEvents(events)
   - Existing file: update + move to head
   - New file: insert at head
```

## 5. API

### UniqueFileCacheManager

```typescript
class UniqueFileCacheManager {
  // initialization
  initialize(events: EventRow[]): void;
  isInitialized(): boolean;

  // incremental update
  updateWithNewEvents(newEvents: EventRow[]): boolean;
  getLastProcessedEventId(): number;

  // display data retrieval
  getDisplayData(offset: number, limit: number): EventRow[];
  getAllEvents(): EventRow[];
  hasMoreData(offset: number): boolean;

  // management
  clear(): void;
  getCachedCount(): number;
}
```

### FileEventReader (additional method)

```typescript
// fetch events after specified ID (for incremental update)
async getEventsAfterId(lastEventId: number, limit?: number): Promise<EventRow[]>;
```

## 6. Performance

| Operation | Before | After |
|-----------|--------|-------|
| Periodic refresh (no changes) | O(n) + temp table | O(1), 0 results |
| Periodic refresh (1 change) | O(n) + temp table | O(1), 1 result |
| Disk I/O | ~2MB/s | near zero |
| CPU usage | high (Window Function) | low |

## 7. Configuration

```json
// .cctop/config/view-config.json
{
  "display": {
    "refreshRateMs": 1000
  }
}
```

## 8. Source Files

| File | Role |
|------|------|
| `view/src/cache/UniqueFileCacheManager.ts` | Cache management |
| `view/src/cache/index.ts` | Exports |
| `view/src/database/FileEventReader.ts` | Incremental query |
| `view/src/ui/UIDataManager.ts` | Integration |

## 9. Future Enhancements

- LRU-based memory management (automatic eviction of stale entries)
- Cache optimization when filters are applied
- Integration with search mode

## 10. Related

- REP-0176: Unique Mode Disk Write Performance Issue
- FUNC-206 / view-display-integration.md: Instant View Progressive Loading
