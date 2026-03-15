# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-03-15

### Added
- Hub project card (`.face` directory) with news.json and thumbnail support
- CI deploy workflow for Hub integration
- JSDoc meta headers (`@created`, `@checked`, `@updated`) to all source files
- Comprehensive unit tests for TriggerManager, UIScreenManager, EventOperations

### Changed
- **Project restructure**: Migrated from `code/main/modules/` to flat `code/` layout with npm workspaces (`@cctop/shared`, `@cctop/daemon`, `@cctop/view`)
- **Test relocation**: Moved all tests from `code/*/tests/` to root `tests/` directory, organized by module and test type
- Extracted `QueryBuilder` to deduplicate SELECT/JOIN logic in FileEventReader
- Extracted `UIContentBuilder` and `UIConstants` from UILayoutManager
- Extracted `ConfigFactory` and `DirectoryStructureCreator` from LocalSetupInitializer
- Extracted `FileMetadataCollector` from daemon, skip events on fs.stat failure
- Extracted `argument-parser.ts` from view entry point
- Extracted `buildAggregateInsertSelect` to deduplicate trigger SQL
- Consolidated stderr patch into UIScreenManager
- Split `insertEvent` into focused sub-methods
- Added error logging to UIDataManager and UIKeyHandler silent catch blocks

### Removed
- Dead code `calculatePhysicalBlocks` from MeasurementCalculator
- Fallback logic in `ensureEventTypesLoaded`

### Fixed
- Resolved all existing unit test failures (shared 5 + daemon 78 + view 190 passing)
- Resolved all skipped tests (0 skips remaining)
- Fixed module resolution for relocated tests via `resolve.alias` in vitest configs
- Excluded gitignored files from publish sync

## [0.6.0] - 2025-07-14

### Added
- EventTable progressive loading with 3-row threshold
- `view-config.json` integration for customizable column widths
- File structure analysis for block count display
- Null value display as "-" for Lines and Blocks columns
- `directoryMutePaths` for EventTable display customization
- Configurable columns support for EventTable
- Event filter toggle with `[f]` key
- All/unique display mode selector
- FUNC-204 responsive directory display
- Auto-add startup directory to `directoryMutePaths`
- `init` command for project setup

### Changed
- Replaced `@cctop/shared` with relative paths for standalone publication
- Implemented Event-centered naming convention (FileEventReader, EventQueryAdapter)
- Integrated EventQueryAdapter into FileEventReader
- Implemented direct ViewConfig reference by eliminating default values
- Completely eliminated CLIConfig and `cli-config.json`
- Removed deprecated `--standalone` option
- Improved async exit handling
- Improved UI color scheme and selection indicators

### Fixed
- Event ordering in all/unique modes
- Elapsed time not updating in EventTable display
- `directoryMutePaths` not working
- Filter functionality bugs from Phase 3 refactoring
- ViewConfigManager config subdirectory path

### Removed
- 6 unused classes to reduce codebase bloat
- Unused UIConfigManager class
- Debug logging code from EventTable components

## [0.5.0] - 2025-07-08

### Added
- FUNC-000 compliant database architecture with full auto mode
- FUNC-202/FUNC-200 compliant frameless UI with clean architecture
- EventRow class with object-oriented EventTable architecture

### Changed
- Moved database implementation from shared to daemon per FUNC-000 spec
- Complete daemon test files reorganization

## [0.4.0] - 2025-07-04

### Changed
- Migrated test framework from Jest to Vitest

## [0.3.0] - 2025-07-03

### Added
- Frameless UI implementation (v1)
- Filter mode toggle
- Display mode selector (all/unique)

## [0.2.0] - 2025-06-26

### Added
- East Asian Width support (FUNC-017)
- Double-buffer rendering system (FUNC-018)
- Schema validation for configuration

## [0.1.0] - 2025-06-24

### Added
- Initial project structure with daemon, shared, and view modules
- Real-time file change monitoring with chokidar
- SQLite3-based event persistence
- Terminal UI with blessed
- Event types: Find, Create, Modify, Delete, Move
- File metadata tracking (size, line count, timestamp, inode)
