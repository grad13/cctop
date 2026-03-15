---
Created: 2026-03-13
Updated: 2026-03-14
Checked: 2026-03-14
Deprecated: -
Format: spec-v2.1
Source: daemon/src/index.ts, view/src/index.ts, shared/src/index.ts
---

# Specification: Component Architecture Overview

## 0. Meta

| Source | Runtime |
|--------|---------|
| daemon/src/index.ts | Node.js |
| view/src/index.ts | Node.js |
| shared/src/index.ts | Node.js |

| Field | Value |
|-------|-------|
| Related | architecture/module-dependency-diagram.md, architecture/milestones-strategy.md, architecture/stream-mode-architecture.md |
| Test Type | N/A |

## System Architecture

cctop organizes all 24 active functions into 3 components: Daemon, View (CLI), and Shared.

```
cctop System Architecture
├── Daemon Process (Background Service)
│   ├── File monitoring and event collection
│   ├── Database management and persistence
│   └── Background processing
├── View Process (Interactive Frontend)
│   ├── User interface rendering and display
│   ├── Filtering and display mode management
│   └── Key input and interaction
└── Shared Library (Common Components)
    ├── Configuration management and initialization
    ├── Common utilities
    └── Data structures and type definitions
```

## Component Breakdown

### Daemon Process

**Responsibility**: File monitoring, data collection, persistence, background processing

| Function | Name | Primary Responsibility |
|----------|------|----------------------|
| FUNC-000 | SQLite Database Foundation | Database management, table schema |
| FUNC-001 | File Lifecycle Tracking | File event tracking and classification |
| FUNC-002 | Chokidar Database Integration | File watching and event collection |
| FUNC-003 | Background Activity Monitor | Daemon process lifecycle management |
| FUNC-106 | Daemon Configuration Management | daemon-config.json management |

**Implementation path**: `daemon/src/`
**Key technologies**: chokidar, SQLite3, Node.js background process

### View Process (CLI Frontend)

**Responsibility**: User interface, display, interaction

| Function | Name | Primary Responsibility |
|----------|------|----------------------|
| FUNC-200 | East Asian Width Display | Full-width character display support |
| FUNC-201 | Double Buffer Rendering | Flicker-free screen updates |
| FUNC-202 | CLI Display Integration | Main display system integration |
| FUNC-203 | Event Type Filtering | Event type filter (Create/Modify/Delete etc.) |
| FUNC-204 | Responsive Directory Display | Responsive directory display |
| FUNC-206 | Instant View Progressive Loading | Progressive loading |
| FUNC-208 | UI Filter Integration | Unified filter feature |
| FUNC-300 | Key Input Manager | Keyboard input management |
| FUNC-301 | Filter State Management | Filter state management |
| FUNC-400 | Interactive Selection Mode | Interactive item selection |
| FUNC-401 | Detailed Inspection Mode | Detailed inspection mode |
| FUNC-402 | Aggregate Display Module | Aggregate display module |
| FUNC-403 | History Display Module | History display module |
| FUNC-404 | Dual Pane Detail View | Dual-pane detail view |
| FUNC-107 | CLI Configuration Management | cli-config.json management |

**Implementation path**: `view/src/`
**Key technologies**: blessed.js, ANSI escape codes, Terminal UI

### Shared Library

**Responsibility**: Configuration management, common utilities, data structures, type definitions

| Function | Name | Primary Responsibility |
|----------|------|----------------------|
| FUNC-101 | Hierarchical Config Management | Common configuration management |
| FUNC-102 | File Watch Limit Management | File watch limit management |
| FUNC-104 | CLI Interface Specification | CLI arguments and startup behavior |
| FUNC-105 | Local Setup Initialization | Local setup and initialization |
| FUNC-108 | Color Theme Configuration | Color theme configuration |

**Implementation path**: `shared/src/`
**Key technologies**: JSON config management, filesystem operations, type definitions

## Component Statistics

| Component | Functions | Share | Primary Responsibility |
|-----------|-----------|-------|----------------------|
| Daemon | 5 | 21% | Background processing, data management |
| View | 14 | 58% | User interface, interaction |
| Shared | 5 | 21% | Common configuration, utilities |
| Total | 24 | 100% | - |

## Data Flow

```
[File Change]
    |
    v
[Daemon: FUNC-002 Chokidar Monitoring]
    |
    v
[Daemon: FUNC-001 Event Classification]
    |
    v
[Daemon: FUNC-000 SQLite Storage]
    |
    v (read-only)
[View: FUNC-202 Data Retrieval]
    |
    v
[View: FUNC-301 Filter Processing]
    |
    v
[View: FUNC-200/201 Display Rendering]
```

## Configuration Flow

```
[Shared: FUNC-101 Common Config]
    +-- [Daemon: FUNC-106 Daemon Config]
    +-- [View: FUNC-107 CLI Config]
```

## User Interaction Flow

```
[View: FUNC-300 Key Input]
    |
    v
[View: FUNC-301 State Management]
    |
    v
[View: FUNC-203/208 Filter Execution]
    |
    v
[View: FUNC-202 Display Update]
```

## Dependency Constraints

### Circular Dependency Prevention

- **Daemon** -> **Shared** (configuration loading)
- **View** -> **Shared** (configuration loading)
- **View** <- **Daemon** (data retrieval via database, no direct IPC)

### Database Access Permissions

- **Daemon**: Read/write (SQLite WAL mode)
- **View**: Read-only access
- **Shared**: No database access

## Module Structure (npm workspaces)

```json
{
  "workspaces": [
    "daemon",
    "view",
    "shared"
  ]
}
```
