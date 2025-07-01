# Configuration Management

This directory contains the configuration management system.

## Structure

- `config-manager.ts` - Main entry point (facade) maintaining backward compatibility
- `ConfigManager.ts` - Refactored configuration manager coordinating all components
- `types/` - TypeScript type definitions
  - `ConfigTypes.ts` - All configuration types and interfaces
- `loaders/` - Configuration loading functionality
  - `ConfigLoader.ts` - File loading and parsing
- `validators/` - Configuration validation
  - `ConfigValidator.ts` - Schema and business rule validation
- `mergers/` - Configuration merging
  - `ConfigMerger.ts` - Default values and override handling

## Usage

The config-manager.ts file re-exports ConfigManager.ts to maintain backward compatibility while using the new modular implementation.