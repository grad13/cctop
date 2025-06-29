# Process Monitors

This directory contains process monitoring and management functionality.

## Structure

- `process-manager.ts` - Main entry point (facade) maintaining backward compatibility
- `ProcessManager.ts` - Refactored process manager using modular components
- `types/` - TypeScript type definitions
  - `ProcessTypes.ts` - All type definitions for process management
- `managers/` - Manager classes
  - `PidFileManager.ts` - PID file operations
- `controllers/` - Controller classes
  - `ProcessController.ts` - Process lifecycle management
- `loggers/` - Logger classes
  - `ProcessLogger.ts` - Logging functionality

## Usage

The process-manager.ts file re-exports ProcessManager.ts to maintain backward compatibility while using the new modular implementation.