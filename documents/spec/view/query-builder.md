---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -
id: SPEC-V-NEW-001
title: SQL Query Builder
version: 2.1
status: draft
source:
  - path: code/view/src/database/QueryBuilder.ts
    runtime: TypeScript (Node.js ESM)
type: new
created: 2026-03-14
---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -

# SQL Query Builder

## Meta
| Source | Runtime |
|--------|---------|
| `code/view/src/database/QueryBuilder.ts` | TypeScript (Node.js ESM) |

## Contract

```typescript
class QueryBuilder {
  /** Generate SELECT column list with optional table alias */
  static selectColumns(alias?: string): string;

  /** Generate JOIN clauses (event_types + measurements) with optional table alias */
  static joins(alias?: string): string;

  /** Generate CTE for unique mode (latest event per file via ROW_NUMBER OVER PARTITION) */
  static uniqueCTE(whereClause?: string): string;

  /** Generate IN condition for event type filters; returns empty string if no filters or all types selected (>=6) */
  static filterCondition(filters?: string[]): string;
}
```

## Logic

### selectColumns

Returns a SQL fragment with the following columns:

| Column | Source | Notes |
|--------|--------|-------|
| id | e.id | Event ID |
| timestamp | e.timestamp | Event timestamp |
| filename | e.file_name | Aliased |
| directory | e.directory | Directory path |
| event_type | et.name | From event_types JOIN |
| size | COALESCE(m.file_size, 0) | Default 0 |
| lines | m.line_count | Nullable |
| blocks | m.block_count | Nullable |
| inode | COALESCE(m.inode, 0) | Default 0 |
| elapsed_ms | 0 | Hardcoded placeholder |

Alias substitution: replaces `e.` prefix with provided alias using regex `\be\.`.

### filterCondition Decision Table

| filters | filters.length | Result |
|---------|---------------|--------|
| undefined/null | - | empty string |
| [] | 0 | empty string |
| ['find','create','modify','delete','move','restore'] | >=6 | empty string |
| ['find','create'] | 2 | `et.name IN ('find','create')` |

### uniqueCTE

Generates a `WITH latest_events AS (...)` CTE using `ROW_NUMBER() OVER (PARTITION BY file_name, directory ORDER BY timestamp DESC)` to identify the latest event per unique file.

## Side Effects

None. Pure SQL string generation with no I/O or state mutation.
