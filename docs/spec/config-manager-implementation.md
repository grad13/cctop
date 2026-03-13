---
Created: 2026-03-13
Updated: 2026-03-13
Checked: -
Deprecated: -
Format: spec-v2.1
Source: documents/visions/supplementary/CG-002-config-manager-implementation.md
---

# Specification: Config Manager Implementation

## 0. Meta

| Source | Runtime |
|--------|---------|
| shared/src/config-manager.ts | Node.js |

| Field | Value |
|-------|-------|
| Related | shared/src/config/LocalSetupInitializer.ts, shared/src/config/DaemonConfig.ts |
| Test Type | Unit |

## 1. Overview

Simple configuration management system with automatic initialization. Handles config file resolution, loading, validation, and watch path management.

Related functions: FUNC-105 (local setup initialization), FUNC-101 (hierarchical config management).

## 2. Config File Path Resolution

Priority order:
1. `--config <path>` CLI argument (explicit override)
2. Default: `<cwd>/.cctop/config.json`

## 3. Core Implementation

```javascript
// src/config/config-manager.js

const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

class ConfigManager {
  constructor() {
    this.config = null;
    this.configPath = null;
  }

  async initialize(cliArgs = {}) {
    // Determine config file path
    this.configPath = this.resolveConfigPath(cliArgs);

    // Load config file
    await this.loadConfig();

    // Check watch target directory
    await this.checkWatchPath(cliArgs);

    return this.config;
  }

  // Config file path resolution (FUNC-105 compliant)
  resolveConfigPath(cliArgs) {
    if (cliArgs.config) {
      // Explicitly specified via --config
      return path.resolve(cliArgs.config);
    }

    // Default: .cctop/ in current directory
    return path.join(process.cwd(), '.cctop', 'config.json');
  }

  // Load config file
  async loadConfig() {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(configData);
      this.validateConfig();
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.handleMissingConfig();
      } else if (error instanceof SyntaxError) {
        this.handleJsonError(error);
      } else {
        throw error;
      }
    }
  }

  // Config file not found
  handleMissingConfig() {
    console.error(`
No cctop configuration found

You are not in a cctop-enabled directory.

To get started:
  cctop --init     # Initialize this directory

Learn more: cctop --help
`);
    process.exit(1);
  }

  // JSON syntax error
  handleJsonError(error) {
    console.error(`
Configuration file has JSON syntax error

File: ${this.configPath}
Error: ${error.message}

Please fix the syntax error and try again.
`);
    process.exit(1);
  }

  // Config validation
  validateConfig() {
    const requiredFields = [
      'database.path',
      'display.maxEvents',
      'monitoring.watchPaths'
    ];

    const missing = [];
    for (const field of requiredFields) {
      if (!this.getNestedValue(this.config, field)) {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      console.error(`
Error: Required fields missing from config:
${missing.map(f => `  - ${f}`).join('\n')}

Check ${this.configPath} and add the missing fields.
Run with --init to create default config.
`);
      process.exit(1);
    }
  }

  // Nested value accessor
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) =>
      current && current[key], obj);
  }

  // Watch path check and addition
  async checkWatchPath(cliArgs) {
    const targetDir = cliArgs.watchPath || process.cwd();
    const absoluteTargetDir = path.resolve(targetDir);

    // Check if already watched
    const watchPaths = this.config.monitoring?.watchPaths || [];
    const isAlreadyWatched = watchPaths.some(watchPath => {
      return path.resolve(watchPath) === absoluteTargetDir;
    });

    if (!isAlreadyWatched && watchPaths.length === 0) {
      const shouldAdd = await this.promptAddDirectory(absoluteTargetDir);
      if (shouldAdd) {
        this.config.monitoring.watchPaths.push(absoluteTargetDir);
        await this.save();
        console.log(`Added to monitor: ${absoluteTargetDir}`);
      } else {
        console.log(`Monitoring with current config only`);
      }
    }
  }

  // Directory addition prompt
  async promptAddDirectory(dirPath) {
    // Auto-respond in test environment
    if (process.env.NODE_ENV === 'test') {
      return true;
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(
        `Add ${dirPath} to monitor targets? (y/n): `,
        (answer) => {
          rl.close();
          resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        }
      );
    });
  }

  // Save config
  async save() {
    const configDir = path.dirname(this.configPath);
    await fs.mkdir(configDir, { recursive: true });

    const configData = JSON.stringify(this.config, null, 2);
    await fs.writeFile(this.configPath, configData, 'utf-8');
  }

  // Static initializer (--init flow)
  static async initializeNew(options = {}) {
    const configPath = path.join(process.cwd(), '.cctop');
    const configFile = path.join(configPath, 'config.json');

    // Check if already exists
    try {
      await fs.access(configFile);
      console.error(`Configuration already exists at ${configFile}`);
      process.exit(1);
    } catch (error) {
      // File does not exist - proceed with creation
    }

    // Default config
    const defaultConfig = {
      version: "0.2.0",
      encoding: "utf-8",
      monitoring: {
        watchPaths: [],
        excludePatterns: [
          "**/node_modules/**",
          "**/.git/**",
          "**/.DS_Store",
          "**/.cctop/**",
          "**/coverage/**",
          "**/*.log"
        ],
        debounceMs: 100,
        maxDepth: 10
      },
      database: {
        path: "activity.db",
        mode: "WAL"
      },
      display: {
        maxEvents: 20,
        refreshRateMs: 100,
        mode: "all"
      }
    };

    // Create directory and config file
    await fs.mkdir(configPath, { recursive: true });
    await fs.writeFile(configFile, JSON.stringify(defaultConfig, null, 2));

    // Create .gitignore
    const gitignoreContent = `# cctop monitoring data
activity.db
activity.db-*
cache/
logs/
`;
    await fs.writeFile(path.join(configPath, '.gitignore'), gitignoreContent);

    console.log(`
Initialized cctop in ${configPath}/
Edit ${configFile} to customize settings
Run 'cctop' to start monitoring
`);
  }
}

module.exports = ConfigManager;
```

## 4. CLI Integration

```javascript
// bin/cctop

const ConfigManager = require('../src/config/config-manager');

async function main() {
  const args = parseCommandLineArgs();

  // --init option
  if (args.init) {
    await ConfigManager.initializeNew();
    process.exit(0);
  }

  // Normal startup
  const configManager = new ConfigManager();
  const config = await configManager.initialize(args);

  // Start application with config
  startApplication(config);
}
```

## 5. Default Config Schema

| Field | Default Value | Description |
|-------|---------------|-------------|
| `version` | `"0.2.0"` | Config schema version |
| `encoding` | `"utf-8"` | File encoding |
| `monitoring.watchPaths` | `[]` | Directories to watch |
| `monitoring.excludePatterns` | (see below) | Glob patterns to exclude |
| `monitoring.debounceMs` | `100` | Event debounce interval (ms) |
| `monitoring.maxDepth` | `10` | Maximum directory depth |
| `database.path` | `"activity.db"` | SQLite DB filename (relative to .cctop/) |
| `database.mode` | `"WAL"` | SQLite journal mode |
| `display.maxEvents` | `20` | Max events shown in TUI |
| `display.refreshRateMs` | `100` | TUI refresh rate (ms) |
| `display.mode` | `"all"` | Display filter mode |

Default exclude patterns: `**/node_modules/**`, `**/.git/**`, `**/.DS_Store`, `**/.cctop/**`, `**/coverage/**`, `**/*.log`

## 6. Test Points

1. **Config file path resolution**
   - Default path resolution behavior
   - `--config` override behavior

2. **Error handling**
   - Missing file message and exit
   - JSON syntax error handling

3. **Watch path addition**
   - First-run prompt behavior
   - Auto-response in `NODE_ENV=test`

## 7. Constraints and Caveats

- Config file paths are always managed as absolute paths
- Watch on path separator differences in Windows environments
- Async error handling in all file operations
