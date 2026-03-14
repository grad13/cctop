---
Created: 2026-03-13
Updated: 2026-03-13
Checked: -
Deprecated: -
Format: spec-v2.1
Source: documents/visions/functions/FUNC-101-hierarchical-config-management.md
---

# Specification: Hierarchical Config Management

## 0. Meta

| Source | Runtime |
|--------|---------|
| shared/src/config/SharedConfig.ts, shared/src/config-manager.ts, shared/src/config/index.ts | Node.js |

| Field | Value |
|-------|-------|
| Related | local-setup-initialization.md, daemon-configuration-management.md, view-configuration-management.md |
| Test Type | Unit |

## 1. Overview

Manages basic settings shared between Daemon and CLI. Handles settings that require system-wide consistency: database path, base directories, project information.

**User value**:
- System-wide consistency assurance
- Configuration deduplication
- Centralized management of basic settings
- Unified version management

## 2. Scope

**In scope**:
- `shared-config.json` loading
- Basic settings management for the entire project
- Database path management
- Version information management
- Basic config merge logic provision

**Out of scope**:
- Daemon-specific settings (daemon-configuration-management responsibility)
- View-specific settings (view-configuration-management responsibility)
- Color theme management
- Config file initialization (local-setup-initialization responsibility)

## 3. Directory Structure

```
.cctop/
├── config/
│   ├── shared-config.json    # common settings (this spec)
│   ├── view-config.json      # display settings (view-configuration-management)
│   ├── daemon-config.json    # Daemon settings (daemon-configuration-management)
│   └── cli-config.json       # CLI settings
├── themes/
│   ├── current-theme.json    # currently applied color settings
│   ├── default.json          # default theme
│   ├── high-contrast.json    # high contrast theme
│   └── custom/               # user custom themes
├── data/
│   ├── activity.db
│   ├── activity.db-wal
│   └── activity.db-shm
├── logs/
│   ├── daemon.log
│   └── cli.log
├── runtime/
│   ├── daemon.pid
│   └── daemon.sock
├── temp/
└── .gitignore
```

## 4. Config Loading Hierarchy

1. `config/shared-config.json` - basic settings (required)
2. `config/view-config.json` - display settings (for CLI, required)
3. Process-specific settings - `config/daemon-config.json` or `config/cli-config.json`
4. CLI arguments - temporary override

## 5. shared-config.json Schema

```json
{
  "version": "0.3.0.0",
  "project": {
    "name": "cctop",
    "description": "Code Change Top - Real-time file monitoring tool"
  },
  "database": {
    "path": ".cctop/data/activity.db",
    "maxSize": 104857600
  },
  "directories": {
    "config": ".cctop/config",
    "themes": ".cctop/themes",
    "data": ".cctop/data",
    "logs": ".cctop/logs",
    "runtime": ".cctop/runtime",
    "temp": ".cctop/temp"
  },
  "logging": {
    "maxFileSize": 10485760,
    "maxFiles": 5,
    "datePattern": "YYYY-MM-DD"
  }
}
```

## 6. JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2019-09/schema",
  "type": "object",
  "required": ["version", "project", "database", "directories"],
  "properties": {
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+\\.\\d+$"
    },
    "project": {
      "type": "object",
      "required": ["name", "description"],
      "properties": {
        "name": { "type": "string" },
        "description": { "type": "string" }
      }
    },
    "database": {
      "type": "object",
      "required": ["path"],
      "properties": {
        "path": { "type": "string" },
        "maxSize": { "type": "integer", "minimum": 1048576 }
      }
    },
    "directories": {
      "type": "object",
      "required": ["config", "themes", "data", "logs", "runtime", "temp"],
      "properties": {
        "config":  { "type": "string" },
        "themes":  { "type": "string" },
        "data":    { "type": "string" },
        "logs":    { "type": "string" },
        "runtime": { "type": "string" },
        "temp":    { "type": "string" }
      }
    },
    "logging": {
      "type": "object",
      "properties": {
        "maxFileSize": { "type": "integer", "minimum": 1048576 },
        "maxFiles":    { "type": "integer", "minimum": 1 },
        "datePattern": { "type": "string" }
      }
    }
  }
}
```

## 7. Config Merge Strategy

```javascript
async function loadConfiguration(processType) {
  // 1. load shared config
  const sharedConfig = await loadSharedConfig();

  // 2. load process-specific config
  let processConfig = {};
  if (processType === 'daemon') {
    processConfig = await loadDaemonConfig();
  } else if (processType === 'cli') {
    processConfig = await loadCliConfig();
  }

  // 3. deep merge configs
  const finalConfig = deepMerge(sharedConfig, processConfig);

  // 4. override with CLI arguments
  applyCliOverrides(finalConfig, process.argv);

  return finalConfig;
}
```

## 8. Config Merge Utilities

```javascript
export const ConfigMerger = {
  deepMerge(target, source),       // deep merge for objects
  mergeArrays(target, source, strategy),  // array merge (strategy selectable)
  applyCliArgs(config, args),      // apply CLI arguments
  validate(config, schema)         // validate config
};
```

## 9. Processing Flows

### 9.1 Config integration flow on process startup

```
1. Load shared-config.json       → establish common settings
2. Load process-specific config  → apply daemon/cli-config.json
3. Parse CLI arguments           → apply command-line specifications
4. Validate config               → confirm all settings validity
5. Create directories            → generate required directories
6. Finalize config               → ready for process startup
```

### 9.2 Missing config file handling

```
1. Generate default settings     → guarantee minimum operation
2. Call local-setup-initialization → initialize .cctop/ structure and config files
3. Reload config                 → apply generated config
```

## 10. Functional Requirements

### 10.1 Common config management
1. Guarantee required settings for system operation
2. Auto-create directories specified in config
3. Version compatibility: version management of config format

### 10.2 Config loading
1. Reliable loading of `shared-config.json`
2. Appropriate defaults when config absent
3. Error tolerance: validation and correction of invalid values

### 10.3 Config merge
1. Deep merge: appropriate merge of nested objects
2. Array merge strategy: control of array value replacement/addition
3. Type guarantee: consistency of types after merge

### 10.4 Config validation
1. Schema validation: structure and type checking via JSON Schema
2. Path validation: validity confirmation of file/directory paths
3. Size limit validation: range checking of max/min values
