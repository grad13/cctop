---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -
id: SPEC-V-SUP-008
title: FileEventReader (Supplement)
version: 2.1
status: draft
source:
  - path: code/view/src/database/FileEventReader.ts
    runtime: TypeScript (Node.js ESM)
type: supplement
supplements: unique-file-cache-manager.md
created: 2026-03-14
---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -

# FileEventReader (Supplement)

## Meta
| Source | Runtime |
|--------|---------|
| `code/view/src/database/FileEventReader.ts` | TypeScript (Node.js ESM) |

Supplements: unique-file-cache-manager.md (Section 5: API - FileEventReader)

## Contract - Additional Methods Not in Existing Spec

The existing spec documents `getEventsAfterId()`. This supplement covers the full interface:

```typescript
class FileEventReader {
  constructor(dbPath: string);
  async connect(): Promise<void>;
  async disconnect(): Promise<void>;
  async getLatestEvents(limit?: number, mode?: 'all' | 'unique', offset?: number, filters?: string[]): Promise<any[]>;
  async searchEvents(params: SearchParams): Promise<any[]>;
  async getEventsAfterId(lastEventId: number, limit?: number): Promise<any[]>;
}
```

## Logic - QueryBuilder Delegation

Unlike EventQueryAdapter (which inlines SQL), FileEventReader delegates SQL generation to `QueryBuilder`:

| Operation | QueryBuilder Method |
|-----------|-------------------|
| Column selection | `QueryBuilder.selectColumns(alias)` |
| JOIN clauses | `QueryBuilder.joins(alias)` |
| Unique CTE | `QueryBuilder.uniqueCTE(whereClause)` |
| Filter condition | `QueryBuilder.filterCondition(filters)` |

### getEventsAfterId (incrementally fetches new events)

Query: `WHERE e.id > ? ORDER BY e.id ASC LIMIT ?`. Used by UniqueFileCacheManager for incremental cache updates.

## Side Effects

| Effect | Description |
|--------|-------------|
| SQLite | Opens read-only connection; executes SELECT queries |
