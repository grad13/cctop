# Event Processor Module

Event processing system for cctop file monitoring, divided into focused modules.

## Module Structure

- **EventTypes.ts** - Type definitions and constants
- **EventQueue.ts** - Event queueing and retry logic
- **EventAggregator.ts** - Event filtering and metadata collection
- **MoveDetector.ts** - Move/rename and restore detection
- **EventProcessor.ts** - Main processor coordinating all components

## Key Features

- FUNC-001/002 v0.2.0.0 compliant
- Asynchronous event queue processing
- Move/rename detection via inode tracking
- Restore detection (5-minute window)
- Event filtering and deduplication
- Retry mechanism for database unavailability

## Usage

The main EventProcessor class maintains full backward compatibility with the original implementation.