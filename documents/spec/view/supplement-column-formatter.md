---
updated: 2026-03-17 12:08
checked: -
id: SPEC-V-SUP-018
title: ColumnFormatter (Supplement)
version: 2.1
status: draft
source:
  - path: code/app/view/src/ui/components/EventTable/formatters/ColumnFormatter.ts
    runtime: TypeScript (Node.js ESM)
type: supplement
supplements: east-asian-width-display.md
---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -

# ColumnFormatter (Supplement)

## Meta
| Source | Runtime |
|--------|---------|
| `code/app/view/src/ui/components/EventTable/formatters/ColumnFormatter.ts` | TypeScript (Node.js ESM) |

Supplements: east-asian-width-display.md (Section 3: Core Implementation)

## Contract

```typescript
abstract class ColumnFormatter {
  constructor(columnConfig: ColumnConfig);
  formatColumn(value: string, width?: number): string;
  abstract format(event: EventRow, width?: number): string;
}
```

## Logic - Abstract Base Class Pattern

The existing spec describes width-aware formatting functions. This supplement documents the OOP abstraction:

### formatColumn Alignment

| Align | Implementation |
|-------|---------------|
| right | `padLeft(value, targetWidth)` |
| center | Even padding distribution (left/right) |
| left (default) | `padOrTruncate(value, targetWidth)` |
| left + directory + head truncate | `truncateDirectoryPath(value, targetWidth)` |

Subclasses implement `format(event)` to extract and format specific column values from EventRow data.
