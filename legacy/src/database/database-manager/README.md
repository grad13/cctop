# Database Manager Module

Database management system for cctop, divided into focused modules.

## Module Structure

- **DatabaseTypes.ts** - Type definitions and constants
- **ConnectionManager.ts** - Database connection and configuration
- **QueryBuilder.ts** - SQL query construction
- **TransactionManager.ts** - Transaction handling with retry logic
- **DatabaseManager.ts** - Main manager coordinating all components

## Key Features

- FUNC-000 v0.2.0.0 compliant
- SQLite with WAL mode support
- Transaction management with savepoints
- Automatic retry for busy/locked conditions
- Schema migration support
- Event and file lifecycle tracking

## Usage

The main DatabaseManager class maintains full backward compatibility with the original implementation.