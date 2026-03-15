---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -
id: SPEC-S05
title: DaemonConfig - Daemon Configuration Type Definition
version: 2.1
status: draft
source:
  - path: code/shared/src/config/DaemonConfig.ts
    runtime: TypeScript (Node.js ESM)
type: supplement
supplements: hierarchical-config-management.md
created: 2026-03-14
---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -

# DaemonConfig - Daemon Configuration Type Definition

## Meta
| Source | Runtime |
|--------|---------|
| `code/shared/src/config/DaemonConfig.ts` | TypeScript (Node.js ESM) |

## Contract

```typescript
export interface DaemonConfig {
  version: string;
  monitoring: {
    watchPaths: string[];
    excludePatterns: string[];
    debounceMs: number;
    maxDepth: number;
    moveThresholdMs: number;
    useFsEvents?: boolean;
    usePolling?: boolean;
    ignoreInitial?: boolean;
    startupDelayMs?: number;
    systemLimits: {
      requiredLimit: number;
      checkOnStartup: boolean;
      warnIfInsufficient: boolean;
    };
  };
  daemon: {
    pidFile: string;
    logFile: string;
    logLevel: string;
    heartbeatInterval: number;
    autoStart: boolean;
    maxRestarts: number;
    restartDelay: number;
  };
  database: {
    writeMode: string;
    syncMode: string;
    cacheSize: number;
    busyTimeout: number;
    checkpointInterval: number;
  };
}

export const defaultDaemonConfig: DaemonConfig;
```

## Supplement Details (not covered by hierarchical-config-management.md)

The existing spec covers shared config structure and merge strategy but does not detail daemon-specific configuration types.

### 1. macOS FSEvents tuning options

Four optional monitoring fields provide platform-specific watcher tuning:

| Field | Default | Purpose |
|-------|---------|---------|
| `useFsEvents` | `true` (implicit) | Use macOS native FSEvents. Set `false` to reduce disk writes |
| `usePolling` | `false` (implicit) | Fall back to polling mode if FSEvents causes issues |
| `ignoreInitial` | `false` (implicit) | Skip initial file scan to reduce startup disk I/O |
| `startupDelayMs` | `0` (implicit) | Delay before starting watcher (3000-5000 recommended to wait for FSEvents cache) |

These options are not present in `CctopConfig` (config-manager.ts) and represent daemon-specific tuning that emerged after the initial config design.

### 2. System limits configuration

The `systemLimits` sub-object controls file descriptor limit checking:

| Field | Default | Purpose |
|-------|---------|---------|
| `requiredLimit` | 524288 | Required file descriptor limit for reliable monitoring |
| `checkOnStartup` | `true` | Check system limits when daemon starts |
| `warnIfInsufficient` | `true` | Emit warning if limits are below required threshold |

### 3. Daemon lifecycle management

| Field | Default | Purpose |
|-------|---------|---------|
| `autoStart` | `true` | Auto-start daemon when CLI launches |
| `maxRestarts` | 3 | Maximum restart attempts on crash |
| `restartDelay` | 5000 ms | Delay between restart attempts |
| `logLevel` | `"info"` | Daemon log verbosity |

### 4. Database performance tuning

The daemon's database section is more detailed than `CctopConfig.database`:

| Field | Default | Purpose |
|-------|---------|---------|
| `writeMode` | `"WAL"` | SQLite journal mode |
| `syncMode` | `"NORMAL"` | SQLite synchronous pragma |
| `cacheSize` | 65536 | SQLite cache size (pages) |
| `busyTimeout` | 5000 ms | SQLite busy timeout |
| `checkpointInterval` | 300000 ms (5 min) | WAL checkpoint interval |

Compared to `CctopConfig.database` which only has `path`, `walMode` (boolean), and `timeout`, this interface provides granular SQLite performance tuning.

### 5. Default exclude patterns

The default exclude list is more comprehensive than `CctopConfig`:

```
**/node_modules/**, **/.git/**, **/.*,
**/.cctop/**, **/dist/**, **/coverage/**,
**/build/**, **/*.log, **/.DS_Store
```

Notable additions vs `CctopConfig`: `**/.*` (all dotfiles), `**/coverage/**`, `**/build/**`, `**/*.log`, `**/.DS_Store`.

## Side Effects

None. This module exports only type definitions and a constant default value object.
