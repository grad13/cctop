# Request: Critical Bugfixes - BP-000テスト失敗の実装修正

**ID**: request-003-bp000-test-failures-critical-fixes  
**From**: Validator Agent  
**To**: Builder Agent  
**Priority**: Critical  
**Type**: Bugfix  
**Created**: 2025-06-25 05:45  
**Related Handoff**: BP-000準拠テスト実装（前セッション）  
**Git Repository**: 子git - P045準拠で修正対象gitを明示

## 🐛 Issue Summary

BP-000準拠テストスイート実行により、**12件の重大な実装不備**を発見。基本動作テストは全成功だが、メタデータ・設定・データ整合性テストで深刻な失敗が多発。**仕様書→srcの実装が間違っている**ことを確認。

## 🔍 Validation Results

### Original Testing
- **Test Environment**: Local（vitest）
- **Test Date**: 2025-06-25 05:30-05:44
- **Tested Features**: BP-000準拠r002 Phase 1テストスイート全40+テストケース

### Success Rate
- **成功**: 11/22テスト（50%）
- **失敗**: 12/22テスト（重大問題）
- **成功ファイル**: basic-operations.test.js（7/7）, cli-display.test.js（4/4）
- **失敗ファイル**: config-validation.test.js（3失敗）, metadata-integrity.test.js（5失敗）, data-integrity.test.js（4失敗）

### Issues Discovered

#### Issue 1: ConfigManager APIの不一致
- **Severity**: Critical
- **Type**: Bug
- **Description**: ConfigManagerクラスにgetConfig()メソッドが存在しない
- **Failed Tests**: config-004, config-005
- **Expected Behavior**: `configManager.getConfig()`でコンフィグ取得
- **Actual Behavior**: `configManager.getConfig is not a function`エラー
- **Root Cause**: 実装は`getAll()`メソッドだが、テストは`getConfig()`を期待

#### Issue 2: 必須項目検証の実装不足
- **Severity**: Critical  
- **Type**: Bug
- **Description**: 不完全設定でもConfigManagerが正常初期化される
- **Failed Tests**: config-002
- **Expected Behavior**: 必須項目不足時にエラーをthrow
- **Actual Behavior**: `promise resolved "undefined" instead of rejecting`
- **Root Cause**: バリデーション処理が寛容すぎる

#### Issue 3: DatabaseManagerクエリのフィールド欠落
- **Severity**: Critical
- **Type**: Bug  
- **Description**: getRecentEvents()クエリにobject_id, is_directoryが含まれない
- **Failed Tests**: meta-005, meta-006, meta-007, integrity-004, integrity-007
- **Expected Behavior**: 6項目メタデータすべてがクエリ結果に含まれる
- **Actual Behavior**: `object_id: undefined`, `is_directory: undefined`
- **Root Cause**: SELECT文のフィールド指定が不完全

#### Issue 4: プロパティ名の不一致
- **Severity**: High
- **Type**: Bug
- **Description**: DatabaseManagerのプロパティ名相違
- **Failed Tests**: integrity-005
- **Expected Behavior**: `dbManager.database.get()`でクエリ実行
- **Actual Behavior**: `Cannot read properties of undefined (reading 'get')`
- **Root Cause**: 実装は`dbManager.db`だが、テストは`dbManager.database`を期待

#### Issue 5: Delete操作のイベント記録欠落
- **Severity**: High
- **Type**: Bug
- **Description**: ファイル削除時のイベントがDBに記録されない
- **Failed Tests**: meta-003, integrity-002
- **Expected Behavior**: create→modify→deleteの3イベント記録
- **Actual Behavior**: create→modifyの2イベントのみ記録
- **Root Cause**: FileMonitor/EventProcessorの削除処理が不完全

#### Issue 6: 行数カウントロジックの相違
- **Severity**: Medium
- **Type**: Bug
- **Description**: line_count計算結果がテスト期待値と不一致
- **Failed Tests**: meta-002
- **Expected Behavior**: `'Line 1\nLine 2'` = 2行
- **Actual Behavior**: 3行としてカウント
- **Root Cause**: 改行処理ロジックの実装差異

## 📋 Requirements for Fix

### Must Fix (Blocking) - BP-000成功基準達成のため必須
- [ ] **ConfigManager.getConfig()メソッド追加**（getAll()のエイリアスまたは名前変更）
- [ ] **ConfigManager必須項目検証の強化**（不完全設定時のエラーthrow）
- [ ] **DatabaseManager.getRecentEvents()のSELECT文拡張**（object_id, is_directory追加）
- [ ] **DatabaseManagerプロパティ名統一**（.db → .database または逆）
- [ ] **FileMonitor/EventProcessor削除処理の修正**（deleteイベント記録保証）

### Should Fix (Important)
- [ ] **行数カウントロジックの統一**（改行処理の明確化）
- [ ] **エラーハンドリングの一貫性向上**
- [ ] **テスト実行タイムアウト対策**（長時間実行の最適化）

### Could Fix (Nice to have)
- [ ] **デバッグログの最適化**（テスト実行時のログ量調整）
- [ ] **パフォーマンス改善**（大量ファイル処理の高速化）

## 🧪 Testing Requirements

### Regression Testing
- [ ] **basic-operations.test.js 7/7成功維持**
- [ ] **cli-display.test.js 4/4成功維持**
- [ ] **既存機能の動作保証**

### New Testing
- [ ] **config-validation.test.js 10/10成功達成**
- [ ] **metadata-integrity.test.js 8/8成功達成**
- [ ] **data-integrity.test.js 9/9成功達成**
- [ ] **BP-000成功基準「r002 Phase 1のテスト全合格」完全達成**

### Performance Testing
- [ ] **大量ファイル処理でのメモリリーク確認**
- [ ] **並行処理での競合状態回避確認**

## 📁 Affected Files/Components

- `src/config/config-manager.js` - getConfig()メソッド追加・バリデーション強化 *(子git)*
- `src/database/database-manager.js` - getRecentEvents()SELECT文拡張・プロパティ名統一 *(子git)*
- `src/monitors/file-monitor.js` - delete操作処理の確認・修正 *(子git)*
- `src/monitors/event-processor.js` - deleteイベント記録処理の確認・修正 *(子git)*
- 各種utilityファイル - 行数カウント処理の統一 *(子git)*

**Git Operations**: 修正作業は子gitで実行。CHK006確認後にコミットすること。

## 💡 Suggested Solutions

### For Issue 1 (ConfigManager API)
```javascript
// src/config/config-manager.js
getConfig() {
  return this.getAll(); // エイリアス追加
}
// または getAll() → getConfig() にリネーム
```

### For Issue 2 (必須項目検証)
```javascript
// 不完全設定時の厳格なエラーハンドリング
if (missing.length > 0) {
  throw new Error(`Required fields missing: ${missing.join(', ')}`);
}
```

### For Issue 3 (DatabaseQuery拡張)
```javascript
// src/database/database-manager.js getRecentEvents()
SELECT e.*, et.code as event_type, of.inode, e.is_directory, e.object_id
FROM events e 
JOIN event_types et ON e.event_type_id = et.id
JOIN object_fingerprint of ON e.object_id = of.id
```

### For Issue 4 (プロパティ名統一)
```javascript
// DatabaseManagerクラス
get database() {
  return this.db; // getter追加またはプロパティ名統一
}
```

### For Issue 5 (Delete処理)
FileMonitor/EventProcessorでunlink/unlinkDirイベントが確実にDBに記録されることを保証

## ⚠️ Constraints & Considerations

- **BP-000成功基準**: 「r002 Phase 1のテスト全合格」が必須
- **後方互換性**: 既存の動作する機能を破壊しないこと
- **タイムライン**: v0.1.0.0リリース準備のため緊急修正が必要
- **テスト駆動**: 修正後は必ずテスト全成功を確認すること

## 📚 Reference Materials

- BP-000仕様書: `/documents/visions/blueprints/BP-000-for-version0100-confirm-foundation.md`
- テスト失敗ログ: 上記Validation Results参照
- CLAUDE.md: 各種プロトコル・チェックリスト
- エラー出力: vitest実行結果の詳細ログ

---

## 🔧 Builder Response Section (To be completed by Builder Agent)

### Work Started
**Date/Time**: 

### Investigation Results
[Builder's analysis of the issues]

### Proposed Solution
[Technical approach to fixing the issues]

### Implementation Plan
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Risk Assessment
- [Any risks associated with the fixes]
- [Impact on other features]

### Work Completed
**Date/Time**: 

### Changes Made
- [Description of changes]

### Resolution Summary
- **Issue 1**: [How it was fixed]
- **Issue 2**: [How it was fixed]
- **Issue 3**: [How it was fixed]
- **Issue 4**: [How it was fixed]
- **Issue 5**: [How it was fixed]
- **Issue 6**: [How it was fixed]

### Testing Performed
- [ ] [Self-testing performed by Builder]
- [ ] [Unit tests updated/added]

### Ready for Re-validation
**New Handoff Created**: [Link to new complete-XXX handoff for re-testing]

---

## 📊 Metrics & Tracking

- **Issues Reported**: 6 (Critical: 5, High: 1, Medium: 1)
- **Resolution Time**: [Time taken to fix]
- **Re-validation Required**: Yes
- **Customer Impact**: BP-000成功基準未達成のためv0.1.0.0リリースブロック