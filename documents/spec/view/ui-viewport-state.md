---
updated: 2026-03-17 12:08
checked: -
id: SPEC-V-NEW-003
title: UI Viewport State
version: 2.1
status: draft
source:
  - path: code/app/view/src/ui/state/UIViewportState.ts
    runtime: TypeScript (Node.js ESM)
type: new
---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -

# UI Viewport State

## Meta
| Source | Runtime |
|--------|---------|
| `code/app/view/src/ui/state/UIViewportState.ts` | TypeScript (Node.js ESM) |

## Contract

```typescript
class UIViewportState {
  getSelectedIndex(): number;
  setSelectedIndex(index: number, totalEvents: number): void;
  getViewportStartIndex(): number;
  getViewportHeight(): number;
  setViewportHeight(height: number): void;
  getVisibleSlice<T>(allEvents: T[]): T[];
  getRelativeSelectedIndex(): number;
  moveSelectionUp(totalEvents: number): void;
  moveSelectionDown(totalEvents: number): void;
  isTopRowVisible(): boolean;
  resetViewport(): void;
  getViewportInfo(): ViewportInfo;
}

interface ViewportInfo {
  selectedIndex: number;
  viewportStartIndex: number;
  viewportHeight: number;
  relativeSelectedIndex: number;
}
```

## State

Internal state: `selectedIndex`, `viewportStartIndex`, `viewportHeight` (default: 20).

```mermaid
stateDiagram-v2
  [*] --> Idle: constructor (selectedIndex=0, viewportStartIndex=0)
  Idle --> SelectionChanged: setSelectedIndex / moveUp / moveDown
  SelectionChanged --> ViewportAdjusted: adjustViewportForSelection
  ViewportAdjusted --> Idle
  Idle --> Reset: resetViewport
  Reset --> Idle: selectedIndex=0, viewportStartIndex=0
```

## Logic

### Bounds Checking

`setSelectedIndex(index, total)`: clamps to `[0, total-1]`, then calls `adjustViewportForSelection`.

### Viewport Adjustment

| Condition | Action |
|-----------|--------|
| selectedIndex < viewportStartIndex | viewportStartIndex = selectedIndex |
| selectedIndex > viewportStartIndex + viewportHeight - 1 | viewportStartIndex = selectedIndex - viewportHeight + 1 |
| viewportStartIndex > max(0, total - viewportHeight) | clamp to maxViewportStart |

### getVisibleSlice

Returns `allEvents.slice(viewportStartIndex, viewportStartIndex + viewportHeight)`.

### isTopRowVisible

Returns `viewportStartIndex === 0`. Used by auto-refresh logic to skip refresh when user has scrolled down.

## Side Effects

None. Pure state management, no I/O.
