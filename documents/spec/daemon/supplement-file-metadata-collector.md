---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -
id: SPEC-D09
title: "Supplement: File Metadata Collection"
version: 2.1
status: draft
source:
  - path: code/daemon/src/events/FileMetadataCollector.ts
    runtime: TypeScript (Node.js ESM)
type: supplement
supplements: chokidar-database-integration.md
created: 2026-03-14
---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -

# Supplement: File Metadata Collection

## Meta
| Source | Runtime |
|--------|---------|
| `code/daemon/src/events/FileMetadataCollector.ts` | TypeScript (Node.js ESM) |

**Supplements**: `chokidar-database-integration.md` -- covers the filesystem stat collection step referenced in the integration spec's event processing pipeline.

## Scope of Supplement

The integration spec mentions "file info collection (stat)" as part of event processing (section 6.1, EventProcessor responsibilities). This supplement specifies the dedicated class that encapsulates `fs.stat` calls with error handling.

## Contract

```typescript
export interface FileMetadata {
  inode: number;
  size: number;
}

export class FileMetadataCollector {
  constructor(logger: LogManager);
  collect(filePath: string): Promise<FileMetadata | null>;
}
```

### Public API

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `collect` | `filePath: string` | `Promise<FileMetadata \| null>` | Retrieve inode and size via `fs.stat`; `null` on error |

## State

No internal state.

## Logic

### Collection Flow

| Step | Operation | On Error |
|------|-----------|----------|
| 1 | `fs.stat(filePath)` | Log warning, return `null` |
| 2 | Extract `ino` and `size` from stat result | - |
| 3 | Debug log with filePath, inode, size | - |
| 4 | Return `{ inode: stats.ino, size: stats.size }` | - |

### Error Handling

Returns `null` (not throws) when stat fails. This allows callers to gracefully handle missing/inaccessible files without try/catch.

## Side Effects

- `fs.stat` system call on the given file path
- Debug logging via `LogManager` on success
- Warning logging via `LogManager` on error
