# FUNC-300: Key Input Manager

**作成日**: 2025年6月27日 23:00  
**更新日**: 2025年6月27日 23:00  
**作成者**: Architect Agent  
**対象バージョン**: v0.2.3.0  
**関連仕様**: FUNC-202, FUNC-203, FUNC-400, FUNC-401  

## 📊 機能概要

システム全体のキーボード入力を統一管理し、状態に応じた適切なキー処理の分散を実現するキー入力管理機能。複数のインタラクティブ機能間でのキー競合を解決し、状態遷移に応じた入力処理を提供する。

## 🎯 機能境界

### FUNC-300の責務
- **キー入力の一元受信**: 全てのキーボード入力を最初に受信・処理
- **状態依存分散**: システム状態に応じて適切な機能にキー処理を委譲
- **競合解決**: 複数機能が同一キーを要求する場合の優先順位制御
- **状態管理**: システム全体の入力モード状態の追跡・管理

### 他機能との境界
- **FUNC-202**: 基本表示キー (a,u,q) をFUNC-300経由で委譲、待機状態での処理実行
- **FUNC-203**: イベントフィルタキー (f,c,m,d,v,r) をFUNC-300経由で委譲、待機状態での処理実行
- **FUNC-400**: 選択操作キー (↑↓Enter Esc) をFUNC-300経由で委譲、選択状態での処理実行
- **FUNC-401**: 詳細画面操作キーをFUNC-300経由で委譲、詳細状態での処理実行

### 責務外の除外事項
- **キー処理の具体的実装**: 各機能の実際のキー処理ロジックは各機能が保持
- **UI表示制御**: キー入力結果の画面反映は各機能が実行
- **設定管理**: キーバインド設定はFUNC-101が管理

## 📋 技術仕様

### アーキテクチャ設計
```
┌─────────────────┐
│  Raw Keyboard   │
│     Input       │
└─────────┬───────┘
          │
          ▽
┌─────────────────┐
│   FUNC-300      │
│ Key Input Mgr   │
├─────────────────┤
│ State: waiting  │
│ State: selecting│
│ State: detail   │
└─────────┬───────┘
          │
    ┌─────┼─────┐
    ▽     ▽     ▽
┌───────┬────────┬────────┐
│FUNC-  │FUNC-400 │FUNC-401 │
│203    │        │        │
└───────┴────────┴────────┘
```

### 状態管理システム（State Machine）
```javascript
InputState {
  currentMode: 'waiting' | 'selecting' | 'detail',
  stateMaps: Map<string, Map<string, KeyHandler>>,
  modeHistory: Array<string>
}
```

### キーハンドラーマップ（Handler Map）
```javascript
// 状態別キーマップ
const stateMaps = {
  waiting: new Map([
    ['a', { id: 'display-all', callback: FUNC202.allMode }],
    ['u', { id: 'display-unique', callback: FUNC202.uniqueMode }],
    ['q', { id: 'quit', callback: FUNC202.quit }],
    ['f', { id: 'event-filter-find', callback: FUNC203.toggleFind }],
    ['c', { id: 'event-filter-create', callback: FUNC203.toggleCreate }],
    ['m', { id: 'event-filter-modify', callback: FUNC203.toggleModify }],
    ['d', { id: 'event-filter-delete', callback: FUNC203.toggleDelete }],
    ['v', { id: 'event-filter-move', callback: FUNC203.toggleMove }],
    ['r', { id: 'event-filter-restore', callback: FUNC203.toggleRestore }],
    ['ArrowUp', { id: 'start-selection', callback: PIL002.startSelection }],
    ['ArrowDown', { id: 'start-selection', callback: PIL002.startSelection }]
  ]),
  
  selecting: new Map([
    ['ArrowUp', { id: 'selection-up', callback: PIL002.moveUp }],
    ['ArrowDown', { id: 'selection-down', callback: PIL002.moveDown }],
    ['Enter', { id: 'selection-confirm', callback: PIL002.confirm }],
    ['Escape', { id: 'selection-cancel', callback: PIL002.cancel }],
    // 選択中でも基本機能は使える
    ['a', { id: 'display-all', callback: FUNC202.allMode }],
    ['u', { id: 'display-unique', callback: FUNC202.uniqueMode }],
    ['f', { id: 'event-filter-find', callback: FUNC203.toggleFind }],
    ['c', { id: 'event-filter-create', callback: FUNC203.toggleCreate }],
    ['m', { id: 'event-filter-modify', callback: FUNC203.toggleModify }],
    ['d', { id: 'event-filter-delete', callback: FUNC203.toggleDelete }],
    ['v', { id: 'event-filter-move', callback: FUNC203.toggleMove }],
    ['r', { id: 'event-filter-restore', callback: FUNC203.toggleRestore }]
  ]),
  
  detail: new Map([
    ['Escape', { id: 'detail-exit', callback: PIL003.exit }],
    // 詳細状態では他のキーは無効（集中モード）
  ])
};
```

## 🔧 機能仕様

### 基本動作

#### キー入力受信・分散（State Machine方式）
1. **Raw Input受信**: process.stdin.rawModeからキー入力を受信
2. **現在状態のマップ取得**: `stateMaps[currentMode]` から該当状態のキーマップを取得
3. **ハンドラー検索**: キーマップから該当キーのハンドラーを直接検索
4. **処理委譲**: 見つかったハンドラーのcallbackを実行
5. **状態遷移**: 必要に応じて状態を変更（waiting ↔ selecting ↔ detail）

```javascript
handleKeyInput(key) {
  const currentMap = this.stateMaps.get(this.currentMode);
  const handler = currentMap.get(key);
  
  if (handler) {
    handler.callback(key);
  }
  // キーが見つからない場合は無視（シンプル）
}
```

#### 状態遷移制御
- **waiting → selecting**: FUNC-400の上下キー入力時
- **selecting → detail**: FUNC-400のEnterキー入力時
- **detail → waiting**: FUNC-401のEscキー入力時
- **selecting → waiting**: FUNC-400のEscキー入力時

### ハンドラー登録仕様（State Machine方式）

#### 状態別キーマップ初期化
```javascript
KeyInputManager.initializeStateMaps() {
  // 各機能が自身のキーを登録
  this.registerToState('waiting', 'a', FUNC202.allMode);
  this.registerToState('waiting', 'f', FUNC203.toggleFind, 'event-filter-find');
  this.registerToState('waiting', 'ArrowUp', PIL002.startSelection);
  
  this.registerToState('selecting', 'ArrowUp', PIL002.moveUp);
  this.registerToState('selecting', 'a', FUNC202.allMode); // 選択中でも有効
  this.registerToState('selecting', 'f', FUNC203.toggleFind, 'event-filter-find'); // 選択中でも有効
}
```

#### 動的ハンドラー登録
```javascript
// 新しい機能からのキー登録
KeyInputManager.registerToState(stateName, key, callback) {
  const stateMap = this.stateMaps.get(stateName);
  stateMap.set(key, {
    id: `${stateName}-${key}`,
    callback: callback
  });
}
```

#### 状態遷移API
```javascript
// 状態変更（各機能から呼び出し）
KeyInputManager.setState(newMode) {
  this.modeHistory.push(this.currentMode);
  this.currentMode = newMode;
  // 新しい状態のキーマップが自動的にアクティブになる
}

// 前の状態に戻る
KeyInputManager.popState() {
  if (this.modeHistory.length > 0) {
    this.currentMode = this.modeHistory.pop();
  }
}
```

## 🎨 設定項目

### config.json設定（FUNC-101統合）
```json
{
  "keyManager": {
    "debug": false,
    "defaultTimeout": 100,
    "keyBindings": {
      "navigation": {
        "up": "ArrowUp",
        "down": "ArrowDown",
        "confirm": "Enter",
        "cancel": "Escape"
      }
    }
  }
}
```

### 主要設定
- **debug**: キー入力デバッグログの有効/無効
- **defaultTimeout**: キー入力処理のタイムアウト（ms）
- **keyBindings**: カスタムキーバインド設定

## 🚀 実装仕様

### 実装要件
1. **KeyInputManager クラス（State Machine）**
   - システム全体のキー入力受信・管理
   - 状態別キーマップの管理・切り替え
   - 状態遷移の制御・履歴管理

2. **StateMachine モジュール**
   - システム状態 (waiting/selecting/detail) の管理
   - 状態遷移の制御・通知
   - 状態履歴の管理（戻る機能用）

3. **KeyMapRegistry モジュール**
   - 状態別キーマップの登録・管理
   - 動的なキーハンドラー追加・削除
   - キーマップの初期化・リセット

4. **RawKeyProcessor モジュール**
   - 生キー入力の受信・正規化
   - 特殊キー（方向キー・Ctrl+x等）の適切な認識
   - 非ブロッキング入力処理

### パフォーマンス要件
- **応答性**: キー入力→処理委譲 < 5ms
- **CPU効率**: キー処理のオーバーヘッド < 1%
- **メモリ効率**: ハンドラー管理 < 100KB

## 🧪 テスト要件

### 単体テスト
1. **KeyInputManager テスト**
   - ハンドラー登録・検索の正確性
   - 優先順位システムの動作確認
   - 状態遷移時のハンドラー切り替え

2. **InputStateManager テスト**
   - 状態遷移の正確な管理
   - 状態依存ハンドラーの制御
   - 不正な状態遷移の防止

3. **RawKeyProcessor テスト**
   - 全キーパターンの正確な認識
   - 特殊キーの適切な処理
   - 無効入力の適切な無視

### 統合テスト
1. **FUNC-203連携テスト**
   - フィルタキー入力の正確な委譲
   - 選択状態時のフィルタ無効化
   - 状態復帰時のフィルタ機能復活

2. **FUNC-400連携テスト**
   - 選択キー入力の正確な委譲
   - 状態遷移の適切な制御
   - 他機能との競合回避

### システムテスト
1. **複数機能同時動作テスト**
   - 全機能が同時に動作する環境での競合回避
   - 状態遷移時の一貫性確保
   - パフォーマンス影響の確認

## 🔗 関連機能との連携

### 必須連携機能
- **FUNC-202**: CLI表示統合 - 基本表示キー (a,u,q) の委譲先、待機状態制御
- **FUNC-203**: イベントタイプフィルタリング - フィルタキー (f,c,m,d,v,r) の委譲先
- **FUNC-400**: インタラクティブ選択モード - 選択キー (↑↓Enter Esc) の委譲先、選択状態制御

### 任意連携機能
- **FUNC-401**: 詳細検査モード - 詳細キー処理の委譲先、詳細状態制御
- **FUNC-101**: 階層設定管理 - キーバインド設定の管理
- **PIL-001**: プラグインアーキテクチャ - プラグインキー処理の拡張

### 連携詳細（State Machine方式）
#### FUNC-202連携
```javascript
// 待機状態と選択状態の両方で有効
stateMaps.waiting.set('a', FUNC202.allMode);
stateMaps.waiting.set('u', FUNC202.uniqueMode);
stateMaps.waiting.set('q', FUNC202.quit);

stateMaps.selecting.set('a', FUNC202.allMode);  // 選択中でも使える
stateMaps.selecting.set('u', FUNC202.uniqueMode);  // 選択中でも使える
```

#### FUNC-203連携
```javascript
// 待機状態と選択状態の両方で有効（イベントタイプフィルタ）
stateMaps.waiting.set('f', { id: 'event-filter-find', callback: FUNC203.toggleFind });
stateMaps.waiting.set('c', { id: 'event-filter-create', callback: FUNC203.toggleCreate });
stateMaps.waiting.set('m', { id: 'event-filter-modify', callback: FUNC203.toggleModify });
stateMaps.waiting.set('d', { id: 'event-filter-delete', callback: FUNC203.toggleDelete });
stateMaps.waiting.set('v', { id: 'event-filter-move', callback: FUNC203.toggleMove });
stateMaps.waiting.set('r', { id: 'event-filter-restore', callback: FUNC203.toggleRestore });

// 選択中でも使える
stateMaps.selecting.set('f', { id: 'event-filter-find', callback: FUNC203.toggleFind });
stateMaps.selecting.set('c', { id: 'event-filter-create', callback: FUNC203.toggleCreate });
// ... 他のイベントフィルタキー

// 将来追加予定: 文字列フィルタ
// stateMaps.waiting.set('/', { id: 'string-filter-search', callback: FUNC2XX.startStringFilter });
```

#### FUNC-400連携
```javascript
// 状態遷移トリガー（待機→選択）
stateMaps.waiting.set('ArrowUp', PIL002.startSelection);
stateMaps.waiting.set('ArrowDown', PIL002.startSelection);

// 選択状態での操作
stateMaps.selecting.set('ArrowUp', PIL002.moveUp);
stateMaps.selecting.set('ArrowDown', PIL002.moveDown);
stateMaps.selecting.set('Enter', PIL002.confirm);
stateMaps.selecting.set('Escape', PIL002.cancel);
```

## 📊 期待効果

### システム改善
- **シンプル設計**: State Machine + Handler Mapによる直感的な構造
- **効率的処理**: 現在状態のキーマップのみ参照、O(1)でのキー検索
- **拡張性**: 新しい状態・キーの追加が容易
- **保守性**: 状態別に分離されたキーマップで保守が簡単
- **一貫性**: CLIツールの標準的パターンによる自然な操作感

### 開発効率
- **分離設計**: 各機能が独立してキーを登録
- **状態明確**: 現在どの状態でどのキーが有効かが一目瞭然
- **テスト容易**: 状態別にキー処理をテスト可能
- **機能協調**: 選択中でもフィルタ・表示切替が自然に動作

## 制限事項

### 技術的制限
- **ターミナル依存**: ターミナルの生キー処理能力に依存
- **プラットフォーム差異**: OS固有のキー処理差異の吸収が必要
- **パフォーマンス**: 高頻度キー入力時のオーバーヘッド

### 動作制限
- **最大ハンドラー数**: 登録可能なキーハンドラーの上限（1000個）
- **状態数制限**: システム状態の種類上限（現在3状態）
- **同時処理**: 同一キーの同時処理は不可

## 参考資料

#### 類似システムの参考
- **readline**: Node.jsの標準キー入力処理
- **inquirer.js**: インタラクティブCLIのキー処理パターン
- **blessed**: ターミナルUIのキー管理システム