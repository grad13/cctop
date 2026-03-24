---
updated: 2026-03-17 12:08
checked: -
id: SPEC-S01
title: ConfigFactory - Configuration Schema Generation
version: 2.1
status: draft
source:
  - path: code/app/shared/src/config/ConfigFactory.ts
    runtime: TypeScript (Node.js ESM)
type: supplement
supplements: local-setup-initialization.md
---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -

# ConfigFactory - Configuration Schema Generation

## Meta
| Source | Runtime |
|--------|---------|
| `code/app/shared/src/config/ConfigFactory.ts` | TypeScript (Node.js ESM) |

## Contract

```typescript
export class ConfigFactory {
  createSharedConfig(): object;
  createDaemonConfig(): object;
  createCliConfig(): object;
  createDefaultTheme(): object;
  createHighContrastTheme(): object;
}
```

All methods are pure factory methods with no constructor parameters. Each returns a plain object conforming to the corresponding config/theme schema.

## Logic

### Factory Method Mapping

| Method | Output Schema | Version | Purpose |
|--------|--------------|---------|---------|
| `createSharedConfig()` | shared-config.json | 0.5.2.6 | project, database, directories, logging |
| `createDaemonConfig()` | daemon-config.json | 0.5.2.6 | monitoring, daemon, database |
| `createCliConfig()` | cli-config.json | 0.5.2.6 | display, interaction, colors |
| `createDefaultTheme()` | default.json | - | Named color theme (terminal color names) |
| `createHighContrastTheme()` | high-contrast.json | - | High-visibility color theme (bright-* prefixed) |

### Supplement Details (not covered by local-setup-initialization.md)

The existing spec defines *what files are created* and *the directory structure*, but does not specify:

1. **Schema version**: All config objects embed `version: "0.5.2.6"` (evolved from the spec's `"0.3.0.0"`).

2. **Shared config defaults**:
   - `project.name` is derived from `path.basename(process.cwd())` (dynamic, not a static string).
   - `database.maxSize`: 100 MB (104857600 bytes).
   - `logging.maxFileSize`: 10 MB, `maxFiles`: 5, `datePattern`: "YYYY-MM-DD".

3. **Daemon config defaults**:
   - `monitoring.debounceMs`: 100, `monitoring.moveThresholdMs`: 100.
   - `monitoring.systemLimits.requiredLimit`: 524288 file descriptors.
   - `daemon.heartbeatInterval`: 30000 ms, `maxRestarts`: 3, `restartDelay`: 5000 ms.
   - `database.writeMode`: "WAL", `syncMode`: "NORMAL", `cacheSize`: 65536, `busyTimeout`: 5000 ms, `checkpointInterval`: 300000 ms.

4. **CLI config defaults**:
   - `display.columns`: 8-column layout with individual `visible` and `width` properties.
   - `directory.width: -1` indicates auto-fill (remaining terminal width).
   - `display.directoryMutePaths`: empty array for base path hiding.
   - `interaction`: mouse enabled, keyboard enabled, scrollSpeed 3.
   - `colors`: per-event-type color mapping (find=cyan, create=green, modify=yellow, delete=red, move=blue, restore=magenta).

5. **Theme structure difference**: Theme objects produced here use terminal color names (`"green"`, `"bright-green"`), distinct from the hex-based theme schema in `ConfigManager.ensureThemeFiles()`. The factory themes include `event` and `ui` sub-groups; ConfigManager themes use a flat color structure.

## Side Effects

- `createSharedConfig()` reads `process.cwd()` to determine `project.name`. All other methods are pure (no I/O, no side effects).
