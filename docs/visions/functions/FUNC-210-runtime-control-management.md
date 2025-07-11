# FUNC-210: Runtime Control Management

**作成日**: 2025年7月9日 10:10  
**更新日**: 2025年7月9日  
**作成者**: Architect Agent  
**Version**: 1.0.0  
**関連仕様**: FUNC-202, FUNC-300, FUNC-301, FUNC-000  

## 📊 機能概要

cctop CLIアプリケーションにおけるRuntime Control機能を提供する。Pause/Resume（一時停止/再開）制御とManual Refresh（手動更新）機能により、開発・デバッグ・プレゼンテーション時の効率的な制御を実現する。

**ユーザー価値**:
- 高頻度更新時の詳細確認制御
- デバッグ・テスト時の状態固定
- プレゼンテーション・デモでのタイミング制御
- 状態リセット・データ更新の即座実行

## 🎯 機能境界

### ✅ **実行する**
- Pause/Resume状態の管理・制御
- Manual Refresh処理の実行
- Runtime状態の視覚的表示
- FUNC-300/202との制御連携
- パフォーマンス最適化制御

### ❌ **実行しない**
- 表示・描画処理（FUNC-202の責務）
- キーボード入力処理（FUNC-300の責務）
- データベース直接操作（FUNC-000の責務）
- 設定管理（FUNC-101/105の責務）

## 📋 詳細仕様

### **Pause/Resume制御**

#### **状態管理**
```javascript
// Runtime状態定義
const RuntimeState = {
  RUNNING: 'running',   // 通常動作中
  PAUSED: 'paused'      // 一時停止中
};

// 状態管理クラス
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

#### **制御レベル定義**
| 制御レベル | RUNNING状態 | PAUSED状態 | 説明 |
|-----------|-------------|------------|------|
| **表示更新** | 有効 | 停止 | 画面描画の更新制御 |
| **データ収集** | 継続 | 継続 | バックグラウンドでのデータ収集 |
| **ユーザー操作** | 有効 | 有効 | フィルタ・検索・選択操作 |
| **手動更新** | 有効 | 有効 | Manual Refresh機能 |

#### **状態遷移フロー**
```
RUNNING ──[space]──> PAUSED
   ↑                   │
   └────────[space]────┘
```

### **Manual Refresh制御**

#### **基本機能**
```javascript
class ManualRefreshManager {
  async executeRefresh() {
    // 現在設定保持
    const context = this.getCurrentContext();
    
    // 環境別データ取得
    const freshData = await this.fetchDataByEnvironment(context);
    
    // 表示更新通知
    this.notifyDataRefresh(freshData);
    
    // ログ記録
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

#### **環境別データ取得戦略**
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

#### **実行保証**
- **原子性**: Refresh処理は完全実行または完全rollback
- **一貫性**: 表示データとフィルタ状態の整合性保証
- **応答性**: 500ms以内での処理完了
- **エラー処理**: 失敗時の適切なフォールバック

### **FUNC-300連携（キー処理統合）**

#### **キーバインド登録**
```javascript
// Runtime Control専用キー登録
function registerRuntimeControlKeys() {
  KeyInputManager.registerToState('waiting', 'space', () => {
    RuntimeControlManager.togglePauseResume();
  });
  
  KeyInputManager.registerToState('waiting', 'x', () => {
    RuntimeControlManager.executeManualRefresh();
  });
  
  // Paused状態での継続操作保証
  KeyInputManager.registerToState('paused', ['f', '/', '↑', '↓', 'ESC'], (key) => {
    // Pause中もフィルタ・検索・選択操作は継続
    KeyInputManager.handlePausedModeKey(key);
  });
}
```

#### **状態連携管理**
```javascript
// FUNC-300への状態通知
function notifyStateChange(newState) {
  KeyInputManager.setRuntimeState(newState);
  FUNC202.updateRuntimeDisplay(newState);
  
  // 状態変更ログ
  console.log(`Runtime state changed: ${this.previousState} → ${newState}`);
}
```

### **FUNC-202連携（表示統合）**

#### **表示状態通知**
```javascript
// FUNC-202への表示更新通知
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

#### **Command Keys Area動的更新**
```javascript
// 状態に応じたコマンド表示切り替え
function getCommandKeysText(state) {
  const pauseResumeText = state === RuntimeState.RUNNING ? 'Pause' : 'Resume';
  
  return [
    `[q] Exit [space] ${pauseResumeText} [x] Refresh [a] All [u] Unique`,
    `[ESC] Reset All Filters [↑↓] Select an Event`,
    `[f] Filter Events　[/] Quick Search`
  ];
}
```

### **パフォーマンス管理**

#### **応答性保証**
```javascript
// パフォーマンス監視
class PerformanceMonitor {
  measurePauseResumeLatency() {
    const start = performance.now();
    
    RuntimeControlManager.togglePauseResume();
    
    const latency = performance.now() - start;
    if (latency > 50) {
      console.warn(`Pause/Resume latency exceeded: ${latency}ms`);
    }
    
    return latency;
  }
  
  measureRefreshDuration() {
    const start = performance.now();
    
    return RuntimeControlManager.executeManualRefresh()
      .then(() => {
        const duration = performance.now() - start;
        if (duration > 500) {
          console.warn(`Manual refresh duration exceeded: ${duration}ms`);
        }
        return duration;
      });
  }
}
```

#### **メモリ最適化**
- **Pause中**: 不要な描画処理停止によるCPU/メモリ削減
- **Refresh時**: 古いデータの即座解放とGC促進
- **状態管理**: 最小限の状態情報のみメモリ保持

### **エラーハンドリング**

#### **Pause/Resume例外処理**
```javascript
function safePauseResume() {
  try {
    this.togglePauseResume();
  } catch (error) {
    console.error('Pause/Resume failed:', error);
    
    // 安全な状態に復帰
    this.state = RuntimeState.RUNNING;
    this.restoreDisplayUpdate();
    
    // ユーザー通知
    FUNC202.showErrorMessage('Runtime control temporarily unavailable');
  }
}
```

#### **Refresh失敗時の処理**
```javascript
async function safeManualRefresh() {
  try {
    await this.executeRefresh();
  } catch (error) {
    console.error('Manual refresh failed:', error);
    
    // フォールバック処理
    switch (error.type) {
      case 'network':
        // キャッシュデータで継続
        this.useCachedData();
        break;
      case 'database':
        // ダミーデータで継続
        this.useFallbackDummyData();
        break;
      default:
        // 現在表示維持
        FUNC202.showErrorMessage('Refresh failed, keeping current data');
    }
  }
}
```

## 🔧 実装ガイドライン

### **RuntimeControlManager設計**

1. **StateManager クラス**
   - RUNNING/PAUSED状態管理
   - 状態遷移制御
   - 状態変更通知

2. **RefreshManager クラス**
   - 環境別データ取得
   - 原子性・一貫性保証
   - エラーハンドリング

3. **PerformanceMonitor クラス**
   - 応答性監視
   - パフォーマンス最適化
   - 異常検出・警告

### **連携インターフェース**

#### **FUNC-300連携**
```typescript
interface RuntimeControlKeyInterface {
  registerPauseResumeKey(): void;
  registerManualRefreshKey(): void;
  notifyRuntimeStateChange(state: RuntimeState): void;
}
```

#### **FUNC-202連携**
```typescript
interface RuntimeDisplayInterface {
  updateRuntimeDisplay(config: DisplayConfig): void;
  showRuntimeStatus(state: RuntimeState): void;
  updateCommandKeys(state: RuntimeState): void;
}
```

## 🧪 テスト要件

### **状態管理テスト**
- [ ] **状態遷移**: RUNNING ↔ PAUSED 切り替えの正確性
- [ ] **状態持続**: Pause状態の適切な保持
- [ ] **状態復帰**: Resume時の正確な復帰

### **制御機能テスト**
- [ ] **Pause機能**: 表示更新停止・操作継続の確認
- [ ] **Resume機能**: 表示更新再開・状態復帰の確認
- [ ] **Manual Refresh**: データ更新・表示反映の確認

### **連携テスト**
- [ ] **FUNC-300連携**: キー処理・状態通知の動作
- [ ] **FUNC-202連携**: 表示更新・Command Keys動的変更
- [ ] **パフォーマンス**: 応答性・メモリ使用量基準

### **エラー処理テスト**
- [ ] **例外安全性**: 異常時の安全な状態復帰
- [ ] **フォールバック**: 失敗時の代替処理動作
- [ ] **ユーザー通知**: 適切なエラーメッセージ表示

## 🔗 他機能との連携

### **必須連携機能**

#### FUNC-202: CLI Display Integration
- **表示制御**: Runtime状態の視覚的表示
- **Command Keys**: 動的なキー表示切り替え
- **状態表示**: RUNNING/PAUSED状態のHeader表示

#### FUNC-300: Key Input Manager
- **キー処理**: Pause/Resume・Manual Refreshキー
- **状態管理**: Runtime状態の統合管理
- **動的登録**: 状態に応じたキーハンドラー切り替え

### **データ連携機能**

#### FUNC-000: SQLite Database Foundation
- **データ取得**: Manual Refresh時の最新データ取得
- **クエリ実行**: 現在のフィルタ・モード設定での検索
- **トランザクション**: 一貫性のあるデータ更新

#### FUNC-301: Filter State Management
- **状態保持**: Refresh時のフィルタ設定維持
- **状態復帰**: Pause/Resume時のフィルタ状態継続
- **設定同期**: Runtime制御とフィルタ設定の同期

## 🎯 成功指標

### **使いやすさ**
- **直感的操作**: 説明なしでPause/Resume操作可能
- **即座フィードバック**: 状態変更の即座視覚反映
- **操作継続性**: Pause中も必要な操作は継続可能

### **パフォーマンス**
- **Pause/Resume**: 50ms以内の状態切り替え
- **Manual Refresh**: 500ms以内のデータ更新完了
- **メモリ効率**: Pause中のメモリ使用量削減

### **信頼性**
- **状態一貫性**: Runtime状態とUI表示の完全同期
- **エラー回復**: 異常時の安全な状態復帰
- **操作保証**: 重要操作の確実な実行

## 📝 変更履歴

### v1.0.0 (2025-07-09)
- **初版リリース**: FUNC-202から Runtime Control 機能を分離独立
- **Pause/Resume制御**: `[space]`キーでの一時停止/再開機能
- **Manual Refresh**: `[x]`キーでの手動データ更新機能
- **FUNC-300/202連携**: キー処理・表示統合の詳細仕様
- **パフォーマンス最適化**: 応答性・メモリ効率の基準策定
- **エラーハンドリング**: 例外安全性・フォールバック処理の実装