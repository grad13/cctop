---
updated: 2026-03-17 12:08
checked: -
id: SPEC-V-SUP-012
title: UI Key Handler (Supplement)
version: 2.1
status: draft
source:
  - path: code/app/view/src/ui/UIKeyHandler.ts
    runtime: TypeScript (Node.js ESM)
type: supplement
supplements: view-display-integration.md
---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -

# UI Key Handler (Supplement)

## Meta
| Source | Runtime |
|--------|---------|
| `code/app/view/src/ui/UIKeyHandler.ts` | TypeScript (Node.js ESM) |

Supplements: view-display-integration.md (Section 10: Key Bindings)

## Contract

```typescript
class UIKeyHandler {
  constructor(screen: blessed.Widgets.Screen, uiState: UIState, eventList: any, callbacks: {
    refreshData: () => Promise<void>;
    updateDisplay: () => void;
    updateDynamicControl: () => void;
    updateStatusBar: () => void;
    stop: () => Promise<void>;
    loadMore?: () => Promise<void>;
  });
  setupKeyHandlers(): void;
  getFilterKeyMap(): Record<string, string>;
}
```

## Logic - Implementation Details Not in Existing Spec

### Debounced Search

The existing spec does not document the debounce mechanism. In keyword_filter mode, character input and backspace trigger a 300ms debounced search (`SEARCH_DEBOUNCE_MS = 300`). Selection resets to index 0 on each keystroke.

### Character Input Filtering

In keyword_filter mode, only printable ASCII characters (charCode 32-126) are accepted. Control characters including `\r`, `\n` are filtered out. `ctrl` and `meta` modified keys are ignored.

### Infinite Scroll / Load More

Down arrow at the bottom of the list triggers `loadMoreCallback()` without awaiting (non-blocking). `shouldLoadMoreData()` is checked on every down-arrow press, not just at the last item.

### Key State Guards

Most keys check `displayState !== 'keyword_filter'` to prevent accidental activation during text input. `C-c` always works regardless of state.
