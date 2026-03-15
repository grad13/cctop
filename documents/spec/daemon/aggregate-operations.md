---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -
id: SPEC-D02
title: Aggregate Data Read Operations
version: 2.1
status: draft
source:
  - path: code/daemon/src/database/AggregateOperations.ts
    runtime: TypeScript (Node.js ESM)
type: new
created: 2026-03-14
---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -

# Aggregate Data Read Operations

## Meta
| Source | Runtime |
|--------|---------|
| `code/daemon/src/database/AggregateOperations.ts` | TypeScript (Node.js ESM) |

## Contract

```typescript
export class AggregateOperations {
  constructor(db: sqlite3.Database);
  getAggregateData(filePath?: string): Promise<any[]>;
  getGlobalStatistics(): Promise<any>;
  getFileStatistics(filePath: string): Promise<any>;
  getTopFilesByEvents(limit?: number): Promise<any[]>;
}
```

### Public API

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `getAggregateData` | `filePath?: string` | `Promise<any[]>` | Aggregate data with file info, optionally filtered by path |
| `getGlobalStatistics` | - | `Promise<any>` | Cross-file summary statistics |
| `getFileStatistics` | `filePath: string` | `Promise<any \| null>` | Aggregate data for a specific file |
| `getTopFilesByEvents` | `limit?: number` (default: 10) | `Promise<any[]>` | Files ranked by total event count |

## State

No internal state. All operations are stateless read queries against the `aggregates` and `files` tables.

## Logic

### Query Patterns

| Method | Tables Joined | Filter | Order | Limit |
|--------|---------------|--------|-------|-------|
| `getAggregateData` | `aggregates JOIN files` | Optional `file_path = ?` | `last_updated DESC` | None |
| `getGlobalStatistics` | `aggregates` (with subquery on `files`) | None | N/A | Single row |
| `getFileStatistics` | `aggregates JOIN files` | `file_path = ?` | N/A | Single row |
| `getTopFilesByEvents` | `aggregates JOIN files` | None | `total_events DESC` | Parameter (default 10) |

### Global Statistics Columns

| Statistic | Calculation |
|-----------|-------------|
| Event type totals | `SUM` of each event type count |
| `total_files` | `COUNT(*)` of aggregate rows |
| `active_files` | Count where `files.is_active = 1` |
| `total_current_size` | `SUM(last_size)` |
| `avg_file_size` | `AVG(last_size)` |
| `largest_file_size` | `MAX(max_size)` |
| `smallest_file_size` | `MIN(last_size)` where `last_size > 0` |
| `earliest_event` / `latest_event` | `MIN` / `MAX` of event timestamps |

## Side Effects

- Read-only database access; no writes
