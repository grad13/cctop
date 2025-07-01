# cctop - Code Change Top

Real-time file system monitoring tool with daemon-cli architecture.

## Architecture (v0.3.x)

cctop uses a modular daemon-cli architecture for better scalability and maintainability:

### Modules

- **`modules/shared/`** - Common types, database layer, and utilities
- **`modules/daemon/`** - Background file monitoring service
- **`modules/cli/`** - Terminal UI client

### Legacy Code

The original monolithic implementation (v0.2.x) is preserved in `legacy/` for reference and gradual migration.

## Features

- Real-time file system event monitoring (create, modify, delete, move)
- SQLite database with WAL mode for concurrent access
- Daemon-CLI separation for independent scaling
- Event batching and efficient processing
- Metadata tracking (file size, line count, timestamps, inode)
- Multiple UI modes and interactive features

## Installation

```bash
# Install dependencies and build
npm install
npm run build

# Or install globally (coming soon)
npm install -g cctop
```

## Usage

### Start the daemon (background service)
```bash
npm run start:daemon
# or
./bin/cctop-daemon
```

### Start the CLI (user interface)
```bash
npm run start:cli
# or
./bin/cctop
```

### Use legacy version
```bash
npm run start:legacy
```

## Development

```bash
# Build all modules
npm run build

# Build specific module
npm run build:shared
npm run build:daemon
npm run build:cli

# Run tests
npm test

# Type checking
npm run typecheck
```

## License

MIT