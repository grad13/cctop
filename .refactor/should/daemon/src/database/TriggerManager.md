# TriggerManager.ts

- **行数**: 209行
- **判定**: should
- **理由**:
  1. **Fallback問題**: 21-23行目でDROP TRIGGER実行時のエラーを握りつぶしており、エラー情報が失われている
  2. **責務混在**: TriggerManagerが複数の独立した責務を持っている
     - DROP TRIGGERSの実行（データクリーンアップ）
     - CREATE TRIGGERSの実行（メイン責務）
     - SQLクエリの構築（SQL管理）
     - Promise/コールバック変換（非同期処理）
  3. **SQL文の重複**: trigger_maintain_aggregates_on_measurement（26-110行）とtrigger_maintain_aggregates_on_event（113-192行）が90%同じロジックを持っており、DRY原則に違反
  4. **エラーハンドリング不一致**: 195-201行目では適切にエラー処理するが、21-23行目では握りつぶしている

- **推奨アクション**:
  1. SQL構築ロジックを専用の`TriggerSQLBuilder`クラスに抽出
  2. DROP TRIGGER実行を独立した`dropExistingTriggers()`メソッドに分離し、エラーハンドリングを統一
  3. 重複するSELECT文をヘルパーメソッドで共通化（`buildAggregateInsertSelect()`など）
  4. Promise ラッパー処理をユーティリティ関数（`promisify`）に抽出
  5. エラーハンドリング戦略の統一実装
