# PLAN-20250624-005: Git管理分離ルール化実装プラン

**作成日**: 2025年6月24日  
**作成者**: Clerk Agent  
**関連**: REP-0096, Git管理分離の制度化  
**実装期間**: 2-3日（段階的実装）

## プラン概要

Git管理の分離をプロジェクト標準として確立し、明確なルール・プロトコル・ガイドラインとして制度化する包括的実装プラン。

## 実装フェーズ

### 🎯 Phase A: ルール策定・文書化（Day 1）

#### A1. メタプロトコル策定
**新規作成**: `documents/rules/meta/protocols/p045-git-management-separation-protocol.md`

**内容**:
```markdown
# P045: Git管理分離プロトコル

## 基本原則
1. **親git (06-cctop/)**: プロジェクト管理・ドキュメント・エージェント協調
2. **子git (cctop/)**: ツール開発・ソースコード・テスト

## 判定ルール
- documents/, passage/, CLAUDE.md, VERSIONs/ → 親git
- cctop/src/, cctop/test/, cctop/package.json → 子git
- 迷った場合: ファイルパスで機械的判定

## Agent別責任
- Builder/Validator: 子git中心（コード作業）
- Architect/Clerk/Inspector: 親git中心（ドキュメント作業）
```

#### A2. チェックリスト策定
**新規作成**: `documents/rules/meta/checklists/chk006-git-operation-verification.md`

**内容**:
```markdown
# CHK006: Git操作前確認チェックリスト

## コミット前必須確認
- [ ] 正しいディレクトリでgit操作中か？
- [ ] ファイルパスがgit責任範囲内か？
- [ ] P045判定ルールに従っているか？
- [ ] 他git管理ファイルを誤って含んでいないか？
```

#### A3. CLAUDE.md大幅更新
**対象**: `/Users/takuo-h/Workspace/Code/06-cctop/CLAUDE.md`

**追加セクション**:
```markdown
### 🔀 Git管理の完全分離（P045準拠）

**判定ルール**:
- **親git (06-cctop/)**: documents/, passage/, CLAUDE.md, VERSIONs/, archives/
- **子git (cctop/)**: src/, test/, package.json, jest.config.js, scripts/

**作業前必須確認**:
1. 現在のディレクトリ確認: `pwd`
2. 対象ファイルのパス確認
3. CHK006チェックリスト実行
4. 正しいgitで作業開始

**Agent別ガイドライン**:
- Builder/Validator: 主に子git、ドキュメント更新時のみ親git
- Architect/Clerk/Inspector: 主に親git、コード確認時のみ子git読み取り
```

### 🔧 Phase B: インフラ整備（Day 1-2）

#### B1. 親git初期化による完全分離
**親git初期化アプローチ**:
```bash
# 既存git履歴を完全削除（クリーンスタート）
rm -rf .git
git init

# 最初に.gitignore設定（cctop/完全除外）
echo "cctop/" >> .gitignore
echo ".DS_Store" >> .gitignore

# 管理対象のみ明示的追加
git add documents/
git add passage/
git add CLAUDE.md
git add VERSIONs/
git add .gitignore

# 新体制での初回コミット
git commit -m "feat: initialize project management repository with complete separation"
```

**子git (.gitignore)**:
```gitignore
# 親git管理領域を完全除外
../documents/
../passage/
../CLAUDE.md
../VERSIONs/

# Node.js標準除外
node_modules/
*.log
coverage/
.env
```

**初期化による利点**:
- ✅ 既存追跡ファイル（bin/cctop等）の問題完全解決
- ✅ 過去の混在履歴による混乱の排除
- ✅ 物理的な境界違反防止（.gitignoreで完全ブロック）
- ✅ クリーンな新体制でのスタート

#### B2. README.md分離・整備
1. **親git用README.md**: プロジェクト全体説明
2. **子git用README.md**: cctopツール専用説明
3. **相互リンク**: それぞれから相手への参照

#### B3. Git Hook設定（不要化）
**親git初期化により不要**:
- ✅ .gitignoreでcctop/が完全除外済み
- ✅ 物理的にcctopファイルを追加不可能
- ✅ Git Hookによる検出が不要な状態を実現

**オプション検討**: 将来的な予防的措置として実装可能

### 📋 Phase C: ワークフロー確立（Day 2-3）

#### C1. Agent Roleファイル更新
**対象**: `documents/agents/roles/*.md`

**各ファイルに追加**:
```markdown
## Git操作方針（P045準拠）

### [Agent名]の主要git
- **メイン**: [親git/子git]
- **サブ**: [読み取りのみ/限定的]

### 作業開始時確認
1. CHK006チェックリスト実行
2. 正しいディレクトリ・git確認
3. P045判定ルール適用
```

#### C2. Handoffsテンプレート更新
**対象**: `passage/handoffs/shared/templates/`

**Builder↔Validator Template更新**:
- Git操作指示の明確化
- どちらのgitでコミットすべきかの指示追加

#### C3. 違反時対応プロトコル
**新規作成**: `documents/rules/meta/protocols/p046-git-boundary-violation-response.md`

**内容**:
- 境界違反検出時の対応手順
- 修正方法（cherry-pick, reset等）
- 再発防止策

### 🔍 Phase D: 検証・最適化（Day 3）

#### D1. 実環境テスト
1. **各Agentでの実作業シミュレーション**
2. **境界ケースでの判定確認**
3. **チェックリスト有効性検証**

#### D2. ドキュメント最終調整
1. **不明確な表現の修正**
2. **具体例の追加**
3. **FAQ形式での補足**

#### D3. 全体整合性確認
1. **P045と他プロトコルの整合性**
2. **CHK006と既存チェックリストの統合**
3. **Agent Role定義との一貫性**

## 実装詳細スケジュール

### Day 1 (2-3時間)
- **AM**: Phase A - ルール文書策定
- **PM**: Phase B1-B2 - 親git初期化・完全分離実装

### Day 2 (2-3時間)  
- **AM**: Phase C1 - Agent Role更新・ワークフロー確立
- **PM**: Phase C2-C3 - Template・違反対応策定

### Day 3 (1-2時間)
- **AM**: Phase D - 検証・最適化
- **PM**: 全体レビュー・微調整

## 成功指標

### ✅ 定量指標
- **プロトコル策定**: P045, P046完成
- **チェックリスト**: CHK006完成  
- **Agent Role更新**: 5ファイル全更新
- **Template更新**: 最低2テンプレート

### ✅ 定性指標
- **迷いゼロ**: どちらのgitか即座に判定可能
- **エラー予防**: 境界違反の事前検出
- **Agent適応**: 各Agentが自然に適切なgit選択
- **将来拡張性**: 新ツール追加時の適用容易性

## リスク管理

### ⚠️ 実装リスク
1. **移行期混乱**: 一時的なgit選択ミス
   - **対策**: CHK006チェックリスト徹底
2. **学習コスト**: Agent・ユーザーの適応期間
   - **対策**: 具体例豊富なガイドライン
3. **初期化によるデータ消失**: git履歴の完全削除
   - **対策**: documents/, passage/, VERSIONs/等の重要データは保持済み

### 🛠️ 技術リスク
1. **初期化失敗**: 親git再構築時のトラブル
   - **対策**: バックアップ確認・段階的実行
2. **.gitignore設定ミス**: 重要ファイルの除外
   - **対策**: 明示的なgit add による管理対象の明確化

### ✅ **親git初期化により解決されるリスク**
- ✅ 既存追跡ファイルによる境界違反（bin/cctop等）
- ✅ 過去の混在コミットによる混乱
- ✅ Git Hook設定の複雑さ・誤動作リスク

## 完了後の継続管理

### 📊 モニタリング
- **月次**: 境界違反ケースの集計・分析
- **四半期**: ルール有効性の評価・改善

### 🔄 継続改善
- **新ケース発見時**: FAQ・具体例の追加
- **Agent feedback**: ルール・チェックリストの改良
- **ツール追加時**: 境界定義の拡張

---

**実装承認後、Phase Aから段階的に実行開始します。各フェーズ完了時にユーザー確認・承認を取りながら進行予定。**