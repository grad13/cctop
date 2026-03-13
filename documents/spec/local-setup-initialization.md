---
Created: 2026-03-13
Updated: 2026-03-13
Checked: -
Deprecated: -
Format: spec-v2.1
Source: documents/visions/functions/FUNC-105-local-setup-initialization.md
---

# Specification: Local Setup Initialization

## 0. Meta

| Source | Runtime |
|--------|---------|
| modules/shared/src/config/LocalSetupInitializer.ts, modules/view/src/config/local-setup-initializer.ts | Node.js |

| Field | Value |
|-------|-------|
| Related | hierarchical-config-management.md, daemon-configuration-management.md, view-configuration-management.md |
| Test Type | Unit |

## 1. Overview

Automates first-run setup and manages local configuration.

**User value**:
- Simplified first-run setup
- Project-specific configuration management
- Zero-config start

## 2. Scope

**In scope**:
- Auto-creation of `.cctop/` directory
- Default config file generation
- Monitoring target directory initialization
- User guide message display

**Out of scope**:
- Global configuration management
- Config file editing UI
- Migration of existing configurations

## 3. Initialization Behavior

### 3.1 Default behavior

- Use `.cctop/` in current directory
- If not present: auto-create before starting monitoring
- On creation: also generate initial config files

### 3.2 Directory structure

```
.cctop/
├── config/
│   ├── shared-config.json    # common settings (hierarchical-config-management)
│   ├── daemon-config.json    # Daemon settings (daemon-configuration-management)
│   └── view-config.json      # View settings (view-configuration-management)
├── themes/
│   ├── current-theme.json    # currently applied color settings
│   ├── default.json          # default theme
│   ├── high-contrast.json    # high contrast theme
│   └── custom/               # user custom themes
├── data/
│   ├── activity.db           # main database
│   ├── activity.db-wal       # SQLite WAL file
│   └── activity.db-shm       # SQLite shared memory
├── logs/
│   ├── daemon.log
│   └── cli.log
├── runtime/
│   ├── daemon.pid
│   └── daemon.sock
├── temp/
└── .gitignore
```

## 4. Config File Specifications

### 4.1 3-layer config architecture

| File | Manager |
|------|---------|
| `shared-config.json` | hierarchical-config-management |
| `daemon-config.json` | daemon-configuration-management |
| `view-config.json` | view-configuration-management |
| `current-theme.json` | theme management |

### 4.2 .gitignore content

```
# cctop monitoring data
data/
logs/
runtime/
temp/

# User customizations
themes/custom/
```

## 5. First-Run Message

```
Created configuration in ./.cctop/
Configuration files:
  - .cctop/config/shared-config.json (common settings)
  - .cctop/config/daemon-config.json (daemon settings)
  - .cctop/config/view-config.json   (display settings)
  - .cctop/themes/current-theme.json (color theme)
Starting monitoring...
```

## 6. Implementation

### 6.1 postinstall auto-setup

```json
// package.json
{
  "scripts": {
    "postinstall": "node scripts/postinstall.js"
  }
}
```

```javascript
// postinstall.js
const globalConfigDir = getGlobalConfigDir();
if (!fs.existsSync(globalConfigDir)) {
  createDefaultGlobalConfig(globalConfigDir);
  console.log(`Created global config in ${globalConfigDir}`);
}
```

### 6.2 Manual setup commands

```bash
# Initialize existing project
cctop init

# Initialize at different location
cctop init /path/to/project

# Confirm directory structure without creating
cctop init --dry-run
```

## 7. Functional Requirements

### 7.1 Initialization processing

1. **Directory creation**: auto-create full `.cctop/` subdirectory structure
2. **Config file generation**:
   - `shared-config.json` (common settings)
   - `daemon-config.json` (Daemon settings)
   - `view-config.json` (View settings)
3. **Theme initialization**: place default themes
   - `default.json`, `high-contrast.json`
   - Generate `current-theme.json`
4. **Git config**: auto-generate `.gitignore`
5. **Permission settings**: set appropriate file permissions

### 7.2 Command specifications

1. `init` command: explicit initialization
2. Auto-initialization: auto-setup when monitoring starts
3. `postinstall`: auto-setup after npm install
4. Re-run protection: protect existing settings
5. `--dry-run` mode: confirm before actual creation

### 7.3 Error handling

1. **Permission error**: appropriate error message when write permission absent
2. **Existing files**: protect and warn about existing config files
3. **Disk space**: warning when storage insufficient

## 8. Test Coverage

Tests are located at:
- `modules/shared/tests/config-manager-func105.test.ts`
- `modules/view/tests/functional/config/local-setup-initializer.test.ts`
- `modules/view/tests/integration/func-105-setup-flow.test.ts`
- `modules/view/tests/integration/func-105-config-loading.test.ts`
