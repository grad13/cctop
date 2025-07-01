# @cctop/shared

Shared modules for cctop daemon and CLI processes.

## Overview

This package provides common functionality shared between the daemon and CLI:
- Database schema definitions
- Common type definitions
- Database connection management
- Configuration management utilities

## Directory Structure

```
shared/
├── src/
│   ├── schema/       # Database schema definitions
│   ├── types/        # Common TypeScript type definitions
│   ├── database/     # Database connection and basic operations
│   ├── config/       # Configuration management
│   └── index.ts      # Main export file
├── tests/
│   ├── unit/         # Unit tests
│   └── integration/  # Integration tests
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

## Installation

```bash
npm install
```

## Development

```bash
# Build
npm run build

# Watch mode
npm run watch

# Run tests
npm test

# Test with coverage
npm run test:coverage
```

## Usage

```typescript
import { Database, Config, Types } from '@cctop/shared';
```