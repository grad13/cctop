# Builder依頼: Critical FUNC整合性問題修正

**依頼ID**: HO-20250626-012  
**作成日**: 2025-06-26 17:30  
**依頼元**: Architect Agent  
**優先度**: Critical  
**種別**: FUNC仕様書整合性修正反映  

## 🚨 Critical Issues修正完了 - 実装反映依頼

**背景**: Validatorによる全FUNC文書整合性チェックで4つのCritical Issuesを発見。FUNC仕様書レベルでの修正完了により、実装レベルでの反映が必要。

## 📋 修正済みCritical Issues

### **Issue 1: Database Field命名統一完了**
**修正箇所**: FUNC-002-chokidar-database-integration.md:41-43

**修正内容**:
```diff
- ファイル削除時: is_deleted=1に更新
- ファイル復元時: is_deleted=0に更新
+ ファイル削除時: is_active=FALSE に更新  
+ ファイル復元時: is_active=TRUE に更新
```

**実装反映要求**:
- schema.js: `is_deleted`フィールドを`is_active BOOLEAN`に変更
- DatabaseManager: 全`is_deleted`参照を`is_active`に変更
- EventProcessor: 削除・復元ロジックをBOOLEAN方式に変更

### **Issue 2: データベースファイル名統一完了**
**修正箇所**: FUNC-011-hierarchical-config-management.md:56

**修正内容**:
```diff
- "path": "~/.cctop/cctop.db",
+ "path": "~/.cctop/activity.db",
```

**実装反映要求**:
- config.json: デフォルトパスを`activity.db`に変更
- DatabaseManager: ファイル名参照を`activity.db`に統一
- ドキュメント: 全`cctop.db`参照を`activity.db`に変更

### **Issue 3: excludePatterns設定統合完了**
**修正箇所**: FUNC-011-hierarchical-config-management.md:45

**修正内容**:
```diff
- "excludePatterns": [           // 除外パターン（FUNC-002準拠）
+ "excludePatterns": [           // 除外パターン（FUNC-002 chokidar.ignoredと同期）
```

**実装反映要求**:
- ConfigManager: excludePatternsをchokidar.ignoredに正確にマッピング
- 設定マージ: config.json → chokidar設定の一方向同期確保
- 設定検証: 両者の完全同期をチェック機能追加

### **Issue 4: CLI仕様一元化原則明記完了**
**修正箇所**: FUNC-014-cli-interface-specification.md:31-32

**修正内容**:
```diff
+ ### ⚠️ **重要**: CLI仕様一元化原則
+ **Critical Issue対応**: 他FUNC（011, 012等）でのCLI定義は参考用のみとし、実装は本FUNC-014仕様を単一の信頼できる情報源（Single Source of Truth）とする。
```

**実装反映要求**:
- CLI Parser: FUNC-014のみを実装ソースとする
- ヘルプ生成: FUNC-014からの自動生成システム構築
- 重複除去: 他箇所のCLI定義を無視する実装

## 🎯 実装優先度

### **Phase 1: データベース層修正（最優先）**
1. **schema.js修正**: `is_deleted` → `is_active BOOLEAN`
2. **DatabaseManager修正**: 全フィールド参照変更
3. **マイグレーション**: 既存DBの`is_deleted`データ変換

### **Phase 2: 設定・CLI層修正**
1. **config.json**: デフォルトパス変更
2. **excludePatterns同期**: 設定マッピング実装
3. **CLI Parser**: FUNC-014単一ソース化

## 📊 品質保証要件

### **Critical修正の検証項目**
1. **データベース整合性**: 
   - 既存データの正確な変換
   - `is_active`フィールドの正常動作
   - ファイル削除・復元の正確な状態管理

2. **設定同期正確性**:
   - config.json ↔ chokidar.ignored完全同期
   - excludePatterns変更の即座反映
   - 設定不整合の検出・警告

3. **CLI統一性**:
   - FUNC-014以外のCLI定義無視
   - ヘルプ表示の完全統一
   - オプション重複の根絶

## ⚠️ 重要な注意事項

### **下位互換性の考慮**
- **既存データベース**: マイグレーション必須（データ損失防止）
- **既存設定ファイル**: 自動変換または警告表示
- **既存スクリプト**: `cctop.db` → `activity.db`の影響評価

### **Validator連携**
- **修正完了時**: Validatorによる整合性再チェック要請
- **実装確認**: 仕様書と実装の完全一致検証
- **回帰テスト**: 既存機能の動作保証

## 🎯 期待される成果

### **技術的改善**
- **設計一貫性**: FUNC仕様書と実装の完全同期
- **保守性向上**: 単一の信頼できる情報源確立
- **開発効率**: 仕様迷いの根絶

### **品質向上**
- **データ整合性**: 正確なBOOLEAN状態管理
- **設定信頼性**: 確実な除外パターン同期
- **インターフェース統一**: 一貫したCLI体験

---

**Architect**: Critical Issues修正により、技術的整合性の確保とFUNC仕様書の権威性確立を実現。実装レベルでの完全反映により、プロジェクト全体の品質基盤が強化されます。