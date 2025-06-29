# Process Monitors

This directory contains process monitoring and management functionality.

## Structure

### Core Components
- `file-monitor.ts` - File monitoring with chokidar
- `event-processor.ts` - Event processing logic
- `monitor-process.ts` - Monitor process main entry point (refactored)
- `process-manager.ts` - Main entry point (facade) maintaining backward compatibility
- `ProcessManager.ts` - Refactored process manager using modular components
- `database-watcher.ts` - Database change monitoring

### Monitor Process Components (Refactored)
- `monitor.types.ts` - Monitor-related type definitions
- `monitor-initializer.ts` - Component initialization logic
- `monitor-event-handler.ts` - File event handling
- `monitor-signal-handler.ts` - Signal handling and graceful shutdown
- `monitor-heartbeat.ts` - Heartbeat management
- `monitor-lifecycle.ts` - Process lifecycle management

### Sub-components
- `types/` - TypeScript type definitions
  - `ProcessTypes.ts` - All type definitions for process management
- `managers/` - Manager classes
  - `PidFileManager.ts` - PID file operations
- `controllers/` - Controller classes
  - `ProcessController.ts` - Process lifecycle management
- `loggers/` - Logger classes
  - `ProcessLogger.ts` - Logging functionality
- `event-processor/` - Event processor components
  - `EventAggregator.ts` - Event aggregation logic
  - `EventProcessor.ts` - Main event processor
  - `EventQueue.ts` - Event queue management
  - `EventTypes.ts` - Event type definitions
  - `MoveDetector.ts` - File move detection logic

## Refactoring Notes

### monitor-process.ts Refactoring (405 → ~100 lines)
The monitor-process.ts has been refactored from a monolithic 405-line file into modular components following the Single Responsibility Principle:
- Initialization logic moved to `monitor-initializer.ts`
- Event handling moved to `monitor-event-handler.ts`
- Signal handling moved to `monitor-signal-handler.ts`
- Heartbeat logic moved to `monitor-heartbeat.ts`
- Lifecycle management moved to `monitor-lifecycle.ts`
- Main file now acts as a facade coordinating these components

## Usage

The process-manager.ts file re-exports ProcessManager.ts to maintain backward compatibility while using the new modular implementation.