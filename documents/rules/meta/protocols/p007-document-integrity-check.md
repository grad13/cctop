# P007: 文書整合性定期チェックプロトコル

**作成日**: 2025年6月14日 nodata  
**作成者**: Clerk Agent  
**ステータス**: 確立済み  
**参照URL**: INC-20250614-021

## 疑問点・決定事項
- [x] 実施タイミングをユーザー指定時に主軸化
- [x] 時間制限なしの完全実施方針
- [x] Critical・Important問題の100%解決義務

---  

## 📋 概要

手動プロセスでは文書参照の整合性維持に限界があるため、定期的な網羅的チェックを実施する。
特に**broken links**（存在しないファイルへの参照）の発見・解決を重視し、システム全体の参照整合性を確保する。

## ⏰ 実施条件

### 実施トリガー
- **ユーザー指定時**: ユーザーが文書整合性チェックを指示した時
- **緊急実施**: 文書参照エラー・incident発生時
- **agent判断**: 大規模文書変更後に必要と判断した時

### 実施原則
- **完了まで継続**: 時間制限なし、すべての問題解決まで実施
- **中断禁止**: 一度開始したら完了まで他作業禁止
- **全問題対応**: Critical・Important問題の100%解決必須

## 🔍 チェック項目

### 0. Dominants参照整合性（最高優先度・15分）

**対象**: プロジェクトの最高位規則の参照確認
- `documents/rules/dominants/`内のすべての参照
- `CLAUDE.md` Dominantセクションの参照

**チェック内容**:
```bash
echo "=== DOMINANTS REFERENCE INTEGRITY CHECK ==="

# dominants内の全参照を抽出・確認
echo "1. Protocol references in dominants:"
grep -o "[PH][0-9][0-9][0-9]" documents/rules/dominants/*.md | sort | uniq

echo "2. File references in dominants:"  
grep -o "documents/[^)]*\.md" documents/rules/dominants/*.md

echo "3. Verification of each reference..."
# 各参照の存在確認・状況確認
```

**修正方針**:
- **核心保持**: Dominant原則の本質は変更しない
- **参照正確化**: 存在しない参照の修正（一般化・削除・置換）
- **状況明記**: 統合・廃止状況の明確化
- **P040準拠**: 最小限の修正で最大の整合性確保

### 1. プロトコル参照整合性（目安30分）
```bash
# アクティブプロトコルリスト取得（protocolsディレクトリで確認）
grep "| P[0-9]" documents/rules/meta/protocols/README.md | grep -v "欠番\|廃止\|移動"

# 全文書でのプロトコル番号参照確認
grep -r "P[0-9][0-9][0-9]" documents/ --include="*.md"
grep -r "P[0-9][0-9][0-9]" CLAUDE.md

# 廃止済みディレクトリ参照の残存確認（移行漏れチェック）
# hypothesesディレクトリは廃止済み
```

**期待結果**: アクティブプロトコルのみ参照、廃止済みディレクトリへの参照なし

### 2. Dominants参照整合性（目安15分）
```bash
# Dominantsリスト確認
ls documents/rules/dominants/

# DDD参照の整合性確認
grep -r "DDD[0-9]" documents/ --include="*.md"
grep -r "DDD[0-9]" CLAUDE.md
```

**期待結果**: DDD0・DDD1のみ参照、未定義DDD番号なし

### 3. broken links発見（目安20分）
```bash
# README.mdでのbroken links確認
grep -o "documents/[^)]*\.md" documents/*/README.md | while read file; do
  if [ ! -f "$file" ]; then
    echo "BROKEN LINK: $file"
  fi
done

# CLAUDE.md内のbroken links確認
grep -o "documents/[^)]*\.md" CLAUDE.md | while read file; do
  if [ ! -f "$file" ]; then
    echo "BROKEN LINK: $file"
  fi
done
```

**期待結果**: broken links 0件（すべての参照が有効）

### 4. プロトコル・チェックリスト参照（目安10分）
```bash
# protocols参照確認
grep -r "protocols/" documents/ --include="*.md"

# checklists参照確認  
grep -r "checklists/" documents/ --include="*.md"

# 存在しないprotocol・checklist参照確認
```

**期待結果**: 参照されているprotocol・checklistがすべて存在

### 5. インシデント参照整合性（目安10分）
```bash
# インシデント番号形式確認
ls documents/rules/meta/incidents/ | grep -E "^INC-[0-9]{8}-[0-9]{3}-"

# 参照の整合性確認
grep -r "INC-[0-9]" documents/ --include="*.md" | grep -v "meta/incidents/"

# 旧形式の残存確認
ls documents/rules/meta/incidents/ | grep -v "^INC-" | grep -v "README.md"
```

**期待結果**: すべてのincidentがINC-YYYYMMDD-XXX-title.md形式

### 6. Agent権限・責務整合性（目安15分）
```bash
# 各Agent権限の整合性確認
grep -A 10 -B 5 "権限範囲" documents/agents/status/*.md

# CLAUDE.md内のAgent権限記述確認
grep -A 5 -B 5 "Agent" CLAUDE.md
```

**期待結果**: 3つのAgent権限が一致、DDD1準拠

## 📊 チェック実行手順

### Step 1: 環境準備（目安5分）
- [ ] 作業ディレクトリが`/workspace`であることを確認
- [ ] チェック開始時刻を記録
- [ ] 環境状態の確認

### Step 2: 自動チェック実行（制限時間なし）
- [ ] **プロトコル参照整合性チェック**（30分）
  - [ ] アクティブプロトコルリスト確認
  - [ ] 全文書での参照確認
  - [ ] 旧hypotheses参照残存確認
  - [ ] 問題箇所のリスト化

- [ ] **Dominants参照整合性チェック**（15分）
  - [ ] DDD0・DDD1参照確認
  - [ ] 未定義DDD番号確認

- [ ] **broken links発見**（20分）
  - [ ] README.md参照のbroken links確認
  - [ ] CLAUDE.md参照のbroken links確認
  - [ ] broken linkのリスト化

- [ ] **その他整合性確認**（35分）
  - [ ] protocol・checklist参照確認
  - [ ] インシデント参照整合性確認
  - [ ] Agent権限整合性確認
  - [ ] 日本語・英語表記統一確認

### Step 3: 問題対応（完了まで継続）
- [ ] **問題の分類**
  - [ ] Critical: 参照エラー・broken link
  - [ ] Important: 表記不統一・古い情報
  - [ ] Minor: 軽微な不整合

- [ ] **Critical問題の即座修正**
  - [ ] broken linksの解決（参照先修正・ファイル作成）
  - [ ] obsolete参照の削除・更新
  - [ ] CLAUDE.md参照の修正

- [ ] **修正結果の再チェック**
  - [ ] 修正箇所の再検証
  - [ ] 連鎖的影響の確認

### Step 4: 記録・報告（15分）
- [ ] **チェック結果記録**
  - [ ] `documents/records/reports/REP-XXXX-document-integrity-check.md`作成
  - [ ] 発見問題数・修正数を記録
  - [ ] 修正内容の詳細記録

- [ ] **status更新**
  - [ ] Clerk status更新（実施記録）
  - [ ] 必要に応じてincident記録

## 🚨 エスカレーション基準

### Level 1: 通常対応
- **条件**: 軽微な不整合1-3件
- **対応**: 即座修正・記録

### Level 2: 注意対応  
- **条件**: 重要な不整合4-10件
- **対応**: 修正・プロセス見直し検討

### Level 3: 緊急対応
- **条件**: Critical問題11件以上 OR CLAUDE.md重大不整合
- **対応**: incident記録・プロセス抜本改革

## 📈 効果測定

### 成功指標
- **整合性**: 発見問題数 < 5件/週
- **修正率**: 発見問題の100%修正
- **予防効果**: 同種incident発生率 < 1件/月

### 改善指標
- **検査効率**: チェック時間 < 90分
- **自動化率**: 手動確認項目の段階的削減
- **品質向上**: ユーザー指摘の整合性問題 0件

## 🔄 プロセス改善

### 月次見直し
- チェック項目の有効性評価
- 新しい整合性問題パターンの追加
- 自動化可能項目の検討

### 四半期改善
- スクリプト化による効率化
- チェック頻度の最適化
- 品質指標の見直し

---

**重要**: このプロトコルは文書整合性維持の最後の砦です。手動プロセスの限界を補う定期的な網羅チェックにより、参照エラーを根絶します。

## 更新履歴

- 2025年6月17日: hypotheses参照を廃止済みディレクトリ参照として一般化（Clerk Agent）
- 2025年6月17日 23:50: "broken links"概念を明確化、手順に組み込み（Clerk Agent）
- 2025年6月17日 14:00: P026メタデータ標準に更新（Clerk Agent）
- 2025年6月14日 nodata: 初版作成（Clerk Agent）