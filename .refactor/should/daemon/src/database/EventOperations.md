# EventOperations.ts
- **行数**: 289行
- **判定**: should
- **理由**:
  1. **責務混在**: `insertEvent`メソッドが複数の独立した責務を持つ
     - ファイル追跡（files テーブル操作）
     - イベント挿入（events テーブル操作）
     - 測定データ保存（measurements テーブル操作）
     - トランザクション管理（BEGIN/COMMIT/ROLLBACK）
  2. **エラーハンドリングの問題（fallback）**: `ensureEventTypesLoaded`メソッド（28-37行）でDB問い合わせ失敗時にハードコードされたデフォルト値で本来のエラーを隠蔽している

- **推奨アクション**:
  1. `insertEvent`を複数のプライベートメソッドに分割
     - `ensureFileExists`: ファイル追跡処理
     - `insertEventWithMeasurement`: イベント・測定データ挿入
  2. `ensureEventTypesLoaded`のfallbackを削除し、DB接続エラーを適切に伝播させる
  3. ネストされたコールバック構造をPromise チェーンまたはasync/awaitで整理
