# Shared Configuration Module

This directory contains centralized configuration management for the cctop application, following FUNC-105 and FUNC-107 specifications.

## Architecture Overview

The configuration system follows a 3-layer architecture:

```
bin/cctop (entry point)
    ↓ initializes
src/shared/src/config/
    ├── LocalSetupInitializer  (creates all config files)
    ├── SharedConfig           (common settings type)
    ├── DaemonConfig          (daemon-specific settings type)
    └── CLIConfig             (CLI-specific settings type)
    ↓ used by
src/daemon/ and src/cli/
```

## Files in this Directory

### LocalSetupInitializer.ts
- **Purpose**: Initialize `.cctop/` directory structure and create default configuration files
- **Usage**: Called by `bin/cctop` on startup to ensure configuration exists
- **Responsibility**: 
  - Create directory structure per FUNC-105
  - Generate default shared-config.json, daemon-config.json, cli-config.json
  - Create themes and .gitignore

### Config Type Definitions

#### SharedConfig.ts
- **Purpose**: Type definition for shared-config.json
- **Contains**: Common settings used by both daemon and CLI
  - Project name
  - Watch paths
  - Exclude patterns

#### DaemonConfig.ts  
- **Purpose**: Type definition for daemon-config.json
- **Contains**: Daemon-specific settings
  - PID file location
  - Monitoring intervals
  - Database settings

#### CLIConfig.ts
- **Purpose**: Type definition for cli-config.json per FUNC-107
- **Contains**: CLI display and interaction settings
  - Column configurations
  - Color themes
  - Interactive features

## Configuration Files Created

The LocalSetupInitializer creates the following structure:

```
.cctop/
├── config/
│   ├── shared-config.json    # Common settings
│   ├── daemon-config.json    # Daemon settings
│   └── cli-config.json       # CLI display settings
├── themes/
│   ├── default.json
│   ├── high-contrast.json
│   └── current-theme.json
├── data/
├── logs/
├── runtime/
├── temp/
└── .gitignore
```

## Usage Flow

1. `bin/cctop` starts any command (view, daemon start, etc.)
2. Checks if `.cctop/` exists via `LocalSetupInitializer.isInitialized()`
3. If not, calls `LocalSetupInitializer.initialize()` to create all config files
4. Daemon/CLI processes read their respective config files using the type definitions

## Design Principles

- **Centralized Types**: All config type definitions are in shared to avoid circular dependencies
- **Initialization at Entry**: Config initialization happens only at bin/cctop level
- **Type Safety**: Strong typing for all configuration objects
- **FUNC Compliance**: Follows FUNC-105 (initialization) and FUNC-107 (CLI config schema)

## Related Specifications

- **FUNC-105**: Local Setup Initialization - defines directory structure and initialization flow
- **FUNC-107**: CLI Configuration Management - defines cli-config.json schema
- **FUNC-106**: Daemon Configuration Management - defines daemon-config.json schema
- **FUNC-101**: Common Configuration Management - defines shared-config.json schema