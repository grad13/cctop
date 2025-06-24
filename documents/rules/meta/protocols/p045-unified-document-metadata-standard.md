# P045: 統一文書メタデータ標準

**作成日**: 2025年6月23日  
**作成者**: Architect Agent  
**ステータス**: 確立済み  
**目的**: 文書作成時のDate/Created冗長性解消と統一メタデータ標準確立

## 📋 問題の背景

### 冗長性の具体例
```markdown
**Document ID**: PLAN-20250622-004  ← 日付が既に含まれている
**Date**: 2025-06-22              ← 冗長
**Created**: 2025-06-22 23:15     ← より有用で詳細
```

### 発生原因
1. **2つの標準が並存**: P026標準（日本語）と新Document ID標準（英語）
2. **Document IDの日付埋め込み**: YYYY-MM-DD形式で日付が既に含まれる
3. **更新時の混乱**: Created（固定）とDate（更新想定）の役割不明確

## ✅ 統一メタデータ標準

### 基本原則
1. **単一タイムスタンプ**: Created のみ使用、Date フィールド廃止
2. **必要時のみUpdated**: 実際に更新があった場合のみ追加
3. **英語統一**: 国際的な互換性確保
4. **Document ID優先**: 日付情報はDocument IDに依存

### 新標準フォーマット

#### **新規作成時**
```markdown
**Document ID**: [prefix]-YYYYMMDD-[number]  
**Created**: YYYY-MM-DD HH:MM  
**Author**: [Agent Name]  
**Status**: [status]  
**Purpose**: [purpose description]  
```

#### **更新時**
```markdown
**Document ID**: [prefix]-YYYYMMDD-[number]  
**Created**: YYYY-MM-DD HH:MM  ← 初回作成日時（固定）
**Updated**: YYYY-MM-DD HH:MM  ← 最終更新日時（更新時のみ追加）
**Author**: [Original Author]  
**Status**: [current status]  
**Purpose**: [purpose description]  
```

## 🔧 実装ガイドライン

### Agent作業時の必須手順
1. **新規文書作成**: 上記新標準フォーマットを使用
2. **既存文書更新**: 
   - Dateフィールドがある場合は削除
   - 実際に内容を変更した場合のみUpdatedを追加
3. **メタデータのみ変更**: Updatedは追加しない（内容変更でない）

### フィールド定義

| フィールド | 必須 | 形式 | 説明 |
|------------|------|------|------|
| Document ID | ✅ | prefix-YYYYMMDD-number | 文書の一意識別子（日付含む） |
| Created | ✅ | YYYY-MM-DD HH:MM | 初回作成日時（不変） |
| Updated | 📝 | YYYY-MM-DD HH:MM | 最終更新日時（更新時のみ） |
| Author | ✅ | Agent Name | 作成者エージェント名 |
| Status | ✅ | Active/Proposal/Draft/Archived | 文書の現在ステータス |
| Purpose | ✅ | テキスト | 文書の目的・概要 |

### 廃止フィールド
- ❌ **Date**: Document IDとCreatedで冗長
- ❌ **作成日**: 英語統一のためCreatedに統合
- ❌ **作成者**: 英語統一のためAuthorに統合

## 📊 移行計画

### Phase 1: 新規文書（即座適用）
- すべての新規文書作成時に新標準適用
- 既存文書は段階的移行

### Phase 2: 既存文書修正（編集時適用）
- 既存文書を編集する際、メタデータを新標準に更新
- 内容変更を伴う場合のみUpdatedフィールド追加

### Phase 3: 一括移行（任意）
- 必要に応じて既存文書の一括標準化

## 🎯 具体的改善例

### Before（冗長）
```markdown
**Document ID**: PLAN-20250622-004  
**Date**: 2025-06-22  
**Created**: 2025-06-22 23:15  
**Author**: Validator Agent  
```

### After（統一標準）
```markdown
**Document ID**: PLAN-20250622-004  
**Created**: 2025-06-22 23:15  
**Author**: Validator Agent  
```

### 更新時
```markdown
**Document ID**: PLAN-20250622-004  
**Created**: 2025-06-22 23:15  
**Updated**: 2025-06-23 10:30  
**Author**: Validator Agent  
```

## 📋 チェックリスト

### 新規文書作成時
- [ ] Document IDにYYYYMMDD形式で日付含む
- [ ] Created フィールドでタイムスタンプ指定
- [ ] Date フィールドは使用しない
- [ ] 英語メタデータフィールドを使用

### 既存文書更新時
- [ ] 実際に内容変更した場合のみUpdatedを追加
- [ ] Date フィールドがある場合は削除検討
- [ ] メタデータのみ変更の場合はUpdatedを追加しない

## 🚀 期待効果

1. **冗長性解消**: Date/Created重複の完全解消
2. **標準統一**: 全文書で一貫したメタデータ形式
3. **更新トラッキング**: Created（不変）とUpdated（変動）の明確分離
4. **保守効率**: 統一形式による管理効率向上

---

**適用開始**: 2025年6月23日より即座に新規文書に適用