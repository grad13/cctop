---
updated: 2026-03-17 12:08
checked: -
id: SPEC-D03
title: Measurement Data CRUD Operations
version: 2.1
status: draft
source:
  - path: code/app/daemon/src/database/MeasurementOperations.ts
    runtime: TypeScript (Node.js ESM)
type: new
---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -

# Measurement Data CRUD Operations

## Meta
| Source | Runtime |
|--------|---------|
| `code/app/daemon/src/database/MeasurementOperations.ts` | TypeScript (Node.js ESM) |

## Contract

```typescript
import { MeasurementResult } from './types';

export class MeasurementOperations {
  constructor(db: sqlite3.Database);

  insertMeasurement(eventId: number, measurement: MeasurementResult): Promise<void>;
  getMeasurementByEventId(eventId: number): Promise<MeasurementResult | null>;
  getMeasurementsByFilePath(filePath: string): Promise<MeasurementResult[]>;
  getMeasurementStatistics(): Promise<MeasurementStatistics>;
  getTopFilesByLines(limit?: number): Promise<FileMetric[]>;
  getTopFilesByBlocks(limit?: number): Promise<FileMetric[]>;
  deleteMeasurementsByEventId(eventId: number): Promise<void>;
}

// MeasurementResult (from types.ts)
interface MeasurementResult {
  inode: number;
  fileSize: number;
  lineCount: number;
  blockCount: number | null;
}

interface MeasurementStatistics {
  totalMeasurements: number;
  totalLines: number;
  totalBlocks: number;
  averageLines: number;
  averageBlocks: number;
  binaryFiles: number;
  textFiles: number;
}

interface FileMetric {
  filePath: string;
  lineCount: number;
  blockCount: number;
  lastEventType: string;
  lastTimestamp: string;  // formatted datetime string
}
```

### Public API

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `insertMeasurement` | `eventId`, `MeasurementResult` | `Promise<void>` | Insert a measurement row linked to an event |
| `getMeasurementByEventId` | `eventId` | `Promise<MeasurementResult \| null>` | Retrieve measurement for a specific event |
| `getMeasurementsByFilePath` | `filePath` | `Promise<MeasurementResult[]>` | All measurements for a file, newest first |
| `getMeasurementStatistics` | - | `Promise<MeasurementStatistics>` | Global measurement summary |
| `getTopFilesByLines` | `limit?` (default: 10) | `Promise<FileMetric[]>` | Files ranked by line count |
| `getTopFilesByBlocks` | `limit?` (default: 10) | `Promise<FileMetric[]>` | Files ranked by block count |
| `deleteMeasurementsByEventId` | `eventId` | `Promise<void>` | Delete measurements for a specific event |

## State

No internal state. Operates directly on the `measurements` table.

## Logic

### NULL Handling

| Field | On Read | Rationale |
|-------|---------|-----------|
| `line_count` | `null` -> `0` via `??` operator | Binary files have no line count |
| `block_count` | `null` -> `0` via `??` operator | Unsupported file types have no block count |

### Binary vs Text Classification (in statistics)

| Condition | Classification |
|-----------|----------------|
| `line_count = 0` or `line_count IS NULL` | Binary file |
| `line_count > 0` | Text file |

### Average Calculation

| Metric | Denominator | Notes |
|--------|-------------|-------|
| `averageLines` | Text files only (`line_count > 0`) | Excludes binary files from average |
| `averageBlocks` | All files | Includes all files |

### Query Join Patterns

| Method | Tables | Join | Filter |
|--------|--------|------|--------|
| `getMeasurementsByFilePath` | `measurements JOIN events` | `event_id = id` | `file_path = ?` |
| `getTopFilesByLines` | `measurements JOIN events JOIN event_types` | Full chain | `line_count > 0` |
| `getTopFilesByBlocks` | `measurements JOIN events JOIN event_types` | Full chain | None |

## Side Effects

- `insertMeasurement`: Writes to `measurements` table (which triggers aggregate recalculation via SQLite triggers)
- `deleteMeasurementsByEventId`: Deletes from `measurements` table
- Read methods: No side effects
