---
updated: 2026-03-14 15:42
checked: -
Deprecated: -
Format: spec-v2.1
Source: documents/visions/functions/FUNC-104-view-interface-specification.md
---

# Specification: View Interface Specification

## 0. Meta

| Source | Runtime |
|--------|---------|
| view/src/index.ts, view/src/config/config-loader.ts | Node.js |

| Field | Value |
|-------|-------|
| Related | shared/hierarchical-config-management.md, shared/local-setup-initialization.md, daemon/background-activity-monitor.md |
| Test Type | Unit |

## 1. Overview

Single source of truth for all cctop command arguments, options, and startup behavior.

**User value**:
- Comprehensive listing of all View arguments/options
- Consistent startup behavior design
- Simple operation system that is intuitive for beginners

## 2. Scope

**In scope**:
- Definition of all View arguments/options
- Default startup behavior definition
- Initialization, Daemon, and View integration control
- Help message standardization
- Unified error messages

**Out of scope**:
- Detailed implementation of each function (see respective specs)
- Key operations in interactive mode
- Internal API design

**Critical**: All argument definitions in other specs are for reference only. This spec is the Single Source of Truth for implementation.

## 3. Command Structure

```bash
cctop [options] [directory]
```

**Positional arguments**:
- `[directory]` - monitoring target directory (default: current directory)

## 4. Default Startup Behavior

### 4.1 Behavior on execution without arguments

```bash
cctop
```

**Automatically executed**:
1. **Initialization check**: if `.cctop/` does not exist in current directory, run initialization
2. **Daemon startup**: auto-start background monitoring process
3. **CLI startup**: start interactive display screen
4. **Daemon stop on exit**: auto-stop Daemon when CLI exits (q key, etc.)

### 4.2 Initialization process detail

```bash
# Auto-executed when .cctop/ does not exist (per local-setup-initialization spec)
mkdir -p .cctop/{config,themes,data,logs,runtime,temp}
mkdir -p .cctop/themes/custom

# Database file creation
touch .cctop/data/activity.db

# Config file creation:
# .cctop/config/shared-config.json  (hierarchical-config-management)
# .cctop/config/daemon-config.json  (daemon-configuration-management)
# .cctop/config/view-config.json    (view-configuration-management)
# .cctop/themes/current-theme.json
# .cctop/themes/default.json, high-contrast.json
# .cctop/.gitignore
```

### 4.3 Startup sequence

```
1. Directory Check    → confirm .cctop/ exists
2. Initialize         → run initialization only when needed
3. Daemon Start       → start background monitoring
4. CLI Start          → display interactive screen
5. User Interaction   → user operations
6. CLI Exit           → exit via q key etc.
7. Daemon Stop        → stop background monitoring
```

### 4.4 User experience

- **First time**: `cctop` → initialize → immediately operational
- **Subsequent times**: `cctop` → immediately operational
- **Exit**: `q` → everything auto-cleaned up

## 5. Options Reference

### 5.1 Monitoring control

| Option | Description | Related Spec |
|--------|-------------|--------------|
| `daemon start` | Start background monitoring process | background-activity-monitor |
| `daemon stop` | Stop background monitoring process | background-activity-monitor |
| `daemon status` | Check background monitoring process state | background-activity-monitor |
| `view` | Display only from existing DB, no Daemon start | background-activity-monitor |

### 5.2 Output control

| Option | Description |
|--------|-------------|
| `--verbose` | Verbose output mode |

### 5.3 Help

| Option | Description |
|--------|-------------|
| `-h, --help, help` | Display help message |

## 6. Help Message

```
cctop - Code Change Top (File Watching Tool)

Usage: cctop [options] [directory]

Options:
  Watching:
    daemon start      Start background daemon
    daemon stop       Stop background daemon
    daemon status     Check background daemon status

  Display:
    view              View existing data only (no daemon)

  Output:
    --verbose         Enable verbose output

  Help:
    -h, --help, help  Show this help message

Interactive Controls:
  Display modes:
    a - All events       u - Unique files      q - Quit

  Event filters:
    f - Find  c - Create  m - Modify  d - Delete  v - Move  r - Restore

Examples:
  cctop                # Full auto: init + daemon + cli (recommended)
  cctop daemon start   # Start background daemon only
  cctop daemon status  # Check daemon status
  cctop view           # View existing data only
```

## 7. Interactive Mode Operations

### 7.1 Display mode switching

| Key | Mode |
|-----|------|
| `a` | All mode (show all events) |
| `u` | Unique mode (unique files only) |
| `q` | Quit |

### 7.2 Event filters

| Key | Event |
|-----|-------|
| `f` | Find |
| `c` | Create |
| `m` | Modify |
| `d` | Delete |
| `v` | Move |
| `r` | Restore |

## 8. Usage Examples

```bash
# Monitor current directory (default behavior)
cctop

# Monitor specific directory
cctop /path/to/project

# Monitor src directory
cctop src/

# Start background monitoring
cctop daemon start

# Stop background monitoring
cctop daemon stop

# Check background monitoring state
cctop daemon status

# View only (no monitoring)
cctop view

# Verbose output
cctop --verbose
```

## 9. Error Messages

### 9.1 Standard error format

```
Error: <error content>
Try 'cctop --help' for more information.
```

### 9.2 Common errors

| Message | Cause |
|---------|-------|
| `Error: Invalid directory: <path>` | Invalid directory |
| `Error: Unknown option: <option>` | Unknown option |
| `Error: Missing argument for: <option>` | Missing argument |
| `Error: Cannot watch more than <limit> files` | Monitoring limit exceeded |

## 10. Success Criteria

1. **Uniformity**: all options follow consistent naming convention
2. **Discoverability**: all features discoverable via `--help`
3. **Extensibility**: clear guidelines for adding new options
