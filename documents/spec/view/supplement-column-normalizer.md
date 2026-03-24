---
updated: 2026-03-17 12:08
checked: -
id: SPEC-V-SUP-023
title: Column Normalizer (Supplement)
version: 2.1
status: draft
source:
  - path: code/app/view/src/ui/components/EventTable/utils/columnNormalizer.ts
    runtime: TypeScript (Node.js ESM)
type: supplement
supplements: east-asian-width-display.md
---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -

# Column Normalizer (Supplement)

## Meta
| Source | Runtime |
|--------|---------|
| `code/app/view/src/ui/components/EventTable/utils/columnNormalizer.ts` | TypeScript (Node.js ESM) |

Supplements: east-asian-width-display.md (Section 3: Core Implementation)

## Contract

```typescript
type ColumnAlign = 'left' | 'right' | 'center';
type TruncateMode = 'head' | 'tail' | 'middle';

function normalizeColumn(value: string, width: number, align?: ColumnAlign, truncate?: TruncateMode): string;
function normalizeRow(columns: Array<{ value: string; width: number; align?: ColumnAlign; truncate?: TruncateMode }>, separator?: string): string;
```

## Logic - Unified Column Formatting

The existing spec describes individual padding functions. This supplement documents the unified `normalizeColumn` function:

### normalizeColumn Decision Table

| truncate | align | Behavior |
|----------|-------|----------|
| 'head' | (any) | `truncateDirectoryPath()` then `padOrTruncate()` for exact width |
| - | 'right' | `padLeft(value, width)` |
| - | 'center' | Strip tags for width calc, distribute padding evenly |
| - | 'left' (default) | `padOrTruncate(value, width)` |

### normalizeRow

Convenience function that applies `normalizeColumn` to each column definition and joins with separator (default: single space).

### Tag-Aware Center Alignment

Center alignment strips blessed tags (`{...}`) before calculating visual width to ensure correct padding.
