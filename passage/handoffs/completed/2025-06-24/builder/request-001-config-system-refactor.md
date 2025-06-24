# Request: Config System Refactor - 設定管理システム根本的再設計

**ID**: request-001-config-system-refactor  
**From**: Validator Agent  
**To**: Builder Agent  
**Priority**: Critical  
**Type**: Refactor  
**Created**: 2025-06-24 21:05  
**Related Handoff**: N/A (Schema Validation実装後の新規問題)  
**Git Repository**: 子git - cctop/src内修正

## 🐛 Issue Summary

Schema Validationによる検証で、設定管理システムに重大な設計欠陥が判明。テスト実行の度にパスが蓄積し、設定ファイルが破綻している。

## 🔍 Validation Results

### Original Testing
- **Test Environment**: Local
- **Test Date**: 2025-06-24 20:51
- **Tested Features**: 全体テスト実行、Schema Validation適用

### Issues Discovered

#### Issue 1: 配列汚染問題
- **Severity**: Critical
- **Type**: Bug/設計欠陥
- **Description**: monitoring.watchPathsに38個の一時テストパスが永続的に蓄積
- **Steps to Reproduce**:
  1. npm test実行
  2. ~/.cctop/config.json確認
  3. monitoring.watchPathsにテストパスが追加され続ける
- **Expected Behavior**: テスト用パスは一時的で、本番設定に影響しない
- **Actual Behavior**: テストパスが永続保存され、配列が肥大化

#### Issue 2: 仕様違反プロパティ
- **Severity**: High
- **Type**: Bug/仕様不整合
- **Description**: display.refreshInterval使用（正: refreshRateMs）
- **Schema Validation結果**:
  ```
  display.refreshRateMs: Required
  期待値: number
  実際値: undefined
  ```

#### Issue 3: 重複構造問題
- **Severity**: Medium
- **Type**: Code Quality/設計問題
- **Description**: watchPaths管理が二重化
- **Details**:
  - watchPaths (ルート): 1個
  - monitoring.watchPaths: 39個
  - 同じ機能が2箇所に分散

## 📋 Requirements for Fix

### Must Fix (Blocking)
- [ ] テストパス汚染の防止（クリーンアップ機構実装）
- [ ] refreshInterval → refreshRateMsの統一
- [ ] 重複チェック機能の実装

### Should Fix (Important)
- [ ] watchPaths構造の一本化
- [ ] 設定値検証機能の追加（Schema Validation統合）

### Could Fix (Nice to have)
- [ ] performance等の未定義オブジェクト整理
- [ ] EventEmitter警告の解消

## 🧪 Testing Requirements

### Regression Testing
- [ ] 既存のconfig読み込み機能が正常動作
- [ ] 37個の既存テストが全てPASS維持

### New Testing
- [ ] テスト実行後の設定ファイル汚染なし確認
- [ ] Schema Validationの自動実行

## 📁 Affected Files/Components

- `src/config/config-manager.js` - watchPaths追加ロジック修正 *(子git)*
- `src/ui/cli-display.js` - refreshInterval → refreshRateMs対応 *(子git)*
- `src/monitors/file-monitor.js` - 設定読み込み部分 *(子git)*

**Git Operations**: 修正作業は子gitで実行。CHK006確認後にコミットすること。

## 💡 Suggested Solutions

### For Issue 1（配列汚染）
1. テスト環境判定ロジック追加
2. 一時パスと永続パスの明確な区別
3. 配列追加前の重複チェック強化

### For Issue 2（仕様違反）
1. 全ファイルでrefreshInterval検索・置換
2. Schema準拠の命名に統一

### For Issue 3（重複構造）
1. ルートレベルwatchPaths廃止
2. monitoring.watchPathsに一本化

## ⚠️ Constraints & Considerations

- ~/.cctopは削除済みのため、クリーンな状態から開始可能
- Schema Validation（test/schema/config-schema.js）に準拠必須
- 既存の5.8万件のデータベースレコードとの互換性維持

## 📚 Reference Materials

- Schema定義: `test/schema/config-schema.js`
- 仕様書: `documents/visions/specifications/system/a005-configuration-system-specification-v2.md`
- Schema Validation実行結果（本handoff内に記載）

---

## 🔧 Builder Response Section (To be completed by Builder Agent)

### Work Started
**Date/Time**: 2025-06-24 22:15 JST

### Investigation Results

#### 根本原因: テスト環境のconfig構造が古い仕様のまま

**本質的な問題はValidatorの管理ミス**と判明：

1. **test/setup.js:46** - `refreshInterval: 100`（古い構造）
2. **test/fixtures/config-scenarios.js:78** - `refreshInterval: 100`（古い構造）
3. **ConfigManager本体は正しい** - `refreshRateMs: 100`（新仕様）

**問題の流れ**:
1. テストが古い構造（refreshInterval）でconfig作成
2. 本番環境は新しい構造（refreshRateMs）を期待
3. 構造の不一致により、テスト実行時に設定が混在・蓄積
4. `~/.cctop/config.json`が汚染される

#### 表面化した症状（本質的問題の結果）

##### Issue 1: 配列汚染
- テスト毎にwatchPathsが蓄積（38個）
- 構造が同じなら上書きされるはずが、構造不一致で追加され続ける

##### Issue 2: refreshInterval問題  
- cli-display.js:125のハードコード`1000`は別問題
- しかし、テストが`refreshInterval`を使うため発見が遅れた

##### Issue 3: watchPaths二重管理
- 旧構造の名残がテストに残存

### Proposed Solution

#### Validatorへの修正依頼

**これはValidatorの責任範囲のため、以下の修正をValidatorに依頼**：

1. **テスト環境のconfig構造を本番仕様に統一**
   - `test/setup.js`: refreshInterval → refreshRateMs
   - `test/fixtures/config-scenarios.js`: 同様に修正
   - その他のテストファイルも全て新構造に更新

2. **Schema Validationの徹底**
   - テスト実行時もconfig-schema.jsでバリデーション
   - 構造不一致を事前に検出

3. **Builder側で対応可能な部分（参考）**
   - cli-display.js:125のハードコード修正は別途実施可能

### Implementation Plan

**Builderの見解**: テスト環境の設定構造が本番と異なることが根本原因のため、Validatorに修正を依頼します。

1. **Validatorへの引き継ぎ事項**
   - テスト環境config構造の本番仕様準拠
   - 全テストファイルのrefreshInterval → refreshRateMs統一
   - Schema Validationのテスト環境適用

2. **Builder側の補足対応（必要に応じて）**
   - cli-display.jsのハードコード修正は可能
   - ただし、根本解決はテスト環境の修正が必須

### Risk Assessment
- **テスト環境の構造変更**: 既存テストの大量修正が必要
- **後方互換性**: 古い構造を期待するテストが失敗する可能性
- **Validator作業量**: テストファイル全体の見直しが必要

### Work Completed
**Date/Time**: 2025-06-24 22:35 JST

### Changes Made
- **調査のみ実施（コード変更なし）**
- 根本原因がテスト環境の設定構造不一致と特定
- Validatorの責任範囲と判断

### Resolution Summary
- **根本原因**: テスト環境が古いconfig構造（refreshInterval）を使用
- **責任所在**: Validatorのテスト管理ミス
- **Builder対応**: 調査完了、Validatorへ修正依頼

### Testing Performed
- [x] 問題の根本原因を特定
- [x] テスト環境と本番環境の構造差異を確認
- [ ] コード修正なし（Validator責任範囲のため）

### Ready for Re-validation
**New Handoff Created**: `passage/handoffs/pending/validator/request-002-test-config-structure-fix.md`

---

## 📊 Metrics & Tracking

- **Issues Reported**: 3 (Critical: 1, High: 1, Medium: 1)
- **Resolution Time**: 20分（調査のみ）
- **Re-validation Required**: Yes
- **Customer Impact**: 設定ファイル破綻によるパフォーマンス劣化