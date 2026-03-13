---
Created: 2026-03-13
Updated: 2026-03-13
Checked: -
Deprecated: -
Format: spec-v2.1
Source: documents/visions/functions/FUNC-203-event-type-filtering.md
---

# Specification: Event Type Filtering

## 0. Meta

| Source | Runtime |
|--------|---------|
| modules/view/src/ui/EventTypeFilterFlags.ts | Node.js |

| Field | Value |
|-------|-------|
| Related | filter-state-management.md, view-display-integration.md, ui-filter-integration.md |
| Test Type | Unit |

## 1. Overview

イベントタイプ別のリアルタイムフィルタリング機能。キーボードショートカットによる特定イベントの表示/非表示切り替えを提供する。

**Scope (in)**:
- イベントタイプ別フィルタリング（find/create/modify/delete/move/restore）
- フィルタロジックの実装
- FUNC-301への状態変更通知
- FUNC-300からのキー入力コールバック処理

**Scope (out)**:
- キーボード入力の直接処理（FUNC-300の責務）
- フィルタ状態の管理・保持（FUNC-301の責務）
- 表示データの生成・管理（FUNC-301の責務）
- ファイル名・パス・サイズによるフィルタリング
- 複雑な検索クエリ・正規表現フィルタ

## 2. Key Bindings (via FUNC-300)

| Key | Event Type | Description | Priority |
|-----|-----------|-------------|----------|
| `f` | find | Initial scan | 10 (low) |
| `c` | create | File creation | 10 (low) |
| `m` | modify | File modification | 10 (low) |
| `d` | delete | File deletion | 10 (low) |
| `v` | move | Move / rename | 10 (low) |
| `r` | restore | File restore | 10 (low) |

Note: In selection mode (PIL-002) these keys are disabled; selection operations take priority.

## 3. FUNC-300 Registration

```javascript
KeyInputManager.register({
  id: 'event-filter-control',
  mode: 'waiting',
  keys: ['f', 'c', 'm', 'd', 'v', 'r'],
  priority: 10,
  callback: (key) => {
    const eventType = FUNC203.getEventTypeFromKey(key);
    FUNC301.toggleEventFilter(eventType); // state owned by FUNC-301
  }
});
```

## 4. Responsibility Separation

| Component | Responsibility |
|-----------|---------------|
| FUNC-203 | Event type mapping, filter logic |
| FUNC-301 | Filter state management, operation history |
| FUNC-202 | Visual rendering of filter state |

## 5. Filter Logic

```javascript
class EventTypeFilter {
  getEventTypeFromKey(key) {
    const mapping = {
      'f': 'find', 'c': 'create', 'm': 'modify',
      'd': 'delete', 'v': 'move', 'r': 'restore'
    };
    return mapping[key];
  }

  applyFilter(events, activeFilters) {
    return events.filter(event => activeFilters.includes(event.eventType));
  }
}
```

## 6. Display Behavior

Filter status is shown at the bottom of the screen:

```
[f]:Find [c]:Create [m]:Modify [d]:Delete [v]:Move [r]:Restore
```

- Active: key character = green, label = white
- Inactive: key character = black, label = dark gray

## 7. Operational Rules

1. **Default state**: all filters ON (all events visible)
2. **Toggle behavior**: key press switches visibility on/off
3. **Immediate update**: existing display updates instantly on filter change
4. **Independent operation**: each filter operates independently
