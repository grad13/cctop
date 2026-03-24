---
updated: 2026-03-17 12:08
checked: -
id: SPEC-D08
title: "Supplement: File Measurement Calculation"
version: 2.1
status: draft
source:
  - path: code/app/daemon/src/events/MeasurementCalculator.ts
    runtime: TypeScript (Node.js ESM)
type: supplement
supplements: chokidar-database-integration.md
---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -

# Supplement: File Measurement Calculation

## Meta
| Source | Runtime |
|--------|---------|
| `code/app/daemon/src/events/MeasurementCalculator.ts` | TypeScript (Node.js ESM) |

**Supplements**: `chokidar-database-integration.md` -- covers the measurement collection logic referenced as "MeasurementCollector" in section 6.1 of the integration spec.

## Scope of Supplement

The integration spec mentions measurement collection (size/lines/blocks) at a high level. This supplement specifies:
- Binary file detection algorithm
- Line counting method
- Structure counting per file type (block count)
- Batch calculation support
- Error recovery behavior

## Contract

```typescript
import { MeasurementResult } from '../database/types';

export class MeasurementCalculator {
  constructor(logger: LogManager);
  calculateMeasurements(filePath: string, inode: number): Promise<MeasurementResult>;
  batchCalculate(files: Array<{ filePath: string; inode: number }>): Promise<MeasurementResult[]>;
  getStatistics(measurements: any[]): Promise<MeasurementStatistics>;
}
```

### Public API

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `calculateMeasurements` | `filePath`, `inode` | `Promise<MeasurementResult>` | Full measurement for a single file |
| `batchCalculate` | `Array<{filePath, inode}>` | `Promise<MeasurementResult[]>` | Sequential measurement for multiple files |
| `getStatistics` | `measurements[]` | `Promise<MeasurementStatistics>` | Compute summary from measurement array |

## State

No mutable state. Configuration constants:

| Constant | Value | Purpose |
|----------|-------|---------|
| `BINARY_THRESHOLD` | `0.3` (30%) | Non-printable character ratio threshold |
| `CHUNK_SIZE` | `8192` (8KB) | Sample size for binary detection |

## Logic

### Binary Detection Algorithm

1. Read first 8KB of file
2. If empty file (0 bytes read): classify as **text**
3. If buffer contains any null byte (`0x00`): classify as **binary**
4. Count non-printable characters:
   - Non-printable: bytes `< 9`, or `14-31`, or `127`
   - Printable: bytes `9-13` (whitespace), `32-126` (ASCII), `128-255` (extended/UTF-8)
5. If non-printable ratio > 30%: classify as **binary**

### Measurement Decision Table

| File Type | `fileSize` | `lineCount` | `blockCount` |
|-----------|------------|-------------|--------------|
| Binary | `stats.size` | `0` | `null` |
| Text (supported ext) | `stats.size` | newlines + 1 | Structure count |
| Text (unsupported ext) | `stats.size` | newlines + 1 | `null` |
| Error (any) | `0` | `0` | `null` |

### Line Count Method

- Read entire file as UTF-8
- Count `\n` occurrences + 1
- Empty file (0 length): returns `1`

### Structure Count by File Extension

| Extension | Pattern Matched | What Counts |
|-----------|-----------------|-------------|
| `.md` | `^#+\s+` | Markdown heading lines |
| `.py` | `^(class\|def)\s+\w+` (not starting with `#`) | Class and function declarations |
| `.js`, `.ts`, `.jsx`, `.tsx` | Multiple regex patterns | Function declarations, methods, arrow functions |
| All others | N/A | Returns `null` (unsupported) |

### JavaScript/TypeScript Function Patterns

| Pattern | Example |
|---------|---------|
| `function\s+\w+\s*\(` | `function foo()` |
| `\w+\s*:\s*function\s*\(` | `name: function()` |
| `\w+\s*=\s*function\s*\(` | `name = function()` |
| `\w+\s*=\s*\([^)]*\)\s*=>` | `name = () =>` |
| `\w+\s*:\s*\([^)]*\)\s*=>` | `name: () =>` |
| `^\s*\w+\s*\([^)]*\)\s*\{` | `name() {` (method) |

### Error Recovery

On any `fs` error during measurement:
- Log warning via `LogManager`
- Return fallback: `{ inode, fileSize: 0, lineCount: 0, blockCount: null }`

### Batch Processing

Sequential processing (not parallel). Each file is measured one at a time. No concurrency control.

## Side Effects

- File system reads: `fs.stat`, `fs.open`+`read` (binary check), `fs.readFile` (line/structure count)
- Logging via `LogManager` on warnings
- No database interaction (pure computation)
