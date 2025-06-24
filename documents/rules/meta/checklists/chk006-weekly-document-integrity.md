# 文書整合性チェックリスト

**作成日**: 2025年6月16日 nodata  
**実施条件**: ユーザー指定時または緊急時  
**所要時間**: 制限なし（完了まで継続）  
**責任者**: Clerk Agent  

## 🎯 チェック目標

- [ ] 文書参照の100%整合性確保
- [ ] obsolete参照の完全根絶  
- [ ] broken linkの即座修正

## ⏰ 事前準備（目安5分）

- [ ] **環境確認**
  - [ ] workspace directory確認
  - [ ] チェック開始時刻記録: `_____`
  - [ ] 環境状態確認

- [ ] **ツール準備**
  - [ ] bashコマンド実行環境確認
  - [ ] grep・find コマンド動作確認

## 🔍 Phase 1: プロトコル参照整合性（目安30分）

### 1.1 アクティブプロトコル確認（5分）
- [ ] **現在のアクティブプロトコルリスト取得**
```bash
grep "| P[0-9]" documents/rules/meta/protocols/README.md | grep -v "欠番\|廃止\|移動"
```
- [ ] アクティブプロトコル数を記録: `___個`
- [ ] 番号範囲を記録: `P000-P0__`

### 1.2 全文書プロトコル参照チェック（15分）
- [ ] **documents/内でのプロトコル参照確認**
```bash
grep -r "P[0-9][0-9][0-9]" documents/ --include="*.md" | grep -v README.md
```
- [ ] **CLAUDE.md内でのプロトコル参照確認**  
```bash
grep -n "P[0-9][0-9][0-9]" CLAUDE.md
```
- [ ] **検出された全参照の妥当性確認**
  - [ ] 各参照がアクティブプロトコルリスト内にある
  - [ ] 廃止済みプロトコルへの参照なし

### 1.3 廃止済みディレクトリ残存チェック（10分）
- [ ] **experiments/hypotheses/等の残存参照確認**
```bash
grep -r "experiments/\|hypotheses/" documents/ --include="*.md"
grep -r "experiments/\|hypotheses/" CLAUDE.md
```
- [ ] **結果**: 残存参照 `___件` （0件が目標）
- [ ] 発見した場合は即座修正

## 🏛️ Phase 2: Dominants参照整合性（15分）

### 2.1 Dominants存在確認（5分）
- [ ] **現在のDominants確認**
```bash
ls documents/rules/dominants/
```
- [ ] DDD0・DDD1の存在確認
- [ ] 新規DDDの確認

### 2.2 DDD参照チェック（10分）
- [ ] **documents/内でのDDD参照**
```bash
grep -r "DDD[0-9]" documents/ --include="*.md"
```
- [ ] **CLAUDE.md内でのDDD参照**
```bash
grep -r "DDD[0-9]" CLAUDE.md
```
- [ ] **結果**: 未定義DDD参照 `___件` （0件が目標）

## 📁 Phase 3: ファイル存在確認（20分）

### 3.1 README.md参照ファイル確認（10分）
- [ ] **README.md内の参照ファイル抽出・確認**
```bash
find documents/ -name "README.md" -exec grep -o "[^(]*documents/[^)]*\.md" {} \; | sort -u | while read file; do
  if [ ! -f "$file" ]; then
    echo "MISSING: $file"
  fi
done
```
- [ ] **結果**: 不存在ファイル `___件` （0件が目標）

### 3.2 CLAUDE.md参照ファイル確認（10分）
- [ ] **CLAUDE.md内の参照ファイル確認**
```bash
grep -o "documents/[^)]*\.md" CLAUDE.md | sort -u | while read file; do
  if [ ! -f "$file" ]; then
    echo "MISSING: $file"
  fi
done
```
- [ ] **結果**: 不存在ファイル `___件` （0件が目標）

## 🔧 Phase 4: プロトコル・チェックリスト参照（10分）

### 4.1 protocols参照確認（5分）
- [ ] **protocols参照の確認**
```bash
grep -r "protocols/" documents/ --include="*.md" | grep -o "protocols/p[0-9][0-9][0-9]-[^)]*\.md" | sort -u
```
- [ ] 各参照ファイルの存在確認
- [ ] **結果**: 不存在protocol `___件`

### 4.2 checklists参照確認（5分）
- [ ] **checklists参照の確認**
```bash
grep -r "checklists/" documents/ --include="*.md" | grep -o "checklists/[^)]*\.md" | sort -u
```
- [ ] 各参照ファイルの存在確認
- [ ] **結果**: 不存在checklist `___件`

## 👥 Phase 5: Agent権限整合性（15分）

### 5.1 Agent権限定義確認（10分）
- [ ] **5つのAgentの権限確認**
```bash
grep -A 5 -B 5 "権限範囲" documents/agents/roles/*.md
```
- [ ] **DDD1準拠性確認**
```bash
grep -A 3 "DDD1" documents/agents/roles/*.md
```
- [ ] Agent間の権限重複・矛盾なし

### 5.2 CLAUDE.md内Agent権限確認（5分）
- [ ] **CLAUDE.md内のAgent権限記述**
```bash
grep -A 5 -B 5 "Agent\|agent" CLAUDE.md
```
- [ ] documents/agents/roles/*.mdとの整合性確認

## 📊 結果集計・問題対応

### 発見問題の分類
- [ ] **Critical問題**: `___件`
  - [ ] broken link
  - [ ] obsolete参照
  - [ ] 権限矛盾

- [ ] **Important問題**: `___件`  
  - [ ] 表記不統一
  - [ ] 古い情報

- [ ] **Minor問題**: `___件`
  - [ ] 軽微な不整合

### 即座修正必須（Critical）
- [ ] **修正実施**
  - [ ] broken linkの修正
  - [ ] obsolete参照の削除・更新
  - [ ] CLAUDE.md修正

- [ ] **修正後再チェック**
  - [ ] 修正箇所の再検証
  - [ ] 連鎖影響確認

## 📝 記録・完了確認

### チェック結果記録
- [ ] **reports記録作成**
  - [ ] `documents/records/reports/REP-XXXX-weekly-document-integrity-check-YYYYMMDD.md`
  - [ ] 発見問題数: Critical `__`件, Important `__`件, Minor `__`件
  - [ ] 修正完了数: `__`件
  - [ ] 所要時間: `__`分

### status更新
- [ ] **documents/agents/status/clerk.md更新**
  - [ ] チェック実施記録
  - [ ] 結果サマリー
  - [ ] 次回予定日記録

## ✅ 完了基準

- [ ] **全チェック項目完了**
- [ ] **Critical問題0件**（修正済み）
- [ ] **記録完了**
- [ ] **次回予定確認**: `20__年__月__日（金）`

---

**重要**: このチェックリストで発見されたCritical問題は、必ず当日中に修正完了すること。Important以下は1週間以内の対応可。