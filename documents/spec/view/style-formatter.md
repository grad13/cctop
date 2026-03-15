---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -
id: SPEC-V-NEW-004
title: Style Formatter Utilities
version: 2.1
status: draft
source:
  - path: code/view/src/ui/utils/styleFormatter.ts
    runtime: TypeScript (Node.js ESM)
type: new
created: 2026-03-14
---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -

# Style Formatter Utilities

## Meta
| Source | Runtime |
|--------|---------|
| `code/view/src/ui/utils/styleFormatter.ts` | TypeScript (Node.js ESM) |

## Contract

```typescript
type Color = 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white' | 'black';
type TextStyle = 'bold' | 'underline' | 'blink' | 'inverse' | 'invisible';

function fg(text: string, color: Color): string;
function bg(text: string, color: Color): string;
function bold(text: string): string;
function underline(text: string): string;
function style(text: string, options: { fg?: Color; bg?: Color; bold?: boolean; underline?: boolean }): string;
function stripStyles(text: string): string;
function eventTypeColor(eventType: string): string;
```

## Logic

### Tag Format

All functions wrap text with blessed-compatible tags: `{color-fg}text{/color-fg}`, `{bold}text{/bold}`, etc.

### style() Application Order

Styles are nested in this order (innermost to outermost): bg -> fg -> bold -> underline.

### eventTypeColor Mapping

| Event Type | Color |
|------------|-------|
| find | cyan |
| create | green |
| modify | yellow |
| delete | red |
| move | magenta |
| restore | blue |
| back | blue |
| (unknown) | white |

Matching is case-insensitive with whitespace trimming.

### stripStyles

Removes all blessed tags using regex `\{[^}]+\}`.

## Side Effects

None. Pure string transformation functions.
