---
Created: 2026-03-13
Updated: 2026-03-13
Checked: -
Deprecated: -
Format: spec-v2.1
Source: documents/visions/functions/FUNC-106-daemon-configuration-management.md
---

# Specification: Daemon Configuration Management

## 0. Meta

| Source | Runtime |
|--------|---------|
| modules/daemon/src/config/DaemonConfig.ts, modules/shared/src/config/DaemonConfig.ts | Node.js |

| Field | Value |
|-------|-------|
| Related | hierarchical-config-management.md, background-activity-monitor.md, file-lifecycle-tracking.md, chokidar-database-integration.md |
| Test Type | Unit |

## 1. Overview

Daemon process-specific configuration management. Manages settings for file monitoring, event processing, and database writes.

**User value**:
- Flexible Daemon behavior control
- Setting monitoring targets and exclusion patterns
- Performance tuning
- System resource management

## 2. Scope

**In scope**:
- Daemon-specific config file loading
- Monitoring parameter management
- Event processing settings management
- Database write settings
- System resource limit management

**Out of scope**:
- View display settings (view-configuration-management responsibility)
- Common settings management (hierarchical-config-management responsibility)
- Config file initialization (local-setup-initialization responsibility)

## 3. daemon-config.json Schema

```json
{
  "version": "0.3.0.0",
  "monitoring": {
    "watchPaths": [],
    "excludePatterns": [
      "**/node_modules/**",
      "**/.git/**",
      "**/.*",
      "**/.cctop/**"
    ],
    "debounceMs": 100,
    "maxDepth": 10,
    "moveThresholdMs": 100,
    "systemLimits": {
      "requiredLimit": 524288,
      "checkOnStartup": true,
      "warnIfInsufficient": true
    }
  },
  "daemon": {
    "pidFile": ".cctop/runtime/daemon.pid",
    "logFile": ".cctop/logs/daemon.log",
    "logLevel": "info",
    "heartbeatInterval": 30000,
    "autoStart": true
  },
  "database": {
    "writeMode": "WAL",
    "syncMode": "NORMAL",
    "cacheSize": 65536,
    "busyTimeout": 5000
  }
}
```

## 4. Config Parameter Descriptions

### 4.1 monitoring

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `watchPaths` | string[] | `[]` | Monitoring target paths (multiple allowed) |
| `excludePatterns` | string[] | see above | Exclusion patterns |
| `debounceMs` | integer | `100` | Event debounce time (ms) |
| `maxDepth` | integer | `10` | Maximum monitoring depth |
| `moveThresholdMs` | integer | `100` | Move event judgment time (ms) |

### 4.2 monitoring.systemLimits

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `requiredLimit` | integer | `524288` | Required file watch limit |
| `checkOnStartup` | boolean | `true` | Check limit on startup |
| `warnIfInsufficient` | boolean | `true` | Display warning if insufficient |

### 4.3 daemon

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `pidFile` | string | `.cctop/runtime/daemon.pid` | PID file path |
| `logFile` | string | `.cctop/logs/daemon.log` | Log file path |
| `logLevel` | string | `"info"` | Log level |
| `heartbeatInterval` | integer | `30000` | Heartbeat interval (ms) |
| `autoStart` | boolean | `true` | Auto-start when CLI runs |

### 4.4 database

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `writeMode` | string | `"WAL"` | SQLite write mode |
| `syncMode` | string | `"NORMAL"` | Sync mode |
| `cacheSize` | integer | `65536` | Cache size (KB) |
| `busyTimeout` | integer | `5000` | Busy timeout (ms) |

## 5. Config File Layout

```
.cctop/config/
├── daemon-config.json    # Daemon-specific settings (this spec)
├── view-config.json      # View-specific settings
└── shared-config.json    # common settings
```

## 6. Config Loading Order on Daemon Startup

1. `shared-config.json` (common settings)
2. `daemon-config.json` (Daemon-specific settings)
3. Command-line arguments (override)

## 7. Related Spec Integration

### 7.1 background-activity-monitor

- Provides Daemon startup/stop control settings
- Manages PID file and log file paths

### 7.2 file-lifecycle-tracking / chokidar-database-integration

- Provides monitoring parameters (debounce, threshold, etc.)
- Manages exclusion patterns

### 7.3 hierarchical-config-management

- Inherits common settings (DB path, etc.)
- Shares config merge logic

## 8. Functional Requirements

### 8.1 Config validation

1. Confirm monitoring paths exist
2. Validate exclusion pattern validity
3. Range check numeric parameters
4. Confirm system resource limits

## 9. Test Coverage

Tests are located at:
- `modules/daemon/tests/unit/production-config.test.ts`
