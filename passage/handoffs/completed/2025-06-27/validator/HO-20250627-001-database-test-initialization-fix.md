# HO-20250627-001: Database Test Initialization Fix

**作成日**: 2025年6月27日 01:00  
**依頼者**: Builder Agent  
**対象者**: Validator Agent  
**優先度**: High  
**種別**: Test Fix  
**関連**: HO-20250626-018（Critical Database Connection Fix）

## 🎯 修正完了内容（Builder側）

### EventProcessor修正済み
- **processEventInternal()**: データベース未初期化チェック追加（96-103行）
- **scanForMissingFiles()**: データベース未初期化チェック追加（408-412行）
- **対策**: `this.db.isInitialized`がfalseの場合、イベントを再キューして後で処理

```javascript
// Check database connection before processing
if (!this.db || !this.db.isInitialized) {
  console.warn('[EventProcessor] Database not initialized, queueing event:', event.path);
  // Re-queue the event to process later
  this.eventQueue.push(event);
  return null;
}
```

## 🚨 テスト環境の問題

### 問題の原因
1. **非同期初期化タイミング**: DatabaseManager.initialize()完了前にFileMonitorがイベント発火
2. **テストセットアップ順序**: EventProcessorとFileMonitorの連携が早すぎる
3. **WALモード影響**: データベース初期化に時間がかかる可能性

### 影響を受けるテストファイル
```bash
test/integration/chokidar-db/basic-operations.test.js
test/integration/chokidar-db/data-integrity.test.js
test/integration/chokidar-db/file-lifecycle.test.js
test/integration/chokidar-db/metadata-integrity.test.js
```

## 🔧 必要な修正（Validator責務）

### 1. テストセットアップの改善
```javascript
// beforeEach内での推奨修正
beforeEach(async () => {
  // ... existing setup ...
  
  // データベース初期化完了を確実に待つ
  await dbManager.initialize();
  
  // EventProcessor初期化
  eventProcessor = new EventProcessor(dbManager);
  
  // データベース初期化完了を待機
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // その後FileMonitorセットアップ
  fileMonitor = new FileMonitor(config);
  
  // イベント連携
  fileMonitor.on('fileEvent', (event) => {
    eventProcessor.processFileEvent(event);
  });
});
```

### 2. ignored パターンの改善
```javascript
// SQLite WALファイルも除外
ignored: ['**/test-*.db', '**/test-*.db-*', '**/*.db-wal', '**/*.db-shm']
```

### 3. データベース初期化確認の追加
```javascript
// 初期化完了を明示的に確認
expect(dbManager.isInitialized).toBe(true);
```

## 🧪 検証要求

### 修正後の確認項目
1. **Database not connected**エラーが発生しないこと
2. **テストタイムアウト**が発生しないこと
3. **全統合テスト**が2分以内に完了すること

### テスト実行手順
```bash
# 1. 単体でのテスト実行
npm test test/integration/chokidar-db/basic-operations.test.js

# 2. 統合テスト全体
npm test test/integration/chokidar-db/

# 3. 全テストスイート
npm test
```

## 📊 期待される結果

### Before（現状）
- Database not connected エラー多発
- 5分タイムアウト
- テスト失敗率高

### After（修正後）
- エラーゼロ
- 2分以内完了
- 全テスト成功

## 💡 技術的詳細

### Builder側の対策
- EventProcessorに防御的プログラミング実装済み
- データベース未初期化時のグレースフルな処理
- イベント再キューによる遅延処理対応

### Validator側で必要な対策
- テスト環境での初期化順序制御
- 非同期処理の適切な待機
- リソースクリーンアップの改善

## 📝 備考

**Builder完了事項**:
- src/monitors/event-processor.js の修正完了
- 防御的プログラミングによるエラー回避実装
- Database not connected エラーの根本原因対策

**Validator要対応事項**:
- テスト環境のセットアップ順序修正
- 4つの統合テストファイルの更新
- 全テストスイートでの動作確認

---
**Status**: Validator対応待ち  
**Next Step**: テスト環境修正と全体検証  
**Dependency**: HO-20250626-018の完了に依存