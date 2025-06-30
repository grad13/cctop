# REP-0167: Git構造設計に関する議論と決定

**作成日**: 2025年6月30日  
**作成者**: Architect Agent  
**カテゴリ**: アーキテクチャ設計  
**ステータス**: 完了  

## 📋 概要

v0.3.0.0のDaemon-CLI分離アーキテクチャ実装に向けて、プロジェクトのGit構造について議論し、最適な構造を決定した。特にworktrees/とcontainers/の独立Git化と、その配置について検討した。

## 🎯 議論の背景

1. v0.3.0.0でgit worktreeを使用した並列開発を計画
2. worktrees/とcontainers/のGit管理方法が不明確
3. ディレクトリ構造の最適化を検討

## 💭 議論の流れ

### 1. 初期の問題認識
- worktrees/とcontainers/が親gitに含まれていた
- コード的な要素は子git（cctop/）で管理すべきという認識

### 2. 独立Git化の実施
```bash
# worktrees/とcontainers/をそれぞれ独立gitに
cd worktrees/ && git init
cd containers/ && git init
```

### 3. git worktreeの仕組みの理解
- 当初：worktrees/を独立gitにしてしまった
- 問題：git worktreeはリポジトリの一部なので、独立gitだと機能しない
- 解決：worktrees/はgit管理せず、作業場所として使用

### 4. ディレクトリ構造の再検討

**検討した案**：
```
# 案1: 現状維持（フラット）
06-cctop/
├── documents/
├── passage/
├── containers/
├── cctop/
└── worktrees/

# 案2: code/配下に統一
06-cctop/
├── documents/
├── passage/
└── code/
    ├── main/       # 現cctop/
    ├── worktrees/
    └── containers/
```

### 5. containers/の役割の明確化
- 判明：containers/はClaude実行環境（--dangerously-skip-permissions）
- cctopの開発とは独立したメタ的要素

## 🎯 最終決定

### 採用した構造
```
06-cctop/               # 親git（documents + passage）
├── documents/          # プロジェクトドキュメント
├── passage/            # エージェント間連携
├── CLAUDE.md          
├── .gitignore         # cctop/, worktrees/, containers/を除外
│
├── cctop/             # 子git（プロダクトコード）
├── worktrees/         # gitなし（cctop/のworktree作業場所）
└── containers/        # 子git（Claude実行環境設定）
```

### 理由
1. **役割による自然な分類**
   - 上部：プロジェクト運営のメタ要素（documents, passage, containers）
   - 下部：実際のコード開発（cctop, worktrees）

2. **シンプルさの維持**
   - フラット構造で見通しが良い
   - 過度な階層化を避ける
   - 3-5個程度なら問題なく管理可能

3. **git worktreeの正しい使用**
   - worktrees/はgit管理しない
   - cctop/から`git worktree add ../worktrees/daemon`で使用

## 📊 影響と今後の作業

1. **Clerkへのhandoff作成済み**（HO-20250630-002）
   - P045の更新（複数子git対応）
   - メタルールへの反映

2. **v0.3.0.0実装時**
   ```bash
   cd cctop/
   git worktree add ../worktrees/daemon daemon-dev
   git worktree add ../worktrees/cli cli-dev
   git worktree add ../worktrees/shared shared-dev
   ```

## 🔍 学んだこと

1. **git worktreeの仕組み**
   - 同じリポジトリの別作業ツリー
   - 管理範囲は変わらない（親ディレクトリは含めない）
   - worktree先はgit管理すべきでない

2. **構造設計の原則**
   - 役割による自然なグループ化
   - 過度な階層化は避ける
   - 将来の拡張性も考慮（5個以上になったら再検討）

## 📝 結論

現在のフラット構造が最適。各ディレクトリの役割が明確で、シンプルさと機能性のバランスが取れている。

---

**関連文書**:
- PLAN-20250630-001: Daemon-CLI分離実装計画
- BP-002: v0.3.0.0設計図
- HO-20250630-002: Git構造変更のメタルール整理依頼