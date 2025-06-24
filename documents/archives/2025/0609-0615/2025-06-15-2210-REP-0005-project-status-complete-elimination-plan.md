---
**アーカイブ情報**
- アーカイブ日: 2025-06-16（P024実施日）
- アーカイブ週: 2025/0602-0608
- 元パス: documents/records/reports/
- 検索キーワード: LEGACY_STATUS削除, ステータス管理, ファイル整理, 旧ファイル削除, 完全削除計画, プロジェクト整理, 完了作業, クリーンアップ

---

# 旧ステータス管理ファイル完全削除計画（完了）

**Report ID**: REP-0005  
**作成日**: 2025年6月15日 22:10  
**作成者**: Clerk Agent  
**目的**: 旧ステータス管理ファイルへの参照を完全に削除し、無限ループを断ち切る  
**注**: 本文書は歴史的記録として保存

## 📋 現状分析

### 問題の本質
LEGACY_STATUS.mdを管理・参照するプロセス自体にLEGACY_STATUS.mdが含まれることで、永続的な循環参照が発生している。

### 参照状況（2025年6月15日現在）
- **総参照数**: 137件
- **主な参照場所**:
  - incidents/: 過去のインシデント記録
  - experiments/: H005等の実験記録
  - hypotheses/: H017、H038、H039等
  - protocols/: p000、p006、p009
  - status/: 各エージェントの作業記録

## 🎯 削除戦略

### 基本方針
1. **完全置換戦略**: すべてのLEGACY_STATUS.md → LEGACY_STATUS.mdに置換
2. **例外なし**: 過去記録も含めて一括置換
3. **二段階置換**:
   - 過去記録: LEGACY_STATUS.md → LEGACY_STATUS.md
   - 現在の仮説・プロトコル: LEGACY_STATUS.md → status/{agent}.md

## 📅 実施計画

### Phase 1: アクティブな仮説の更新（優先度: Critical）
以下の仮説からLEGACY_STATUS.md参照を削除し、status/{agent}.mdに置換：

1. **H017（プロジェクト状況把握プロセス）**
   - LEGACY_STATUS.md → status/{agent}.md
   - 各エージェントの統合的な把握方法に更新

2. **H038（統合プロセス強制システム）**
   - Git操作時のLEGACY_STATUS.md更新 → status/{agent}.md更新

3. **H039（エージェント協調システム）**
   - LEGACY_STATUS.md競合問題 → 各agent個別管理で解決済みと記載

### Phase 2: プロトコルの更新（優先度: High）
1. **P000（用語定義）**
   - LEGACY_STATUS.md更新忘れ → status/{agent}.md更新忘れ

2. **P006（ファイル命名規則）**
   - 例からLEGACY_STATUS.mdを削除

3. **P009（status管理）**
   - 作成理由を更新（単に新体系への移行として）

### Phase 3: README類の更新（優先度: Medium）
1. **hypotheses/README.md**
   - H023の説明更新
   - H005への言及を現在形に

2. **status/README.md**
   - 旧LEGACY_STATUS.mdへの言及を削除

### Phase 4: 過去記録の一括置換（優先度: High）
以下のディレクトリ内のすべてのLEGACY_STATUS.md参照をLEGACY_STATUS.mdに置換：
- incidents/: すべてのインシデント記録
- experiments/: すべての実験記録
- reports/: 過去のレポート（このREP-0005は除く）

**置換方法**: sedまたはファイル編集による一括置換

## 🔧 実装手順

### Step 1: 事前確認
```bash
# LEGACY_STATUS.mdが存在しないことを確認
grep -r "LEGACY_STATUS" documents/ --include="*.md" | wc -l
# 期待値: 0
```

### Step 2: 過去記録の一括置換
```bash
# incidents/, experiments/, reports/内の一括置換
# LEGACY_STATUS.md → LEGACY_STATUS.md
```

### Step 3: アクティブな仮説の更新
```bash
# H017, H038, H039を個別に編集
# LEGACY_STATUS.md → status/{agent}.md
```

### Step 4: プロトコルの更新
```bash
# P000, P006, P009を個別に編集
# LEGACY_STATUS.md → status/{agent}.mdまたは削除
```

### Step 5: 最終確認
```bash
# LEGACY_STATUS.mdの参照がゼロになったことを確認
grep -r "LEGACY_STATUS" documents/ --include="*.md" | \
  grep -v "archive/" | wc -l
# 期待値: このREP-0005内の参照のみ
```

### Step 6: REP-0005自体の置換
```bash
# 最後にこのREP-0005内のLEGACY_STATUS.mdもLEGACY_STATUS.mdに置換
# これにより、LEGACY_STATUS.mdという文字列が完全にゼロになる
```

## 📊 成功基準

1. **LEGACY_STATUS.mdの文字列が完全にゼロ**（最終的にREP-0005も含む）
2. **過去記録はLEGACY_STATUS.mdとして文脈保持**
3. **現在のシステムはstatus/{agent}.mdで運用**
4. **LEGACY_STATUS.mdはユーザーとGit履歴にのみ存在**

## ⏰ 実施時間見積もり

- Phase 1: 15分（仮説の個別更新）
- Phase 2: 10分（プロトコルの更新）
- Phase 3: 5分（README類の更新）
- Phase 4: 20分（過去記録の一括置換）
- Step 6: 1分（REP-0005自体の置換）
- **合計**: 約51分

## 🚀 開始条件

- [ ] ユーザー承認
- [ ] 現在のGit状態をコミット
- [ ] 作業開始をstatus/clerk.mdに記録

---

**次のアクション**: ユーザー承認後、Phase 1から順次実施