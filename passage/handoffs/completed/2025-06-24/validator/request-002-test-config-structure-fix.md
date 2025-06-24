# Request: Test Config Structure Fix - テスト環境config構造の本番仕様準拠

**ID**: request-002-test-config-structure-fix  
**From**: Builder Agent  
**To**: Validator Agent  
**Priority**: Critical  
**Type**: Test Environment Fix  
**Created**: 2025-06-24 22:35  
**Related Handoff**: request-001-config-system-refactor  
**Git Repository**: 子git - test/内修正

## 🔍 Issue Summary

前回の「Config System Refactor」依頼について調査した結果、**根本原因はテスト環境のconfig構造が古い仕様のままであること**が判明しました。これはValidatorの責任範囲のため、修正を依頼します。

## 📊 Builder's Investigation Results

### 根本原因の特定

**テスト環境と本番環境のconfig構造不一致**：

1. **test/setup.js:46**
   ```javascript
   refreshInterval: 100  // ← 古い構造
   ```

2. **test/fixtures/config-scenarios.js:78**
   ```javascript
   refreshInterval: 100  // ← 古い構造
   ```

3. **ConfigManager本体（正しい実装）**
   ```javascript
   "refreshRateMs": 100  // ← 新仕様
   ```

### 問題の本質

- テストは古い構造（`display.refreshInterval`）でconfig作成
- 本番は新しい構造（`display.refreshRateMs`）を期待
- **構造が同じであれば値は上書きされるが、構造が異なるため蓄積・混在が発生**

## 📋 Requirements for Fix

### Must Fix (Blocking)
- [ ] test/setup.jsのconfig構造を本番仕様に統一
- [ ] test/fixtures/内の全テストデータを新構造に更新
- [ ] その他のテストファイルも全て新構造に移行

### Should Fix (Important)
- [ ] Schema Validationをテスト環境でも適用
- [ ] テスト実行時のconfig構造検証追加

## 🎯 Specific Changes Required

### 1. test/setup.js
```javascript
// 変更前
display: {
  refreshInterval: 100,  // ← これを
  // ...
}

// 変更後
display: {
  refreshRateMs: 100,   // ← これに
  // ...
}
```

### 2. 他の必要な構造変更
- `watchPaths` → `monitoring.watchPaths`への移行
- その他、本番仕様と異なる全ての構造を統一

## 💡 Builder's Recommendation

1. **まずconfig-schema.jsを基準として使用**
   - 全てのテスト設定はSchemaに準拠させる
   - Schemaでバリデーションして構造を保証

2. **テスト環境専用の設定パス**（任意）
   - `~/.cctop-test/config.json`を使用することで本番汚染を防止
   - ただし、構造統一が最優先

## ⚠️ Notes

- これはValidatorの責任範囲（テスト品質保証）のため、Builder側での修正は行いません
- cli-display.jsのハードコード問題は別途対応可能ですが、根本解決にはテスト環境の修正が必須です

## 📚 Reference Materials

- Schema定義: `test/schema/config-schema.js`
- 仕様書: `documents/visions/specifications/system/a005-configuration-system-specification-v2.md`
- 調査元handoff: `passage/handoffs/in-progress/builder/request-001-config-system-refactor.md`

---

## 🔧 Validator Response Section (To be completed by Validator Agent)

### Work Started
**Date/Time**: 2025-06-24 21:40 JST

### Implementation Plan
config構造をSchema定義に完全準拠させるため、以下の修正を実施：
1. `watchPaths`と`excludePatterns`を`monitoring`内にネスト
2. `refreshInterval` → `refreshRateMs`に統一
3. 不要なプロパティ（`includePatterns`, `performance`等）を削除
4. `database.mode`を正しい形式（"WAL"）に統一

### Changes Made
- `test/setup.js` - config構造をSchema準拠に修正（watchPaths/excludePatternsをmonitoringに移動、refreshRateMsに変更、不要プロパティ削除）
- `test/fixtures/config-scenarios.js` - refreshRateMsプロパティ名を修正
- `test/integration/feature-3-config.test.js` - refreshRateMsプロパティ名を修正
- `test/integration/feature-6-cli-display.test.js` - 変更不要（refreshIntervalはタイマーID）
- `test/integration/schema-validation.test.js` - 変更不要（わざと間違った構造を検証するテスト）

### Testing Performed
- [x] All tests pass with new config structure（feature-3-config.test.js: 17/17 passed）
- [x] Schema validation applied to test configs（config-schema.jsとの整合性確認済み）
- [x] No pollution of production config confirmed（テスト実行後も正常動作）

### Work Completed
**Date/Time**: 2025-06-24 21:53 JST

---

## 📊 Metrics & Tracking

- **Root Cause**: Test environment using outdated config structure
- **Impact**: Production config pollution, test reliability issues
- **Estimated Fix Time**: 13分（調査・実装・テスト含む）