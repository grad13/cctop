---
updated: 2026-03-17 12:08
checked: -
id: SPEC-S02
title: DirectoryStructureCreator - .cctop Directory Scaffolding
version: 2.1
status: draft
source:
  - path: code/app/shared/src/config/DirectoryStructureCreator.ts
    runtime: TypeScript (Node.js ESM)
type: supplement
supplements: local-setup-initialization.md
---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -

# DirectoryStructureCreator - .cctop Directory Scaffolding

## Meta
| Source | Runtime |
|--------|---------|
| `code/app/shared/src/config/DirectoryStructureCreator.ts` | TypeScript (Node.js ESM) |

## Contract

```typescript
export class DirectoryStructureCreator {
  create(configPath: string): void;
}
```

- `configPath`: The root path where the `.cctop` directory structure is created (typically the `.cctop/` path itself).

## Logic

### Directory Creation Order

The creator iterates a fixed list of subdirectories in order:

| Index | Relative Path | Purpose |
|-------|--------------|---------|
| 0 | `` (root) | `.cctop/` itself |
| 1 | `config` | Configuration files |
| 2 | `themes` | Color themes |
| 3 | `themes/custom` | User custom themes |
| 4 | `data` | Database files |
| 5 | `logs` | Log files |
| 6 | `cache` | Cache files |
| 7 | `runtime` | Runtime files (PID, socket) |
| 8 | `temp` | Temporary files |

### Supplement Details (not covered by local-setup-initialization.md)

The existing spec defines the directory structure layout but does not specify:

1. **`cache/` directory**: The spec lists `config/`, `themes/`, `data/`, `logs/`, `runtime/`, `temp/` but omits `cache/`. This implementation adds a `cache/` directory.

2. **Creation semantics**: Each directory is created with `recursive: true` and explicit permission mode `0o755`. Existing directories are skipped (`existsSync` check).

3. **Idempotency**: The `create()` method is idempotent. Repeated calls on the same path produce no errors and preserve existing directory contents.

4. **Separation from ConfigManager**: This class handles *only* directory creation, while `ConfigManager.initializeCctopStructure()` handles both directory creation and file generation. `DirectoryStructureCreator` is a focused, single-responsibility alternative.

## Side Effects

| Effect | Description |
|--------|-------------|
| Filesystem write | Creates up to 9 directories under `configPath` |
| Permission setting | Directories created with mode `0o755` |
