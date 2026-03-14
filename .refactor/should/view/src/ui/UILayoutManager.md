# UILayoutManager.ts

- **行数**: 339行
- **判定**: should
- **理由**:
  1. **責務混在**: 複数の独立した責務を持っている
     - UIレイアウト管理（`setupFramelessLayout()`）
     - コンテンツ生成（`buildHeaderContent()`, `buildCommandLine1()`, `buildDynamicControlContent()`, `buildFilterModeDisplay()`）
     - 状態同期・表示更新（`updateDisplay()`, `updateStatusBar()`, `updateDynamicControl()`）
  2. **マジックナンバーの散在**:
     - `3`, `7`, `2`, `1` などのポジショニング値
     - `180` というデフォルト幅値
     - `40` という検索テキスト最大長
  3. **複雑な条件分岐**: 状態に基づいた複数の表示バリエーション生成ロジック

- **推奨アクション**:
  1. **UIContentBuilder クラスの抽出**: `buildHeaderContent()`, `buildCommandLine1()`, `buildDynamicControlContent()`, `buildFilterModeDisplay()` を独立したクラスに移動して、コンテンツ生成責務を分離
  2. **UIConstants の作成**: マジックナンバー（`3`, `7`, `2`, `180`, `40`）を定数として定義
  3. **UIUpdateManager の抽出**: `updateDisplay()`, `updateStatusBar()`, `updateDynamicControl()` の状態同期ロジックを独立したクラスに分離
  4. **状態判定ロジックの抽出**: displayState に基づいた複雑な分岐をヘルパー関数や戦略パターンで整理
