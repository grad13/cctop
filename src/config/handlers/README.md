# Configuration Handlers

This directory contains specialized handlers for different aspects of configuration management.

## Files

- **ErrorHandler.ts** - Handles validation errors and provides user feedback
- **DirectoryHandler.ts** - Manages watch directory additions and prompts

## Architecture

These handlers extract specific responsibilities from the main ConfigManager to improve modularity and testability.