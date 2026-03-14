# UIDataManager.ts

- **行数**: 292行
- **判定**: should
- **理由**: 複数の独立した責務が混在し、エラーハンドリングでfallback（エラー握りつぶし）を使用している

### 責務の混在

1. **データロード戦略管理**: `loadMore()`, `doLoadMore()`で同時実行制御を実装
2. **ユニークモード専用キャッシュ**: `refreshUniqueMode()`でUniqueFileCacheManagerの直接操作
3. **全イベントモード管理**: `refreshAllMode()`で独立した通常モード処理
4. **データベース検索機能**: `performDatabaseSearch()`で検索専用ロジック
5. **状態管理委譲**: UIStateへの複数の状態遷移呼び出し

### fallback（エラー握りつぶし）の問題

- **127-132行**: `catch (error)`で例外を捕捉後、空配列をセットして例外を無視
  ```typescript
  } catch (error) {
    // Fallback to empty array to prevent UI crash
    this.uiState.setEvents([]);
  }
  ```
  - エラーの根本原因が不明となる
  - デバッグが困難化
  - ユーザーへの適切なエラー通知ができない

- **109-112行**: 検索結果の`catch`でも同様にエラーを隠蔽

### 推奨アクション

1. **責務分離**:
   - UniqueDataManager（ユニークモード専用）
   - AllModeDataManager（全イベントモード専用）
   - SearchManager（検索操作専用）
   - LoadMoreStrategy（ロード戦略パターン）

2. **エラーハンドリング改善**:
   - ロギングミドルウェアの導入
   - エラー情報をUIStateのerrorStateに保存
   - 呼び出し元への例外正しく伝播

3. **テストカバレッジ**:
   - エラー分岐のテストケース追加
   - 各責務のユニットテスト強化
