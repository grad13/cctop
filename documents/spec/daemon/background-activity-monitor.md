---
Created: 2026-03-13
Updated: 2026-03-13
Checked: -
Deprecated: -
Format: spec-v2.1
Source: documents/visions/functions/FUNC-003-background-activity-monitor.md
---

# Specification: Background Activity Monitor

## 0. Meta

| Source | Runtime |
|--------|---------|
| daemon/src/index.ts, daemon/src/system/PidManager.ts, daemon/src/system/SignalHandler.ts, daemon/src/logging/LogManager.ts | Node.js |

| Field | Value |
|-------|-------|
| Related | daemon/sqlite-database-foundation.md, daemon/file-lifecycle-tracking.md, daemon/chokidar-database-integration.md, shared/hierarchical-config-management.md |
| Test Type | Integration |

## 1. Overview

Two-process separation architecture where a background Daemon monitors file changes and the View retrieves information from the Database.

**User value**:
- Complete background activity tracking via continuous file monitoring
- Stable monitoring and display through process separation
- Operational efficiency via 24/7 monitoring and proper shutdown control

## 2. Scope

**In scope**:
- Complete separation of background monitoring process (Daemon) and user display process (View)
- Daemon Process: records file change events to Database
- View Process: retrieves information from Database for display
- SQLite Database: center of inter-process communication
- Process Management: automatic Daemon startup/management when `cctop` runs
- PID file, log management, auto-recovery

**Out of scope**:
- Direct file content parsing/conversion
- Network communication, external system integration
- Config file editing/management (shared-config responsibility)
- Detailed display control, UI design (view module responsibility)

## 3. Architecture

```
┌─────────────────┐     SQLite WAL      ┌─────────────────┐
│  Daemon Process  │──────────────────→  │  View Process   │
│  (file monitor) │     (write)         │  (read + display)│
└─────────────────┘                     └─────────────────┘
         │                                       │
         └──────────── activity.db ──────────────┘
```

- **Daemon**: 24/7 monitoring as independent process
- **Database**: concurrent access via SQLite WAL mode
- **View**: real-time display (60ms delay)
- **Process Control**: PID file, log management, auto-recovery

## 4. Process State Management

| File | Path | Purpose |
|------|------|---------|
| PID file | `.cctop/runtime/daemon.pid` | Process state management |
| Log file | `.cctop/logs/daemon.log` | Process history management |

## 5. Process Management

| Command | Description |
|---------|-------------|
| `cctop` | Check Daemon state on run, auto-start |
| `cctop daemon start` | Start Daemon independently |
| `cctop daemon stop` | Stop Daemon |
| `cctop daemon status` | Check Daemon state |
| `cctop view` | View only (no Daemon start) |

- **Auto-start**: confirm/start Daemon when `cctop` runs
- **Starter recording**: record who started Daemon (independent or View-started)
- **Shutdown control**: appropriate shutdown processing based on starter

## 6. PID File Specification

### 6.1 File format

```json
{
  "pid": 12345,
  "started_by": "cli",
  "started_at": 1719456789,
  "config_path": "/path/to/.cctop/config/shared-config.json"
}
```

### 6.2 Starter recording rules

| Value | Condition |
|-------|-----------|
| `"cli"` | Daemon auto-started when running `cctop` command |
| `"standalone"` | Started by `cctop daemon start` command |

## 7. Startup Flow

1. Check PID file when `cctop` runs
2. If Daemon not running: auto-start (record starter = "cli")
3. If Daemon already running: check starter record (maintain starter = "standalone")
4. Start View and connect to Database
5. Begin real-time display

## 8. Shutdown Flow

### View shutdown Daemon control

| Starter | Behavior when View exits |
|---------|--------------------------|
| `"cli"` | Stop Daemon when View exits |
| `"standalone"` | Daemon continues even when View exits |

## 9. Configuration

Background monitoring config is managed in the `monitoring.backgroundMonitor` section of `shared-config.json` (per hierarchical-config-management spec).

```json
{
  "monitoring": {
    "backgroundMonitor": {
      "enabled": true,
      "logLevel": "info",
      "heartbeatInterval": 30000
    }
  }
}
```

## 10. Error Handling

- Auto-recovery on Daemon crash
- Wait and retry on Database lock
- Recovery on PID file corruption

## 11. Test Requirements

### 11.1 Basic function tests
- Daemon/View independent tests
- Inter-process communication tests
- Recovery on abnormal termination tests
- Long-duration operation tests

### 11.2 Shutdown control tests
- View-started Daemon stops when View exits
- Standalone Daemon continues when View exits
- Accuracy of starter information in PID file
