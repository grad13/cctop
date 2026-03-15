---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -
id: SPEC-V-SUP-010
title: UI Content Builder (Supplement)
version: 2.1
status: draft
source:
  - path: code/view/src/ui/UIContentBuilder.ts
    runtime: TypeScript (Node.js ESM)
type: supplement
supplements: view-display-integration.md
created: 2026-03-14
---
Created: 2026-03-14
Updated: 2026-03-14
Checked: -

# UI Content Builder (Supplement)

## Meta
| Source | Runtime |
|--------|---------|
| `code/view/src/ui/UIContentBuilder.ts` | TypeScript (Node.js ESM) |

Supplements: view-display-integration.md (Section 7: Screen State Examples)

## Contract

```typescript
class UIContentBuilder {
  constructor(uiState: UIState, eventTable: EventTableViewport);
  buildHeaderContent(): string;
  buildCommandLine1(): string;
  buildKeyGuideContent(): string;
  buildDynamicControlContent(): string;
}
```

## Logic - Content Generation Rules

### buildHeaderContent

Format: `{bold}cctop v0.5.0.0 {daemonStatus} | Keyword: {searchText}{/bold}\n{columnHeader}`

Keyword section shown only when search pattern is active.

### buildCommandLine1

| Display State | q disabled | Pause/Resume text | Mode highlight |
|--------------|-----------|-------------------|----------------|
| keyword_filter | Yes (grayed) | From isPausedState | Green on active |
| Other | No | From isPausedState | Normal text |

### buildKeyGuideContent

| Display State | Guide Text |
|--------------|------------|
| event_type_filter, keyword_filter | `[Enter] Confirm Filter [ESC] Cancel Back [up/down] Select` |
| stream_live, stream_paused | `[ESC] Reset All Filters [up/down] Select` |

### buildDynamicControlContent

| Display State | Content |
|--------------|---------|
| event_type_filter | Filter toggle buttons with enabled/disabled colors |
| keyword_filter | `Keyword: [{text}{padding}] [Shift+Enter] Search DB` |
| stream_live, stream_paused | `[f] Event-Type Filter  [/] Keyword Filter` |
