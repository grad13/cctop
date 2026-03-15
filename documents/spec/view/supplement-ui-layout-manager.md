---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -
id: SPEC-V-SUP-013
title: UI Layout Manager (Supplement)
version: 2.1
status: draft
source:
  - path: code/view/src/ui/UILayoutManager.ts
    runtime: TypeScript (Node.js ESM)
type: supplement
supplements: view-display-integration.md
created: 2026-03-14
---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -

# UI Layout Manager (Supplement)

## Meta
| Source | Runtime |
|--------|---------|
| `code/view/src/ui/UILayoutManager.ts` | TypeScript (Node.js ESM) |

Supplements: view-display-integration.md (Section 2: Screen Layout)

## Contract

```typescript
class UILayoutManager {
  constructor(screen: blessed.Widgets.Screen, uiState: UIState, viewConfig?: ViewConfig);
  setupFramelessLayout(): void;
  setViewConfig(newViewConfig: ViewConfig): void;
  updateDynamicControl(): void;
  updateStatusBar(): void;
  updateDisplay(): void;
  getEventList(): blessed.Widgets.BoxElement;
  getHeaderPanel(): any;
  getStatusBar(): any;
  getDynamicControlBar(): any;
  getSeparatorLine(): any;
}
```

## Logic - Layout Structure Implementation

The existing spec describes the 4-area structure conceptually. This supplement documents the blessed component layout:

### Component Positions (from UI_LAYOUT constants)

| Component | Position | Height |
|-----------|----------|--------|
| headerPanel | top: 0 | HEADER_HEIGHT |
| headerSeparator | top: HEADER_SEPARATOR_TOP | 1 |
| eventArea | top: EVENT_AREA_TOP | EVENT_AREA_HEIGHT |
| separatorLine | bottom: SEPARATOR_BOTTOM | 1 |
| statusBar | bottom: STATUS_BAR_BOTTOM | 1 |
| keyGuideBar | bottom: KEY_GUIDE_BOTTOM | 1 |
| dynamicControlBar | bottom: CONTROL_BAR_BOTTOM | 1 |

### updateDisplay Flow

1. Recalculate dynamic width via `uiState.calculateDynamicWidth()`
2. Update EventTable screen width
3. Get visible events slice from UIState
4. Calculate relative selected index (absolute - viewportStart)
5. Update EventTable content with hasMoreData flag
6. Refresh table and status bar
7. Render screen

### parseTags Usage

`updateDynamicControl()` uses `blessed.parseTags()` to pre-process tagged content before setting it on the text widget.
