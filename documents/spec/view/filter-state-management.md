---
updated: 2026-03-14 15:42
checked: -
Deprecated: -
Format: spec-v2.1
Source: documents/visions/functions/FUNC-301-filter-state-management.md
---

# Specification: Filter State Management

## 0. Meta

| Source | Runtime |
|--------|---------|
| view/src/ui/state/ | Node.js |

| Field | Value |
|-------|-------|
| Related | view/view-display-integration.md, view/event-type-filtering.md, view/ui-filter-integration.md |
| Test Type | Unit |

## 1. Overview

UI表示における3つのフィルター（unique/all、event filter、keyword filter）の状態管理機能。集合論的アプローチによる操作履歴の管理と、動的データ更新への対応を提供する。

**Scope (in)**:
- FilterState の管理
- 操作履歴の保持・適用
- vanilla tableへの操作結果の反映
- 状態の初期化・リセット機能
- 集合論的アプローチによる処理順序制御

**Scope (out)**:
- UIコンポーネントの描画（FUNC-202の責務）
- データベースアクセス（FUNC-000の責務）
- キー入力の処理（FUNC-300の責務）

## 2. Data Interfaces

```typescript
interface FilterState {
  mode: 'all' | 'unique';           // display mode (exclusive)
  eventFilters: string[];           // event type filters (cumulative)
  keywordFilter: string;            // keyword filter (cumulative)

  // internal management
  vanillaTable: EventRecord[];      // current working set
  lastAppliedAt: Date;              // last applied timestamp
  operationHistory: FilterOperation[];
}

interface FilterOperation {
  type: 'mode' | 'event' | 'keyword';
  operation: 'set' | 'add' | 'remove' | 'clear';
  value: any;
  appliedAt: Date;
}
```

## 3. Processing Flow (Set Theory Approach)

```
1. vanilla table (DB) → apply operation history → display set
2. DB update detected → re-apply operation history → reflect diff on screen
```

### all mode

```
all events → event filter → keyword filter → display
```

### unique mode

```
1. Identify latest event per file (unique processing)
2. Check if latest event satisfies event filter conditions
3. Apply keyword filter to qualifying files only
4. Display final result set
```

## 4. Critical Rule: unique mode + event filter

When file A's latest event is Delete and Delete is excluded by event filter:
- File A is not displayed at all (neither Create nor Modify)
- Reason: latest event (Delete) fails the filter check

## 5. State Manager Implementation

```typescript
class FilterStateManager {
  private state: FilterState;

  constructor() {
    this.state = this.createVanillaState();
  }

  // state mutations
  updateMode(mode: 'all' | 'unique'): void {}
  addEventFilter(eventType: string): void {}
  removeEventFilter(eventType: string): void {}
  setKeywordFilter(keyword: string): void {}

  // operation history
  applyOperationHistory(): EventRecord[] {}
  addOperation(operation: FilterOperation): void {}

  // vanilla table management
  updateVanillaTable(newEvents: EventRecord[]): void {}
  optimizeVanillaTable(): void {} // remove stale entries

  // state control
  resetToVanilla(): void {}
  restorePreviousState(): void {}

  // set generation
  generateDisplaySet(): EventRecord[] {}
}
```

## 6. Display Set Generation

```typescript
generateDisplaySet(): EventRecord[] {
  let result = [...this.state.vanillaTable];

  if (this.state.mode === 'unique') {
    const latestEvents = this.getLatestEventPerFile(result);
    result = latestEvents.filter(event =>
      this.state.eventFilters.length === 0 ||
      this.state.eventFilters.includes(event.eventType)
    );
  } else {
    result = result.filter(event =>
      this.state.eventFilters.length === 0 ||
      this.state.eventFilters.includes(event.eventType)
    );
  }

  if (this.state.keywordFilter) {
    result = result.filter(event =>
      event.fileName.includes(this.state.keywordFilter) ||
      event.directory.includes(this.state.keywordFilter)
    );
  }

  return result;
}
```

## 7. Vanilla State Definition

```typescript
const VANILLA_STATE: FilterState = {
  mode: 'all',
  eventFilters: [],   // all event types allowed
  keywordFilter: '',
  vanillaTable: [],
  lastAppliedAt: new Date(),
  operationHistory: []
};
```

## 8. Reset Triggers

| Trigger | Action |
|---------|--------|
| normal mode + `[ESC]` | Reset all filters to vanilla state |
| edit mode + `[ESC]` | Discard edits, restore previous state |

## 9. Update Timing

| Operation | Timing |
|-----------|--------|
| mode switch | real-time |
| event filter toggle | real-time |
| keyword filter DB search | on Enter key press |
| vanilla table update | 100ms polling |

## 10. Vanilla Table Management

- DB search results are merged into vanilla table
- When count exceeds capacity, oldest entries are removed
- Only new additions are processed (avoid full recomputation)

## 11. FUNC-202 Integration Interface

```typescript
interface FilterStateEvents {
  onStateChange: (newDisplaySet: EventRecord[]) => void;
  onModeChange: (mode: 'all' | 'unique') => void;
  onFilterChange: (activeFilters: string[]) => void;
}
```

## 12. Test Requirements

- Operation history is recorded and applied accurately
- Reset to vanilla state is accurate
- Restore to previous state is accurate
- unique mode + event filter processing order is correct
- Deleted file exclusion works as expected
- Consistency of results across mode switches
- Operation history re-applied on vanilla table update
- New data integrated correctly
- Stale data removed correctly
