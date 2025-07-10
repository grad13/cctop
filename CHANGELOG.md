# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2025-07-08

### 🚀 Major Architecture Change

**cctop v0.5.0 introduces a revolutionary Daemon-CLI architecture for better scalability and maintainability.**

### Added

- **Daemon-CLI Architecture**: Complete separation of background monitoring service and terminal UI client
  - `modules/shared/` - Common types, database layer, and utilities
  - `modules/daemon/` - Background file monitoring service  
  - `modules/cli/` - Terminal UI client
- **3-layer Configuration Architecture**
  - Shared Config: Common settings across modules
  - Daemon Config: Background processing settings
  - CLI Config: User interface settings
  - Local setup initialization with `npm run demo:config`
- **Python Integration Test Infrastructure**
  - Complete integration with `dummy_data_generator.py`
  - Large-scale data testing support (500 files, 30 days, 20 events/file)
  - Automated integration test scripts
- **New Commands and Scripts**
  - `npm run daemon` - Start background monitoring service
  - `npm run cli` - Start terminal UI client
  - `npm run dev` - Start both daemon and CLI together
  - `npm run demo:config` - Initialize local configuration
  - `npm run demo:python-data` - Python integration demo

### Changed

- **Technology Stack Updates**
  - UI Framework: blessed@0.1.81 (new adoption)
  - Database: sqlite3@5.1.6
  - Text width calculation: string-width@5.1.2
  - Test framework: vitest@2.0.0 (migrated from Jest)
  - Language: TypeScript@5.5.3
- **Project Structure**: Complete modular reorganization
  - Legacy code preserved in `legacy/` directory for gradual migration
  - Module-based development with workspace configuration
- **Enhanced Test Coverage**: 68 unit tests with comprehensive integration testing

### Technical Improvements

- **Better Scalability**: Independent scaling of monitoring and UI components
- **Improved Maintainability**: Clear separation of concerns between modules
- **Enhanced Development Experience**: Module-based development with TypeScript strict mode
- **Robust Testing**: Python-Node.js integration testing with automated verification

### Migration Notes

- **Breaking Change**: Command structure changed from monolithic to daemon-cli pattern
- **Backward Compatibility**: Legacy v0.2.x implementation preserved for reference
- **Upgrade Path**: Existing configurations can be migrated using local initialization

---

## [0.2.3.6] - 2025-06-29

### Fixed
- DatabaseManager large-scale refactoring completed
  - 421 lines → 184 lines (56% reduction)
  - Split into 7 specialized modules
  - Improved maintainability and test coverage

## [0.2.3.5] - 2025-06-29

### Fixed
- UI foundation code complete modularization
  - monitor-process.ts: 405 lines → 162 lines (60% reduction) 
  - ui.types.ts split into 7 specialized type files
  - Enhanced code readability and maintainability

## [0.2.3.4] - 2025-06-29

### Fixed
- ThemeLoader complete decomposition and theme management overhaul
  - ThemeLoader.ts: 414 lines → 82 lines (80% reduction)
  - Individual theme preset files
  - Improved theme system extensibility

## [0.2.3.3] - 2025-06-29

### Fixed
- TypeScript migration optimization completed
  - ConfigManager.ts: 481 lines → 292 lines (39% reduction)
  - Large module decomposition completed
  - Single responsibility principle applied to entire codebase

## [0.2.3.2] - 2025-06-29

### Fixed
- Debug code complete removal and cleanup
  - Removed 1,005 lines of unnecessary code
  - Complete removal of console.log statements
  - Significant codebase streamlining

## [0.2.3.1] - 2025-06-29

### Changed
- **100% TypeScript Migration Achieved**
  - All JavaScript files converted to TypeScript
  - Strict type definitions applied
  - CommonJS compatibility maintained

## [0.2.3.0] - 2025-06-28

### Added
- **Interactive Feature Suite - User Experience Revolution**
  - Interactive Selection Mode: Intuitive file selection with arrow keys
  - Detail Inspection Mode: Comprehensive file information display
  - Aggregate Display Module: High-speed statistical display
  - History Display Module: Time-series event history navigation
  - Key Input Management System: Unified keyboard input management
- **Experimental Features**
  - Advanced Statistics Module (PIL-010): Time-series analysis and anomaly detection

## [0.2.2.0] - 2025-06-27

### Added
- **Display Color Customization - RGB Support**
  - Preset color names: 'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'
  - Hexadecimal colors: #000000 format direct color specification
  - Theme management system with 4 preset themes
  - Display Color Customization adopted

## [0.2.1.0] - 2025-06-27

### Added
- **Silent Monitoring - Clean Console Experience**
  - Complete separation of monitor and viewer functions
  - Background Monitor: Silent file change monitoring and database recording
  - Viewer Process: Data retrieval and display from database
  - Clean terminal display even with 110+ files being monitored

## [0.2.0.0] - 2025-06-28

### Added
- **Large-scale Refactoring - High Performance**
  - Database foundation complete overhaul with 5-table structure
  - File lifecycle complete tracking with 6 event types
  - Event type filtering and auto-initialization
  - Hierarchical configuration system

## [0.1.3.0] - 2025-06-25

### Added
- **Double Buffer Rendering System**
  - Complete flicker prevention
  - 60fps rate limiting with smooth display updates
  - Advanced screen control with ANSI escape sequences

## [0.1.2.0] - 2025-06-24

### Added
- **East Asian Width Support**
  - Proper display of Japanese, Chinese, Korean full-width characters
  - Column alignment considering character width
  - `string-width` library integration

## [0.1.1.0] - 2025-06-23

### Added
- **Responsive Directory Display**
  - Directory column placed at rightmost position
  - Dynamic width adjustment based on terminal window size
  - Real-time resize event handling

## [0.1.0.0] - 2025-06-22

### Added
- **Initial Release - Minimum Viable Product**
  - Real-time file monitoring with chokidar
  - Event history database storage with SQLite3
  - Basic CLI display with table format
  - Find/Create/Modify/Delete/Move event detection

---

[0.5.0]: https://github.com/your-repo/cctop/compare/v0.2.3.6...v0.5.0
[0.2.3.6]: https://github.com/your-repo/cctop/compare/v0.2.3.5...v0.2.3.6
[0.2.3.5]: https://github.com/your-repo/cctop/compare/v0.2.3.4...v0.2.3.5
[0.2.3.4]: https://github.com/your-repo/cctop/compare/v0.2.3.3...v0.2.3.4
[0.2.3.3]: https://github.com/your-repo/cctop/compare/v0.2.3.2...v0.2.3.3
[0.2.3.2]: https://github.com/your-repo/cctop/compare/v0.2.3.1...v0.2.3.2
[0.2.3.1]: https://github.com/your-repo/cctop/compare/v0.2.3.0...v0.2.3.1
[0.2.3.0]: https://github.com/your-repo/cctop/compare/v0.2.2.0...v0.2.3.0
[0.2.2.0]: https://github.com/your-repo/cctop/compare/v0.2.1.0...v0.2.2.0
[0.2.1.0]: https://github.com/your-repo/cctop/compare/v0.2.0.0...v0.2.1.0
[0.2.0.0]: https://github.com/your-repo/cctop/compare/v0.1.3.0...v0.2.0.0
[0.1.3.0]: https://github.com/your-repo/cctop/compare/v0.1.2.0...v0.1.3.0
[0.1.2.0]: https://github.com/your-repo/cctop/compare/v0.1.1.0...v0.1.2.0
[0.1.1.0]: https://github.com/your-repo/cctop/compare/v0.1.0.0...v0.1.1.0
[0.1.0.0]: https://github.com/your-repo/cctop/releases/tag/v0.1.0.0