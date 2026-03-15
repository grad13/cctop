---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -
id: SPEC-S04
title: CLIConfig - CLI Configuration Type Definition
version: 2.1
status: draft
source:
  - path: code/shared/src/config/CLIConfig.ts
    runtime: TypeScript (Node.js ESM)
type: supplement
supplements: hierarchical-config-management.md
created: 2026-03-14
---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -

# CLIConfig - CLI Configuration Type Definition

## Meta
| Source | Runtime |
|--------|---------|
| `code/shared/src/config/CLIConfig.ts` | TypeScript (Node.js ESM) |

## Contract

```typescript
export interface CLIConfig {
  version: string;
  display: {
    maxRows: number;
    refreshInterval: number;
    refreshRateMs: number;
    showTimestamps: boolean;
    dateFormat: string;
    columnWidths: {
      time: number;
      event: number;
      size: number;
      path: number;
    };
    columns: {
      timestamp: { visible: boolean; width: number };
      elapsed:   { visible: boolean; width: number };
      fileName:  { visible: boolean; width: number };
      event:     { visible: boolean; width: number };
      lines:    { visible: boolean; width: number };
      blocks:   { visible: boolean; width: number };
      size:     { visible: boolean; width: number };
      directory: { visible: boolean; width: number };
    };
    directoryMutePaths?: string[];
  };
  interaction: {
    enableMouse: boolean;
    enableKeyboard: boolean;
    scrollSpeed: number;
  };
  colors: {
    info: string;
    success: string;
    warning: string;
    error: string;
    find: string;
    create: string;
    modify: string;
    delete: string;
    move: string;
    restore: string;
  };
  logFile?: string;

  // Legacy fields (backward compatibility)
  refreshInterval?: number;
  maxRows?: number;
  displayMode?: string;
  colorEnabled?: boolean;
}

export const defaultCLIConfig: CLIConfig;
```

## Supplement Details (not covered by hierarchical-config-management.md)

The existing spec defines the hierarchical config loading flow and shared-config schema, but does not detail the CLI-specific configuration structure.

### 1. Dual column definition system

The interface supports two column definition mechanisms:

| System | Purpose | Structure |
|--------|---------|-----------|
| `columnWidths` | Legacy fixed-width columns | `{ time, event, size, path }` (4 columns) |
| `columns` | Current per-column configuration | 8 columns, each with `visible` and `width` |

The `columns` system provides finer control with visibility toggles and supports `width: -1` for auto-fill (used by `directory` column to consume remaining terminal width).

### 2. Column layout specification

| Column | Default Width | Description |
|--------|--------------|-------------|
| timestamp | 19 | Date/time display (YYYY-MM-DD HH:mm:ss) |
| elapsed | 8 | Elapsed time since event |
| fileName | 35 | File name |
| event | 6 | Event type indicator |
| lines | 6 | Line count |
| blocks | 4 | Block count |
| size | 7 | File size |
| directory | -1 (auto) | Directory path (fills remaining width) |

### 3. Event color mapping

Maps event types to terminal color names. Includes `restore` event type (magenta) which extends beyond the base event set (find, create, modify, delete, move).

### 4. Legacy backward compatibility

Four root-level optional fields are preserved for backward compatibility with earlier config versions:

| Field | Maps to |
|-------|---------|
| `refreshInterval` | `display.refreshInterval` |
| `maxRows` | `display.maxRows` |
| `displayMode` | (display filter mode) |
| `colorEnabled` | (color toggle) |

### 5. directoryMutePaths

Optional `string[]` allowing users to specify base paths to hide from the directory column display. Defaults to empty array.

## Side Effects

None. This module exports only type definitions and a constant default value object.
