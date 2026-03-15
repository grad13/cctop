---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -
id: SPEC-V-SUP-020
title: HeaderRenderer (Supplement)
version: 2.1
status: draft
source:
  - path: code/view/src/ui/components/EventTable/renderers/HeaderRenderer.ts
    runtime: TypeScript (Node.js ESM)
type: supplement
supplements: view-display-integration.md
created: 2026-03-14
---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -

# HeaderRenderer (Supplement)

## Meta
| Source | Runtime |
|--------|---------|
| `code/view/src/ui/components/EventTable/renderers/HeaderRenderer.ts` | TypeScript (Node.js ESM) |

Supplements: view-display-integration.md (Section 6: Separator Line)

## Logic

Static renderer that delegates to `generateHeaderLine()` and `generateSeparatorLine()` from columnConfig utilities.

| Method | Output |
|--------|--------|
| `renderHeader(viewConfig, screenWidth, dirWidth)` | Header line + separator line joined by `\n` |
| `renderColumnLine(viewConfig, dirWidth)` | Header line only |
| `renderSeparator(width)` | `---` repeated to fill width |
