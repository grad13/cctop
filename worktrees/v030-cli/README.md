# CCTOP v0.3.0 - Daemon-CLI Architecture

This is the v0.3.0 implementation of CCTOP with separated Daemon and CLI processes.

## Architecture

```
cctop-monorepo/
├── shared/      # Shared modules (types, database, schemas)
├── daemon/      # Background monitoring process
└── cli/         # Terminal UI viewer
```

## Development Status

### Completed
- ✅ Shared module with type definitions and database access layer
- ✅ CLI configuration management (FUNC-107)
- ✅ Database read-only access with polling mechanism
- ✅ Display functionality (FUNC-200-206) ported
- ✅ Basic CLI structure with monorepo setup

### In Progress
- 🚧 Interactive features (FUNC-400-403)
- 🚧 Daemon implementation
- 🚧 Test suite

## Quick Start

```bash
# Install dependencies
npm install

# Build all modules
npm run build

# Run CLI (requires existing database)
npm run cli

# Run daemon (when implemented)
npm run daemon
```

## Configuration

Configuration files are located in `.cctop/config/`:
- `shared-config.json` - Shared settings between daemon and CLI
- `cli-config.json` - CLI-specific display and interaction settings
- `daemon-config.json` - Daemon monitoring settings (to be implemented)

## Features

### CLI Features
- Real-time event display with 100ms polling
- Configurable columns and colors
- Event statistics display
- Terminal resize handling
- Graceful shutdown

### Shared Module
- SQLite database with WAL mode support
- Type-safe event and configuration interfaces
- Database schema management
- Read-only and read-write access modes

## Technical Details

- **Node.js**: >= 18.0.0
- **TypeScript**: 5.2.2
- **Database**: SQLite3 with WAL mode
- **Monorepo**: NPM workspaces
- **Display**: chalk, terminal-kit, ora

## Known Issues

1. Interactive features not yet implemented
2. Daemon process not yet created
3. No tests written yet
4. Requires existing database (no initialization)

## Next Steps

1. Implement daemon process for file monitoring
2. Add interactive features (keyboard navigation, filtering)
3. Create comprehensive test suite
4. Add database initialization capability
