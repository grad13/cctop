---
updated: 2026-03-14 15:42
checked: -
Deprecated: -
Format: spec-v2.1
Source: documents/visions/functions/FUNC-202-view-display-integration.md
---

# Specification: View Display Integration

## 0. Meta

| Source | Runtime |
|--------|---------|
| view/src/ui/ | Node.js |

| Field | Value |
|-------|-------|
| Related | view/east-asian-width-display.md, view/event-type-filtering.md, view/ui-filter-integration.md, view/filter-state-management.md, view/keyword-search-management.md, view/runtime-control-management.md |
| Test Type | Unit |

## 1. Overview

データベースから取得したファイルイベントをリアルタイムで表示するViewインターフェース。All/Uniqueモード切り替えにより、用途に応じた最適な表示を提供する。

**Scope (in)**:
- データベースからのイベント取得・表示
- FUNC-301からの表示データセット受信・描画
- 二重バッファによる描画
- East Asian Width 対応
- UI状態の視覚的表現（モード・フィルタ状態の表示）

**Scope (out)**:
- ファイル監視（FUNC-002の責務）
- データベース管理（FUNC-000の責務）
- 設定管理（FUNC-101/105の責務）
- キーボード入力処理（FUNC-300の責務）
- フィルター状態管理（FUNC-301の責務）
- フィルタリングロジック（FUNC-203/208の責務）
- バックグラウンド監視（FUNC-003 Daemon Processの責務）

## 2. Screen Layout (4-Area Structure)

| Area | Description |
|------|-------------|
| Header Area | System status display |
| Event Rows Area | Event list |
| Command Keys Area | Operation guide (2 fixed lines) |
| Dynamic Control Area | Context-sensitive 3rd line |

## 3. Column Specification

| Column | Width | Align | Description |
|--------|-------|-------|-------------|
| Event Timestamp | 19 | left | Event occurrence time |
| Elapsed | 9 | right | Elapsed time |
| File Name | 35 | left | Filename (truncated) |
| Event | 8 | left | Event type |
| Lines | 6 | right | Line count |
| Blocks | 8 | right | Block count |
| Size | 7 | right | File size (dynamic unit) |
| Directory | variable | left | Directory path |

## 4. Elapsed Time Display

| Elapsed | Format | Example | Notes |
|---------|--------|---------|-------|
| 0–60 min | mm:ss | 00:04 | max 59:59 |
| 60 min–10 h | h:mm:ss | 1:00:04 | 1-digit hour |
| 10 h–72 h | hh:mm:ss | 10:00:04 | 2-digit hour, max 71:59:59 |
| 72 h–90 days | n days | 3 days | max 89 days |
| 90+ days | n months | 3 months | 30 days = 1 month |

Width: 9 chars fixed, right-justified, space-padded left.

## 5. Size Display

| Size | Unit | Example | Notes |
|------|------|---------|-------|
| 0–1023 B | B | 768B | bytes |
| 1KB–1023KB | K | 15.2K | 1 decimal place |
| 1MB–1023MB | M | 1.3M | 1 decimal place |
| 1GB+ | G | 2.1G | 1 decimal place |

Width: 7 chars fixed, right-justified.

## 6. Separator Line

- Character: `─` (U+2500 Box Drawings Light Horizontal)
- Length: full terminal width or content width (dynamic)
- Position: below header line and below column header line

## 7. Screen State Examples

### Normal Mode

```
cctop v1.0.0.0 Daemon: ●RUNNING (PID: 43262)

Event Timestamp      Elapsed  File Name                     Event   Lines  Blocks    Size Directory
────────────────────────────────────────────────────
2025-06-25 19:07:51     00:04  FUNC-112-cli-display-inte...  modify    197     16   15.2K documents/visions/functions
2025-06-25 19:07:33     00:22  FUNC-001-file-lifecycle-t...  modify    207     16    1.3M ...ments/visions/blueprints
────────────────────────────────────────────────────
[q] Exit [space] Pause [x] Refresh [a] All [u] Unique
[ESC] Reset All Filters [↑↓] Select an Event
[f] Filter Events　[/] Quick Search
```

### Event Filter Mode (after `f`)

```
[q] Exit [space] Pause [x] Refresh [a] All [u] Unique
[Enter] Confirm Filter [ESC] Cancel Back [↑↓] Select an Event
[f] Find [c] Create [m] Modify [d] Delete [v] Move [r] Restore
```

### Quick Search Mode (after `/`)

```
[q] Exit [space] Pause [x] Refresh [a] All [u] Unique
[Enter] Confirm Filter [ESC] Cancel Back [↑↓] Select an Event
Search: [____________________________________] [Shift+Enter] Search DB
```

### Paused Mode (after `space`)

```
[q] Exit [space] Resume [x] Refresh [a] All [u] Unique
[ESC] Reset All Filters [↑↓] Select an Event
[f] Filter Events　[/] Quick search
```

Note: Daemon continues running; only stream display is paused.

## 8. Display Modes

### All Mode
- Shows all events in chronological order
- Fetches from events table with JOIN on files and measurements
- Includes deleted files
- Update frequency: every 100ms

### Unique Mode
- Shows only the latest event per file
- If the latest event is excluded by event filter, the entire file is hidden
- Example: File A (Create → Modify → Delete) + Delete excluded = File A entirely hidden
- Update frequency: every 100ms (same as All mode)
- Full specification: ui-filter-integration.md

## 9. State Mapping with FUNC-300

| FUNC-300 Input State | FUNC-202 Display State | Description |
|---------------------|----------------------|-------------|
| `waiting` | `normal` | Normal display (stream active) |
| `filtering` | `filter` | Event filter selection mode |
| `searching` | `search` | Quick search input mode |
| `selecting` | `normal` | Selection mode (normal display) |
| `paused` | `paused` | Stream paused (Daemon continues) |
| `detail` | `detail` | Detail view mode |

## 10. Key Bindings (FUNC-300 managed)

### Waiting Mode

| Key | FUNC-300 Action | FUNC-202 Action |
|-----|----------------|----------------|
| `q` | Exit application | - |
| `space` | Transition to paused | Stop display update |
| `x` | - | Manual refresh |
| `a` | - | Switch to All mode |
| `u` | - | Switch to Unique mode |
| `f` | Transition to filtering | Update Dynamic Area |
| `/` | Transition to searching | Update Dynamic Area |
| `ESC` | - | Clear filter and search |
| `↑/↓` | Transition to selecting | Start selection display |

### Filtering Mode

| Key | FUNC-300 Action | FUNC-202 Action |
|-----|----------------|----------------|
| `f/c/m/d/v/r` | Call FUNC-203 | Update filter display |
| `ESC` | Transition to waiting (discard edits) | Restore pre-edit state |
| `Enter` | Transition to waiting (keep edits) | Apply filter settings |

### Searching Mode

| Key | FUNC-300 Action | FUNC-202 Action |
|-----|----------------|----------------|
| `[text]` | Manage input buffer | Real-time local search |
| `Enter` | Transition to waiting (keep) | Apply search setting |
| `Shift+Enter` | Execute DB search | Display DB search results |
| `ESC` | Transition to waiting (discard) | Restore pre-search state |

## 11. FUNC-300 Integration Example

```javascript
KeyInputManager.initializeStateMaps() {
  this.registerToState('waiting', 'q', FUNC202.exit);
  this.registerToState('waiting', 'a', FUNC202.setAllMode);
  this.registerToState('waiting', 'u', FUNC202.setUniqueMode);
  this.registerToState('waiting', 'x', FUNC202.refresh);

  this.registerToState('waiting', 'space', () => {
    this.setState('paused');
    FUNC202.updateDisplayState({ mode: 'paused', streamActive: false });
  });
  this.registerToState('waiting', 'f', () => {
    this.setState('filtering');
    FUNC202.updateDisplayState({ mode: 'filter' });
  });
  this.registerToState('waiting', '/', () => {
    this.setState('searching');
    FUNC202.updateDisplayState({ mode: 'search' });
  });

  this.registerToState('filtering', 'Escape', () => {
    this.setState('waiting');
    FUNC202.discardEditsAndRestorePrevious();
  });
  this.registerToState('filtering', 'Enter', () => {
    this.setState('waiting');
    FUNC202.applyEditsAndUpdateState();
  });

  this.registerToState('searching', 'Enter', () => {
    this.setState('waiting');
    FUNC202.applySearchAndUpdateState();
  });
  this.registerToState('searching', 'Shift+Enter', () => {
    FUNC202.applySearch(this.getInputBuffer());
  });
  this.registerToState('searching', 'Escape', () => {
    this.setState('waiting');
    FUNC202.discardSearchAndRestorePrevious();
  });
}

FUNC202.updateDisplayState = function(displayState) {
  this.currentDisplayState = displayState;
  this.updateDynamicArea(displayState.mode);
  if (displayState.streamActive !== undefined) {
    this.setStreamActive(displayState.streamActive);
  }
};
```

## 12. Component Design

1. **DataFetcher**: DB query execution, All/Unique SQL generation, result caching, filter/search condition application
2. **Formatter**: Column width calculation (East Asian Width), time/size formatting, dynamic unit conversion (B/K/M/G), path abbreviation, keyword highlighting
3. **Renderer**: Double buffer usage, color application, 4-area structure rendering, Dynamic Control Area switching
4. **StateManager**: Display state management (normal/filter/search/paused), filter condition retention, search keyword retention, FUNC-300 state sync

## 13. Pause / Resume

- Key: `[space]`
- Stops display update timer; data collection continues
- Pause/Resume switch: < 50ms
- Manual refresh (`[x]`) works regardless of pause state

## 14. Manual Refresh

- Key: `[x]` (changed from `[r]`)
- Re-fetches with current filter and mode settings
- Completes within 500ms
- Key input remains responsive during refresh

## 15. Performance Requirements

| Item | Target |
|------|--------|
| Normal update interval | 100ms |
| Pause/Resume latency | < 50ms |
| Manual refresh completion | < 500ms |

## 16. Test Requirements

- All/Unique mode switching
- Pause/Resume functionality
- Manual refresh
- Database synchronization
- State transitions: Normal → Filter → Normal, Normal → Search → Normal
- Pause state operations
- ESC reset
- Event type filter toggles
- Filter combinations
- East Asian Width character display
- Color application
- Dynamic Control Area switching
- Header filter state display
- 100ms update interval
- Large event volume stability
