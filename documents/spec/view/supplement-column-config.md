---
updated: 2026-03-17 12:08
checked: -
id: SPEC-V-SUP-022
title: Column Config Utilities (Supplement)
version: 2.1
status: draft
source:
  - path: code/app/view/src/ui/components/EventTable/utils/columnConfig.ts
    runtime: TypeScript (Node.js ESM)
type: supplement
supplements: view-display-integration.md
---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -

# Column Config Utilities (Supplement)

## Meta
| Source | Runtime |
|--------|---------|
| `code/app/view/src/ui/components/EventTable/utils/columnConfig.ts` | TypeScript (Node.js ESM) |

Supplements: view-display-integration.md (Section 3: Column Specification)

## Logic

### generateHeaderLine

Iterates `ViewConfig.display['columns-order']`, generates header text for each visible column using `normalizeColumn()`, then appends the directory column if visible.

### Header Text Mapping

| Column Name | Header Text |
|------------|-------------|
| timestamp | Event Timestamp |
| elapsed | Elapsed |
| fileName | File Name |
| event | Event |
| lines | Lines |
| blocks | Blks |
| size | Size |
| directory | Directory |

### generateSeparatorLine

Returns `U+2500` (Box Drawings Light Horizontal) repeated to the given width. Default fallback: 180 chars.
