# cctop - File System Monitoring Tool

A high-performance file system monitoring tool with real-time event tracking and SQLite persistence.

## Features

- Real-time file system event monitoring (create, modify, delete)
- SQLite database persistence
- Metadata tracking (file size, line count, block count, timestamps)
- Multiple UI modes (classic terminal, Ink-based TUI)
- File movement detection

## Installation

```bash
npm install
```

## Usage

```bash
# Start monitoring current directory
cctop

# Monitor specific directory
cctop /path/to/directory

# Use specific database
cctop --db /path/to/database.db
```

## Architecture

- **Monitors**: File system event detection using chokidar
- **Database**: SQLite-based event persistence
- **UI**: Multiple display modes for different use cases
- **Config**: Flexible configuration management

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Start development
npm start
```

## License

MIT