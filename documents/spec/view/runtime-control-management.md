---
Created: 2026-03-13
Updated: 2026-03-13
Checked: -
Deprecated: -
Format: spec-v2.1
Source: documents/visions/functions/FUNC-210-runtime-control-management.md
---

# Specification: Runtime Control Management

## 0. Meta

| Source | Runtime |
|--------|---------|
| view/src/ui/UIDataManager.ts | Node.js |

| Field | Value |
|-------|-------|
| Related | view/view-display-integration.md, view/filter-state-management.md |
| Test Type | Unit |

## 1. Overview

Pause/Resume（一時停止/再開）制御とManual Refresh（手動更新）機能を提供する。開発・デバッグ・プレゼンテーション時の効率的な制御を実現する。

**Scope (in)**:
- Pause/Resume状態の管理・制御
- Manual Refresh処理の実行
- Runtime状態の視覚的表示
- FUNC-300/202との制御連携
- パフォーマンス最適化制御

**Scope (out)**:
- 表示・描画処理（FUNC-202の責務）
- キーボード入力処理（FUNC-300の責務）
- データベース直接操作（FUNC-000の責務）
- 設定管理（FUNC-101/105の責務）

## 2. Pause / Resume Control

### State Definition

```javascript
const RuntimeState = {
  RUNNING: 'running',
  PAUSED: 'paused'
};

class RuntimeControlManager {
  constructor() {
    this.state = RuntimeState.RUNNING;
    this.displayUpdateTimer = null;
  }

  togglePauseResume() {
    this.state = this.state === RuntimeState.RUNNING
      ? RuntimeState.PAUSED
      : RuntimeState.RUNNING;
    this.updateDisplayControl();
    this.notifyStateChange();
  }
}
```

### Control Level Matrix

| Level | RUNNING | PAUSED |
|-------|---------|--------|
| Display update | active | stopped |
| Data collection | continues | continues |
| User operations | active | active |
| Manual refresh | active | active |

### State Transition

```
RUNNING ──[space]──> PAUSED
   ↑                   │
   └────────[space]────┘
```

## 3. Manual Refresh

```javascript
class ManualRefreshManager {
  async executeRefresh() {
    const context = this.getCurrentContext();
    const freshData = await this.fetchDataByEnvironment(context);
    this.notifyDataRefresh(freshData);
    this.logRefreshAction(context);
  }

  getCurrentContext() {
    return {
      filters: getCurrentFilters(),
      mode: getCurrentMode(),
      environment: getEnvironment()
    };
  }
}
```

### Environment-Based Data Strategy

```javascript
async fetchDataByEnvironment(context) {
  switch (context.environment) {
    case 'development':
    case 'test':
      return generateDummyEvents(context.filters, context.mode);
    case 'production':
      return await fetchLatestEventsFromDB(context.filters, context.mode);
    case 'demo':
    case 'presentation':
      return generateSampleData(context.filters, context.mode);
    default:
      return await fetchLatestEventsFromDB(context.filters, context.mode);
  }
}
```

### Execution Guarantees

- **Atomicity**: complete execution or complete rollback
- **Consistency**: display data and filter state remain consistent
- **Responsiveness**: completes within 500ms
- **Error handling**: appropriate fallback on failure

## 4. FUNC-300 Key Registration

```javascript
function registerRuntimeControlKeys() {
  KeyInputManager.registerToState('waiting', 'space', () => {
    RuntimeControlManager.togglePauseResume();
  });

  KeyInputManager.registerToState('waiting', 'x', () => {
    RuntimeControlManager.executeManualRefresh();
  });

  // Operations that continue during pause
  KeyInputManager.registerToState('paused', ['f', '/', '↑', '↓', 'ESC'], (key) => {
    KeyInputManager.handlePausedModeKey(key);
  });
}
```

### State Notification

```javascript
function notifyStateChange(newState) {
  KeyInputManager.setRuntimeState(newState);
  FUNC202.updateRuntimeDisplay(newState);
  console.log(`Runtime state changed: ${this.previousState} → ${newState}`);
}
```

## 5. FUNC-202 Display Integration

### Display Config

```javascript
function updateDisplayState(state) {
  const displayConfig = {
    runtimeState: state,
    statusText: state === RuntimeState.RUNNING ? 'RUNNING' : 'PAUSED',
    commandText: state === RuntimeState.RUNNING ? 'Pause' : 'Resume',
    updateActive: state === RuntimeState.RUNNING
  };
  FUNC202.updateRuntimeDisplay(displayConfig);
}
```

### Command Keys Text

```javascript
function getCommandKeysText(state) {
  const pauseResumeText = state === RuntimeState.RUNNING ? 'Pause' : 'Resume';
  return [
    `[q] Exit [space] ${pauseResumeText} [x] Refresh [a] All [u] Unique`,
    `[ESC] Reset All Filters [↑↓] Select an Event`,
    `[f] Filter Events　[/] Quick Search`
  ];
}
```

## 6. Integration Interfaces

```typescript
interface RuntimeControlKeyInterface {
  registerPauseResumeKey(): void;
  registerManualRefreshKey(): void;
  notifyRuntimeStateChange(state: RuntimeState): void;
}

interface RuntimeDisplayInterface {
  updateRuntimeDisplay(config: DisplayConfig): void;
  showRuntimeStatus(state: RuntimeState): void;
  updateCommandKeys(state: RuntimeState): void;
}
```

## 7. Performance Requirements

| Operation | Target |
|-----------|--------|
| Pause/Resume latency | < 50ms |
| Manual refresh completion | < 500ms |
| Memory during pause | minimal (drawing stopped) |

## 8. Error Handling

### Pause/Resume

```javascript
function safePauseResume() {
  try {
    this.togglePauseResume();
  } catch (error) {
    console.error('Pause/Resume failed:', error);
    this.state = RuntimeState.RUNNING;
    this.restoreDisplayUpdate();
    FUNC202.showErrorMessage('Runtime control temporarily unavailable');
  }
}
```

### Refresh Failure

```javascript
async function safeManualRefresh() {
  try {
    await this.executeRefresh();
  } catch (error) {
    console.error('Manual refresh failed:', error);
    switch (error.type) {
      case 'network':
        this.useCachedData();
        break;
      case 'database':
        this.useFallbackDummyData();
        break;
      default:
        FUNC202.showErrorMessage('Refresh failed, keeping current data');
    }
  }
}
```

## 9. Test Requirements

- State transition accuracy: RUNNING ↔ PAUSED
- Pause state persistence
- Resume accuracy
- Display update stops on pause, resumes on resume
- Data refresh and display reflection on manual refresh
- FUNC-300 key processing and state notification
- FUNC-202 display update and Command Keys dynamic change
- Performance: response time and memory usage within targets
- Exception safety: safe state recovery on error
- Fallback behavior on failure
- Appropriate error message display
