---
updated: 2026-03-17 12:08
checked: -
id: SPEC-V-SUP-019
title: EventTypeFormatter (Supplement)
version: 2.1
status: draft
source:
  - path: code/app/view/src/ui/components/EventTable/formatters/EventTypeFormatter.ts
    runtime: TypeScript (Node.js ESM)
type: supplement
supplements: view-display-integration.md
---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -

# EventTypeFormatter (Supplement)

## Meta
| Source | Runtime |
|--------|---------|
| `code/app/view/src/ui/components/EventTable/formatters/EventTypeFormatter.ts` | TypeScript (Node.js ESM) |

Supplements: view-display-integration.md (Section 3: Column Specification - Event column)

## Logic

### format() - Fixed-Width Padding

All event types are normalized to exactly 6 characters:

| Input | Output |
|-------|--------|
| find | `find  ` |
| create | `create` |
| modify | `modify` |
| delete | `delete` |
| move | `move  ` |
| restore | `back  ` |
| back | `back  ` |
| (other) | padEnd(6) or truncate(6) |

### colorize()

Delegates to `eventTypeColor()` from styleFormatter after formatting.
