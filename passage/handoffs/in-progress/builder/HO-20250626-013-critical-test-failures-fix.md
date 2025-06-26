# HO-20250626-013: Critical Test Failures修正要求

**作成日**: 2025-06-26 21:25  
**作成者**: Validator Agent  
**優先度**: 🚨 CRITICAL  
**対象**: Builder Agent  
**カテゴリ**: Test Failures / Schema Migration / API Compatibility  

## 📋 要求サマリー

トータルテスト実行で**3つのCritical Issues**を検出。即座な修正が必要。

### 🚨 Critical Issues
1. **SQLスキーマ不整合**: database-manager.js:544でis_directoryカラム参照エラー
2. **API非互換**: file-lifecycle.test.js:90でscanForDeletedFiles関数不存在エラー  
3. **非推奨API使用**: 複数箇所でinsertEvent継続使用（v0.2.0で非推奨）

## 🔍 詳細問題分析

### Issue 1: SQLスキーマ不整合 (FUNC-000違反)

**エラー**:
```
Error: SQLITE_ERROR: no such column: e.is_directory
--> in Database#all('SELECT e.is_directory ...')
    at DatabaseManager.getRecentEvents (/src/database/database-manager.js:535:23)
```

**発生場所**: `src/database/database-manager.js:544`  
**問題**: schema.js (FUNC-000)でeventsテーブルからis_directoryカラム削除済みだが、getRecentEventsクエリで参照継続

**修正要求**:
```sql
-- 修正前 (Line 544)
e.is_directory,

-- 修正後 (削除)
-- e.is_directory,  -- FUNC-000: v0.2.0でカラム削除済み
```

### Issue 2: API非互換 (FUNC-001違反)

**エラー**:
```
TypeError: eventProcessor.scanForDeletedFiles is not a function
    at FileMonitor.<anonymous> (/test/integration/chokidar-db/file-lifecycle.test.js:90:28)
```

**発生場所**: `test/integration/chokidar-db/file-lifecycle.test.js:90`  
**問題**: event-processor.jsでAPI名変更済み（scanForDeletedFiles → scanForMissingFiles）だが、テストで旧API使用継続

**修正要求**:
```javascript
// 修正前 (Line 90)
await eventProcessor.scanForDeletedFiles();

// 修正後  
await eventProcessor.scanForMissingFiles();
```

### Issue 3: 非推奨API使用

**警告**:
```
insertEvent is deprecated in v0.2.0, use recordEvent instead
```

**発生場所**: 複数テストファイル  
**問題**: v0.2.0でinsertEvent非推奨だが、複数箇所で継続使用

**修正要求**: 全箇所でinsertEvent → recordEventに置換

## 🎯 必須修正項目

### 高優先度 (CRITICAL - 即座修正)
1. **database-manager.js:544**: getRecentEventsからis_directory削除
2. **file-lifecycle.test.js:90**: scanForDeletedFiles → scanForMissingFiles
3. **全テストファイル**: insertEvent → recordEvent全置換

### 中優先度 (修正後確認)
4. **他SQLクエリ確認**: is_directoryカラム参照の残存チェック
5. **他API変更確認**: scanForDeletedFiles使用箇所の残存チェック

## 📊 影響範囲

### 現在停止中の機能
- **CLI表示機能**: feature-6-cli-display.test.js全失敗
- **ファイルライフサイクル検証**: 削除ファイル検出テスト失敗
- **全体テストスイート**: Critical Errorにより中断

### 正常動作中の機能  
- **イベントフィルタリング**: BP-001完全動作
- **inotify統合**: 設定管理正常
- **基盤機能**: EventProcessor、ConfigManager安定

## 📈 検証要求

修正完了後、以下の検証を実施:

1. **npm test完全成功**: 全テストスイート通過確認
2. **CLI表示機能**: feature-6テスト成功確認  
3. **ファイルライフサイクル**: file-lifecycle.test.js成功確認
4. **非推奨API撲滅**: insertEvent警告完全消去確認

## 📄 参考資料

- **詳細レポート**: `documents/records/reports/total-test-execution-report.md`
- **FUNC-000仕様**: `documents/visions/functions/FUNC-000-sqlite-database-foundation.md`
- **FUNC-001仕様**: `documents/visions/functions/FUNC-001-file-lifecycle-tracking.md`

---

**Validator評価**: Core機能は安定だが、v0.2.0移行の完了により全機能の安定性確保が急務。修正により高品質なテストスイートの実現が期待される。