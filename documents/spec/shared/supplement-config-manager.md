---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -
id: SPEC-S03
title: ConfigManager - Unified Configuration Management (TypeScript Implementation)
version: 2.1
status: draft
source:
  - path: code/shared/src/config-manager.ts
    runtime: TypeScript (Node.js ESM)
type: supplement
supplements: config-manager-implementation.md
created: 2026-03-14
---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -

# ConfigManager - Unified Configuration Management (TypeScript Implementation)

## Meta
| Source | Runtime |
|--------|---------|
| `code/shared/src/config-manager.ts` | TypeScript (Node.js ESM) |

## Contract

```typescript
export interface CctopConfig {
  daemon: {
    pidFile: string;
    logFile: string;
    heartbeatInterval: number;
  };
  database: {
    path: string;
    walMode: boolean;
    timeout: number;
  };
  monitoring: {
    watchPaths: string[];
    excludePatterns: string[];
    maxDepth: number;
    moveThresholdMs: number;
  };
  ui: {
    refreshInterval: number;
    maxRows: number;
    theme: string;
  };
}

export class ConfigManager {
  constructor(workingDirectory?: string);

  // Initialization
  initializeCctopStructure(): Promise<void>;

  // Config CRUD
  loadConfig(): CctopConfig;
  saveConfig(config: CctopConfig): void;

  // Path accessors
  getDatabasePath(): string;
  getPidFilePath(): string;
  getLogFilePath(): string;

  // Status
  isInitialized(): boolean;
}
```

## Supplement Details (not covered by config-manager-implementation.md)

The existing spec describes the JavaScript reference implementation. This TypeScript implementation differs in several ways:

### 1. CctopConfig interface

The spec defines config resolution and validation in JavaScript. The TypeScript implementation introduces a concrete `CctopConfig` interface with 4 top-level sections (`daemon`, `database`, `monitoring`, `ui`), which differs from the spec's schema that uses `display` instead of `ui` and includes `encoding` and `version` at the root.

### 2. Config file layout

| Aspect | Spec (JS) | Implementation (TS) |
|--------|-----------|---------------------|
| Main config path | `.cctop/config.json` | `.cctop/config/cctop.json` |
| Additional configs | None | `daemon-config.json`, `cli-config.json` |
| Config sections | monitoring, database, display | daemon, database, monitoring, ui |

### 3. Synchronous API

The spec uses async `fs.promises` for all operations. The TypeScript implementation uses **synchronous** `fs` for `loadConfig()`, `saveConfig()`, and `isInitialized()`. Only `initializeCctopStructure()` and its private helpers are async.

### 4. Merge with defaults

```
mergeWithDefaults(userConfig: Partial<CctopConfig>): CctopConfig
```

Performs a **shallow merge per section** (spread operator). This means nested properties within a section are not individually merged -- if a user provides a partial `daemon` section, unspecified fields within `daemon` fall back to defaults, but nested objects are replaced entirely.

### 5. Theme file generation

The `ensureThemeFiles()` method generates themes with **hex color values** (`#ffffff`, `#00ff00`), using a flat `colors` structure. This differs from `ConfigFactory.createDefaultTheme()` which uses terminal color names and grouped structure.

Additionally, `ensureThemeFiles()` creates a `current-theme.json` pointer:
```json
{ "active": "default", "path": "./default.json" }
```

### 6. .gitignore generation

The `createGitignore()` method generates a `.gitignore` that excludes `data/`, `logs/`, `runtime/`, `temp/`, and `themes/custom/`.

## State

No internal mutable state beyond `workingDirectory` (set once in constructor). All config reads go to disk on each call (no caching).

## Side Effects

| Method | Effect |
|--------|--------|
| `initializeCctopStructure()` | Creates directory tree, writes config files, theme files, and `.gitignore` |
| `saveConfig()` | Overwrites `.cctop/config/cctop.json` |
| `loadConfig()` | Reads from filesystem; logs warning to `console.warn` on parse failure |
| `getDatabasePath()` | Reads config from disk (delegates to `loadConfig()`) |
| `getPidFilePath()` | Reads config from disk (delegates to `loadConfig()`) |
| `getLogFilePath()` | Reads config from disk (delegates to `loadConfig()`) |
