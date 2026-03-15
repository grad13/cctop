---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -
id: SPEC-V-SUP-021
title: SelectionRenderer (Supplement)
version: 2.1
status: draft
source:
  - path: code/view/src/ui/components/EventTable/renderers/SelectionRenderer.ts
    runtime: TypeScript (Node.js ESM)
type: supplement
supplements: view-display-integration.md
created: 2026-03-14
---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -

# SelectionRenderer (Supplement)

## Meta
| Source | Runtime |
|--------|---------|
| `code/view/src/ui/components/EventTable/renderers/SelectionRenderer.ts` | TypeScript (Node.js ESM) |

Supplements: view-display-integration.md (Section 2: Screen Layout - Event Rows Area)

## Logic

Static utility for row selection styling:

| Method | Behavior |
|--------|----------|
| `applySelection(content, true)` | Wraps with `{blue-bg}...{/blue-bg}` |
| `applySelection(content, false)` | Returns content unchanged |
| `applyNormalStyle(content)` | Wraps with `{green-fg}...{/green-fg}` |
| `shouldHighlight(rowIndex, selectedIndex)` | Returns `rowIndex === selectedIndex` |

Note: EventRow.render() handles selection styling directly. SelectionRenderer provides a reusable utility for the same logic.
