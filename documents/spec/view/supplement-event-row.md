---
updated: 2026-03-17 12:08
checked: -
id: SPEC-V-SUP-016
title: EventRow Component (Supplement)
version: 2.1
status: draft
source:
  - path: code/app/view/src/ui/components/EventTable/EventRow.ts
    runtime: TypeScript (Node.js ESM)
type: supplement
supplements: view-display-integration.md
---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -

# EventRow Component (Supplement)

## Meta
| Source | Runtime |
|--------|---------|
| `code/app/view/src/ui/components/EventTable/EventRow.ts` | TypeScript (Node.js ESM) |

Supplements: view-display-integration.md (Section 3: Column Specification)

## Logic - Render Pipeline Not in Existing Spec

### Dirty-Check Rendering

EventRow uses a dirty flag + cached render string. `render()` returns cached string unless data, selection, or width has changed. `invalidate()` forces re-render.

### Column Rendering Order

Columns are rendered according to `ViewConfig.display['columns-order']`. Each column is normalized via `normalizeColumn()` with width and alignment from config.

### Directory Mute Paths

If the directory starts with a configured mute path, that prefix is stripped from display. Truncation mode switches to 'tail' for muted paths (vs 'head' for full paths).

### Selection Styling

| Selected | Style |
|----------|-------|
| true | `{blue-bg}` background |
| false | `{green-fg}` foreground |

### Event Type Colorization

Uses `EventTableColors` from config if available, falls back to `EventTypeFormatter.colorize()` default mapping.
