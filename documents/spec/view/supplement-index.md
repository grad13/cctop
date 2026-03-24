---
updated: 2026-03-17 12:08
checked: -
id: SPEC-V-SUP-009
title: View Entry Point (Supplement)
version: 2.1
status: draft
source:
  - path: code/app/view/src/index.ts
    runtime: TypeScript (Node.js ESM)
type: supplement
supplements: view-interface-specification.md
---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -

# View Entry Point (Supplement)

## Meta
| Source | Runtime |
|--------|---------|
| `code/app/view/src/index.ts` | TypeScript (Node.js ESM) |

Supplements: view-interface-specification.md (Section 4: Default Startup Behavior)

## Contract

```typescript
class CCTOPCli {
  constructor(args?: CLIArguments);
  async start(): Promise<void>;
  async stop(): Promise<void>;
}

async function main(): Promise<void>;
```

## Logic - Startup Sequence Implementation

The existing spec describes the startup sequence conceptually. This supplement documents the concrete implementation:

### findDatabasePath

| Condition | Behavior |
|-----------|----------|
| `--view` mode + DB missing | Throw error with guidance |
| `--view` mode + DB exists | Use existing DB path |
| Normal mode + `.cctop/` missing | Call `initializeCctopStructure()` |
| Normal mode + `.cctop/` exists | Use existing path |

Database path: `{targetDir}/.cctop/data/activity.db`

### initializeCctopStructure

Creates directories: `config/`, `themes/`, `data/`, `logs/`, `runtime/`, `temp/` under `.cctop/`.

### start() Sequence

1. Create `FileEventReader` with database path
2. Connect to database
3. Create `BlessedFramelessUISimple` with default `displayMode: 'all'`
4. Call `ui.start()`

### Signal Handling

`SIGINT` and `SIGTERM` both call `process.exit(0)`.

## Side Effects

| Effect | Description |
|--------|-------------|
| Filesystem | Creates `.cctop/` directory structure |
| Process | Registers signal handlers, calls `process.exit()` |
