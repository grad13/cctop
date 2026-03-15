---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -
id: SPEC-D01
title: SQLite Trigger-based Aggregate Auto-update
version: 2.1
status: draft
source:
  - path: code/daemon/src/database/TriggerManager.ts
    runtime: TypeScript (Node.js ESM)
type: new
created: 2026-03-14
---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -

# SQLite Trigger-based Aggregate Auto-update

## Meta
| Source | Runtime |
|--------|---------|
| `code/daemon/src/database/TriggerManager.ts` | TypeScript (Node.js ESM) |

## Contract

```typescript
interface AggregateSelectOptions {
  useCoalesce: boolean;
  fileIdExpression: string;
}

export class TriggerManager {
  constructor(db: sqlite3.Database);
  createTriggers(): Promise<void>;
  recreateTriggers(): Promise<void>;
}
```

### Public API

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `createTriggers()` | - | `Promise<void>` | Drop existing triggers and create new ones |
| `recreateTriggers()` | - | `Promise<void>` | Alias for `createTriggers()` (full recreation) |

## State

No persistent state. Triggers are managed at the SQLite level.

## Logic

### Trigger Definition

Two triggers are created to maintain the `aggregates` table automatically:

| Trigger | Fires On | Condition | Action |
|---------|----------|-----------|--------|
| `trigger_maintain_aggregates_on_measurement` | `AFTER INSERT ON measurements` | Always | Delete + re-insert aggregate for the file |
| `trigger_maintain_aggregates_on_event` | `AFTER INSERT ON events` | `event_type_id IN (4, 5)` (delete, move) | Delete + re-insert aggregate for the file |

### Aggregate Calculation

Each trigger performs a full recalculation of the aggregate row for the affected file:

| Aggregate Column | Calculation |
|------------------|-------------|
| `period_start` | Start of current day (Unix timestamp) |
| `total_size`, `total_lines`, `total_blocks` | `SUM` of measurement values |
| `total_events` | `COUNT(DISTINCT e.id)` |
| `total_creates`, `total_modifies`, `total_deletes`, `total_moves`, `total_restores` | `SUM(CASE)` per event type code |
| `first_event_timestamp`, `last_event_timestamp` | `MIN`/`MAX` of event timestamps |
| `first_size`, `first_lines`, `first_blocks` | Subquery: earliest measurement value |
| `max_size`, `max_lines`, `max_blocks` | `MAX` of measurement values |
| `last_size`, `last_lines`, `last_blocks` | Subquery: latest measurement value |

### COALESCE Strategy

| Context | useCoalesce | Rationale |
|---------|-------------|-----------|
| Measurement trigger | `false` | Measurement always exists when fired from measurements insert |
| Event trigger (delete/move) | `true` | No measurement row exists for delete/move events; subqueries may return NULL |

### Trigger Lifecycle

1. **Drop Phase**: All legacy and current triggers are dropped unconditionally
2. **Create Phase**: Two new triggers are created in a single `exec` call
3. **Error Handling**: Drop errors are logged to stderr but do not block creation; creation errors reject the Promise

## Side Effects

- Modifies SQLite schema by creating/dropping triggers on `measurements` and `events` tables
- Triggers cause automatic writes to `aggregates` table on every measurement insert and on delete/move event inserts
- Stderr output on trigger drop errors
