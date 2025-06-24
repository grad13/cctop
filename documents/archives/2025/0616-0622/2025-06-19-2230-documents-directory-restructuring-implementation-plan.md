---
**アーカイブ情報**
- アーカイブ日: 2025-06-19
- アーカイブ週: 2025/0616-0622
- 元パス: documents/records/reports/
- 検索キーワード: Documentsディレクトリ再編計画, 意味的グループ化再編成, L2-L3明確分離, エージェント関連ファイル統合, agents-roles-status統合, techs-roadmaps-specifications統合, rules-dominants-meta統合, archives-L3長期保存, DDD2-P016-P044関連, 将来拡張性確保, 技術文書ルール文書分類, 視覚的分離実現, records-bugs-reports-incidents構造, 実施計画書タイプ

---

# REP-0085: Documents ディレクトリ再編計画書

**作成日**: 2025年6月19日  
**作成者**: Clerk  
**タイプ**: 実施計画書  
**関連**: DDD2、P016、P044

## 概要

documents/ディレクトリを意味的グループ化に基づいて再編成し、L2/L3の明確な分離と将来の拡張性を確保する。

## 背景

### 現状の問題
- roles/とstatus/が離れている
- dominants/とmeta/が同階層にない
- L3（archive）の位置づけが曖昧
- 意味的グループ化が不明確

### 期待効果
- エージェント関連ファイルの統合
- 技術文書・ルール文書の明確な分類
- L2/L3の視覚的分離
- 将来の拡張性確保

## 再編構造

### 変更前
```
documents/
├── dominants/
├── meta/
├── roles/
├── status/
├── roadmaps/
├── specifications/
├── records/
│   ├── bugs/
│   ├── reports/
│   └── incidents/
├── archive/
├── analysis/
└── archive/
```

### 変更後
```
documents/
├── agents/        # 全エージェント
│   ├── roles/
│   └── status/
├── techs/         # Architect主管
│   ├── roadmaps/
│   └── specifications/
├── rules/         # Clerk主管
│   ├── dominants/
│   └── meta/
├── records/       # 全員（L2）
│   ├── bugs/
│   ├── reports/
│   └── incidents/
└── archives/      # 全員（L3）
    └── [既存構造維持]
```

## 実施手順

### Phase 1: 準備（10分）

#### 1.1 現状バックアップ
```bash
# Git状態確認
git status
git add -A
git commit -m "chore: ディレクトリ再編前の状態保存"
git tag "before-restructure-2025-06-19"
```

#### 1.2 作業ディレクトリ作成
```bash
# 新ディレクトリ作成
mkdir -p documents/agents
mkdir -p documents/techs
mkdir -p documents/rules
# archives は archive をリネーム
```

#### 1.3 実施記録ファイル作成
本ファイルに実施状況を逐次記録

### Phase 2: ディレクトリ移動（20分）

#### 2.1 agents/配下への移動
```bash
# roles/とstatus/を移動
mv documents/roles documents/agents/
mv documents/status documents/agents/
```
- [ ] roles/移動完了
- [ ] status/移動完了

#### 2.2 techs/配下への移動
```bash
# roadmaps/とspecifications/を移動
mv documents/roadmaps documents/techs/
mv documents/specifications documents/techs/
```
- [ ] roadmaps/移動完了
- [ ] specifications/移動完了

#### 2.3 rules/配下への移動
```bash
# dominants/とmeta/を移動
mv documents/dominants documents/rules/
mv documents/meta documents/rules/
```
- [ ] dominants/移動完了
- [ ] meta/移動完了

#### 2.4 archives/へのリネーム
```bash
# archive/をarchives/にリネーム
mv documents/archive documents/archives
```
- [ ] archives/リネーム完了

#### 2.5 その他のディレクトリ
```bash
# analysis/は一旦そのまま（後で判断）
# records/は変更なし
```

### Phase 3: パス参照更新（40分）

#### 3.1 更新対象ファイルのリスト化
```bash
# 影響を受けるファイルを検索
grep -r "documents/status" . --include="*.md" > path_updates_status.txt
grep -r "documents/roles" . --include="*.md" > path_updates_roles.txt
grep -r "documents/dominants" . --include="*.md" > path_updates_dominants.txt
grep -r "documents/meta" . --include="*.md" > path_updates_meta.txt
grep -r "documents/roadmaps" . --include="*.md" > path_updates_roadmaps.txt
grep -r "documents/specifications" . --include="*.md" > path_updates_specs.txt
grep -r "documents/archive" . --include="*.md" > path_updates_archive.txt
```

#### 3.2 CLAUDE.md更新
最重要ファイルから更新：
- [ ] status/参照 → agents/status/
- [ ] roles/参照 → agents/roles/
- [ ] dominants/参照 → rules/dominants/
- [ ] meta/参照 → rules/meta/
- [ ] archive/参照 → archives/

#### 3.3 DDD2更新
- [ ] 階層構造の説明を新構造に合わせる
- [ ] L3をarchives/として明記

#### 3.4 プロトコル類更新
- [ ] P016（権限マトリックス）
- [ ] P044（L1→L2移行）
- [ ] その他影響を受けるプロトコル

#### 3.5 README.md更新
- [ ] documents/README.md
- [ ] 各サブディレクトリのREADME.md

### Phase 4: 検証（15分）

#### 4.1 構造確認
```bash
# 新構造の確認
tree documents/ -L 2
```

#### 4.2 参照整合性確認
```bash
# 残存する旧パスがないか確認
grep -r "documents/status[^/]" . --include="*.md"
grep -r "documents/roles[^/]" . --include="*.md"
grep -r "documents/dominants[^/]" . --include="*.md"
grep -r "documents/meta[^/]" . --include="*.md"
grep -r "documents/archive[^/s]" . --include="*.md"
```

#### 4.3 動作確認
- [ ] 各エージェントのstatus/roles参照が正常
- [ ] プロトコル参照が正常
- [ ] DDD2の階層説明が正確

### Phase 5: 完了処理（10分）

#### 5.1 Git記録
```bash
git add -A
git commit -m "feat: documentsディレクトリ再編完了 - L2/L3分離と意味的グループ化"
git tag "after-restructure-2025-06-19"
```

#### 5.2 通知準備
- [ ] 各エージェントへの通知文書作成
- [ ] 主要な変更点のサマリー作成

## リスク管理

### 想定されるリスク
1. **パス参照の見落とし**
   - 対策: grep検索を複数回実施
   - ロールバック: git tagを利用

2. **権限設定の不整合**
   - 対策: P016を慎重に更新
   - 確認: 各エージェントでテスト

3. **作業中断**
   - 対策: 本計画書で進捗管理
   - 再開: チェックリストから継続

### ロールバック手順
```bash
# 問題発生時
git checkout before-restructure-2025-06-19
# または
git revert HEAD
```

## 実施記録

### 開始時刻: 2025年6月19日 22:30
### 終了時刻: 2025年6月19日 23:15（予定）

### Phase 1 実施記録
- [x] バックアップ完了: 22:31 - git tag "before-restructure-2025-06-19"
- [x] ディレクトリ作成完了: 22:32

### Phase 2 実施記録
- [x] agents/作成: 22:33 - roles/, status/移動完了
- [x] techs/作成: 22:34 - roadmaps/, specifications/移動完了
- [x] rules/作成: 22:35 - dominants/, meta/移動完了
- [x] archives/リネーム: 22:35 - archive/ → archives/完了

### Phase 3 実施記録
- [x] CLAUDE.md更新: 22:40 - agents/, rules/パス更新完了
- [x] DDD2更新: 22:45 - 新構造反映・P044統合完了
- [x] プロトコル更新: 22:50 - P044策定・参照更新完了

### Phase 4 実施記録
- [x] 構造確認: 23:00 - 新ディレクトリ構造確認済み
- [x] 参照確認: 23:05 - 55件の残存参照を発見・sed一括修正完了
- [x] 動作確認: 23:10 - 新パス構造確認済み（archives/の履歴記録除く）

### Phase 5 実施記録
- [x] Git記録: 23:15 - コミット59653ab・タグafter-restructure-2025-06-19作成完了
- [x] 完了: 23:15 - ディレクトリ再編全工程完了 

## 問題発生時の記録

### 問題1
- 内容: 
- 対処: 
- 結果: 

### 問題2
- 内容: 
- 対処: 
- 結果: 

---

**注**: 本計画書は作業の実施記録を兼ねる。各ステップ完了時にチェックボックスをマークし、問題発生時は即座に記録すること。