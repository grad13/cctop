# Builder依頼: Critical Test Failures修正

**依頼ID**: HO-20250626-008  
**作成日**: 2025-06-26  
**依頼元**: Validator Agent  
**優先度**: Critical  
**種別**: Bugfix  

## 概要

包括的テスト実行により、統合テストで**重大な実装不備**を発見しました。
- **統合テスト**: 多数失敗（scanForLostFiles未実装）
- **ユニットテスト**: 106/106成功（Vitest非推奨警告あり）

## 🚨 Critical Issues（必須修正）

### 1. EventProcessor.scanForLostFiles未実装
**症状**: `TypeError: eventProcessor.scanForLostFiles is not a function`
**影響範囲**: file-lifecycle.test.js全失敗
**根本原因**: EventProcessorクラスに`scanForLostFiles`メソッドが存在しない

**テスト呼び出し箇所**:
```javascript
// test/integration/chokidar-db/file-lifecycle.test.js:90
fileMonitor.on('ready', async () => {
  await eventProcessor.scanForLostFiles(); // ❌ このメソッドが存在しない
});
```

**必要な実装**:
```javascript
/**
 * Scan for lost files (files in DB but no longer exist on disk)
 * FUNC-001 compliant: lost event detection on startup
 */
async scanForLostFiles() {
  // 実装内容:
  // 1. DBから全ファイル取得（is_deleted=0）
  // 2. ファイルシステムで存在確認
  // 3. 存在しないファイルをlostイベントとして記録
  // 4. 'eventProcessed'イベント発火
}
```

### 2. Vitest非推奨done()コールバック警告
**症状**: `Error: done() callback is deprecated, use promise instead`
**影響範囲**: buffered-renderer.test.js
**場所**: test/unit/buffered-renderer.test.js:181

**現在のコード**:
```javascript
setTimeout(() => {
  expect(mockConsole).toHaveBeenCalled();
  mockConsole.mockRestore();
  debouncedRenderer.destroy();
  done(); // ❌ 非推奨
}, 15);
```

**修正後**:
```javascript
// done()引数除去 + Promise返却
test('デバウンス機能', async () => {
  // ...setup...
  debouncedRenderer.renderDebounced();
  expect(mockConsole).not.toHaveBeenCalled();
  
  await new Promise(resolve => setTimeout(resolve, 15));
  expect(mockConsole).toHaveBeenCalled();
  mockConsole.mockRestore();
  debouncedRenderer.destroy();
});
```

## 📋 実装要件

### scanForLostFiles実装仕様
1. **データベースクエリ**: `SELECT * FROM files WHERE is_deleted = 0`
2. **ファイル存在確認**: `fs.existsSync(file_path)`で各ファイルチェック
3. **lostイベント記録**: 存在しないファイルは`event_type='lost'`で記録
4. **非同期処理**: `await this.db.recordEvent({...metadata, event_type: 'lost'})`
5. **イベント発火**: `this.emit('eventProcessed', result)`で通知

### テスト要求
1. **scanForLostFiles単体テスト**: 正常系・異常系カバー
2. **統合テスト修正**: file-lifecycle.test.js完全動作
3. **done()警告解消**: buffered-renderer.test.js修正

## 🎯 期待する成果

### テスト成功基準
- **統合テスト**: 100%成功（現在は多数失敗）
- **ユニットテスト**: 106/106成功維持 + 警告解消
- **file-lifecycle**: 5/5テスト全成功

### 実装品質基準
- **FUNC-001準拠**: lost/refindイベント仕様完全対応
- **コード品質**: EventProcessor既存コードと一貫性保持
- **エラーハンドリング**: 適切な例外処理とログ出力

## ⚠️ 注意事項

1. **Git作業範囲**: 子git（cctop/）での作業
2. **既存テスト**: 全106ユニットテスト成功を維持
3. **チェックリスト**: CHK006（Git操作前確認）必須実行
4. **コード一貫性**: EventProcessorの既存パターンに従う

## 🔄 作業完了条件

- [ ] `scanForLostFiles`メソッド実装完了
- [ ] file-lifecycle.test.js全テスト成功
- [ ] buffered-renderer.test.js警告解消
- [ ] 全テストスイート100%成功
- [ ] コミット＆プッシュ完了

**修正完了後**: passage/handoffs/completed/へ移動 + Validator再検証依頼

---
**Created by**: Validator Agent  
**Validation Status**: Pending Builder Implementation