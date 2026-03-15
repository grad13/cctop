---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -
id: SPEC-V-NEW-006
title: Event Query Adapter
version: 2.1
status: draft
source:
  - path: code/view/src/database/EventQueryAdapter.ts
    runtime: TypeScript (Node.js ESM)
type: new
created: 2026-03-14
---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -

# Event Query Adapter

## Meta
| Source | Runtime |
|--------|---------|
| `code/view/src/database/EventQueryAdapter.ts` | TypeScript (Node.js ESM) |

## Contract

```typescript
class EventQueryAdapter {
  constructor(dbPath: string);
  async connect(): Promise<void>;
  async disconnect(): Promise<void>;
  async getLatestEvents(limit?: number, mode?: 'all' | 'unique', offset?: number, filters?: string[]): Promise<any[]>;
  async searchEvents(params: {
    keyword: string;
    filters?: string[];
    mode?: 'all' | 'unique';
    limit?: number;
    offset?: number;
  }): Promise<any[]>;
}
```

## Logic

### Connection Management

Opens SQLite database in `OPEN_READONLY` mode. All queries are read-only. Connection must be established before queries.

### getLatestEvents

| Mode | Strategy |
|------|----------|
| all | Direct query on events table with optional filter WHERE clause, ORDER BY id DESC |
| unique | CTE with ROW_NUMBER OVER PARTITION BY (file_name, directory), filter applied in CTE WHERE clause |

Both modes: LIMIT + OFFSET pagination, filter condition bypassed when no filters or all 6 types selected.

### searchEvents

| Mode | Strategy |
|------|----------|
| all | WHERE (file_name LIKE ? OR directory LIKE ?) AND event filter, ORDER BY timestamp DESC |
| unique | CTE with search in WHERE, filter applied post-CTE, ORDER BY timestamp DESC |

Search uses `%keyword%` LIKE pattern on both file_name and directory.

### Differences from FileEventReader

This adapter contains inline SQL construction. FileEventReader delegates SQL fragment generation to QueryBuilder. Both provide the same query interface but EventQueryAdapter is the older, self-contained implementation.

## Side Effects

| Effect | Description |
|--------|-------------|
| SQLite connection | Opens read-only database connection |
| Database queries | Executes SELECT queries against SQLite |
