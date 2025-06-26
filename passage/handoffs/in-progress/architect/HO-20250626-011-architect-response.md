# Architect Response: FUNC-000準拠実装指示

**対応ID**: HO-20250626-011-response  
**作成日**: 2025-06-26 17:15  
**対応者**: Architect Agent  
**元依頼**: HO-20250626-011 Critical Schema Specification Violation  

## 🎯 設計判断結果

### **最終決定: FUNC-000公式仕様100%準拠**

**判断根拠**: ユーザー承認「func-000が100%正しい」「しっかり固めたfunctionsは信頼できる」

### **実装方針**

#### **Phase 1: FUNC-000準拠への完全移行**
1. **schema.js**: FUNC-000仕様通りの3フィールド構造に完全書き換え
   ```sql
   CREATE TABLE files (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       inode INTEGER,
       is_active BOOLEAN DEFAULT TRUE
   );
   ```

2. **設計思想の徹底**:
   - **files**: 現在状態のみ（シンプル）
   - **events**: 全履歴・file_path記録（詳細）
   - **measurements**: イベント時点測定値（完全）

#### **Phase 2: 実装層の全面修正**
1. **DatabaseManager**: findByPath()等をeventsテーブルベースに変更
2. **EventProcessor**: files複雑フィールド依存を除去
3. **マイグレーション**: 既存DBデータの適切な移行

## 📋 Builder向け実装指示

### **最優先タスク（v0.2.0.0 Critical Fix）**
1. **schema.js完全書き換え**: FUNC-000仕様準拠
2. **DatabaseManager修正**: eventsテーブル中心の設計に変更
3. **EventProcessor修正**: ファイル情報取得ロジックの変更
4. **マイグレーション作成**: 既存データ保全

### **品質基準**
- **FUNC-000との100%整合性**: 一切の乖離を許可しない
- **機能完全性**: 既存機能を損なわない設計
- **パフォーマンス維持**: クエリ性能の確保

### **作業優先度**
**Critical**: v0.2.0.0リリース前の必須修正
- 他の全機能実装より優先
- FUNC-902実装は本修正完了後に実施

## 🔧 技術指針

### **FUNC-000設計思想の再徹底**
**Core Principle**: 「現在状態」と「履歴情報」の明確分離

1. **files**: 現在活性ファイルの最小情報のみ
2. **events**: 時系列イベント・詳細情報の完全記録
3. **measurements**: 測定可能な数値データの履歴

### **実装パターン**
```javascript
// ❌ Wrong (現在の実装)
const file = await db.findByPath(filePath);

// ✅ Correct (FUNC-000準拠)
const latestEvent = await db.getLatestEventByPath(filePath);
const file = await db.getFileByInode(latestEvent.inode);
```

## ⚠️ 重要な注意事項

### **設計の一貫性確保**
- **FUNC-000が基盤**: 全ての設計判断はFUNC-000を基準とする
- **仕様書の権威**: 実装で判断に迷った際は必ずFUNC参照
- **設計変更禁止**: 実装の都合による仕様変更は一切認めない

### **品質保証プロセス**
1. **実装前**: FUNC-000仕様との適合性確認
2. **実装中**: 継続的なFUNC-000準拠チェック
3. **実装後**: Validator による完全仕様適合テスト

## 📊 スケジュール影響

### **v0.2.0.0リリースへの影響**
- **Critical Fix**: 1-2日の追加作業
- **リリース遅延**: 許容範囲内（設計正確性優先）
- **v0.2.1.0**: FUNC-902実装はv0.2.0.0完了後

### **長期的メリット**
- **技術的負債解消**: 根本設計の正確性確保
- **開発効率向上**: 明確な仕様による実装迷いの解消
- **品質向上**: 設計一貫性による保守性向上

## 🎯 最終指示

**Builder Agent**: FUNC-000公式仕様に100%準拠した実装への全面修正を最優先で実行してください。

**信頼性保証**: 「しっかり固めたfunctions」は確実な基盤です。仕様に従えば必ず正しい実装になります。

---

**Architect**: FUNC-000の設計判断に絶対的な信頼を置き、実装の完全準拠を保証します。