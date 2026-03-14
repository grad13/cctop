# UIKeyHandler.ts

- **行数**: 330行
- **判定**: should
- **理由**: 複数の独立した責務が混在しており、エラー処理の握りつぶしも存在します
  - 責務1: グローバルキーハンドリング（終了、エスケープ、リフレッシュ、ポーズ）- `setupGlobalKeys()`
  - 責務2: モード遷移キー管理（フィルタモード、検索モード、表示モード切り替え）- `setupModeKeys()`
  - 責務3: フィルタキーの動的管理（イベント型フィルタ）- `setupFilterKeys()`
  - 責務4: ナビゲーションキー管理（矢印キー、ページングなど）- `setupNavigationKeys()`
  - 責務5: 検索デバウンスロジック - `debouncedSearch()`
  - エラー握りつぶし: 213-215行で`loadMoreCallback()`のエラーが握りつぶされている

- **推奨アクション**:
  1. キーハンドリング責務を分割：
     - `GlobalKeyHandler` - グローバルキーのみ
     - `ModeKeyHandler` - モード遷移キー
     - `FilterKeyHandler` - フィルタキー
     - `NavigationKeyHandler` - ナビゲーションキー
  2. `SearchDebounceHandler` に検索デバウンスロジックを抽出
  3. エラーログを追加するか、適切なエラー処理に変更（213-215行）
  4. 各ハンドラを`UIKeyHandler`で組成して統一インターフェースを提供
