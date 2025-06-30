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
**ユーザー**: 「worktreeやcontainerはコード的なものなので、子gitで管理するべきだと思います」

- worktrees/とcontainers/が親gitに含まれていた
- しかし、これらは06-cctop/直下にあり、cctop/配下にない
- どう整理すべきか？

### 2. 独立Git化の実施
**Architect**: 「worktree/containers毎に子gitをそれぞれ用意しましょう」

```bash
# worktrees/とcontainers/をそれぞれ独立gitに
cd worktrees/ && git init
cd containers/ && git init
```

**理由**: 「履歴さえ辿れればいいので、一元的なgitにする意義は薄い」

### 3. .gitignoreの混乱と理解
**初期の.gitignore**:
```
../documents/
../passage/
../cctop/
```

**Architect**: 「相対パス参照は不要」として削除
**ユーザー**: 「だから最初それらを追加してたじゃん」
**議論の結果**: Gitは現在のディレクトリ以下しか管理できないので、親ディレクトリ参照は無意味と判明

### 4. 親gitの役割についての疑問
**ユーザー**: 「もう親gitもdocumentsに特化させたくなりますが、passageにはgit配置したくない」

**検討した選択肢**:
- Option 1: 現状維持（親git = documents + passage）
- Option 2: documentsも独立git化
- Option 3: passageを.gitignoreに追加

**結論**: passageの履歴も重要なので現状維持

### 5. git worktreeとマージの懸念
**ユーザー**: 「cctopとworktreeのgitを分けたが、worktreeでの作業結果をgit merge的にできない？」

**Architectの説明**:
- worktrees/の独立gitは「実験記録用」
- 実際のworktreeは06-cctopの外に作る
- それらはcctop/リポジトリの一部なのでマージ可能

### 6. ディレクトリ構造の再検討
**ユーザー**: 「なんで06-cctop/code/main&worktreeではなく、06-cctop/worktreesの方が望ましいの？」

**議論**:
```
# 案A: 現状（フラット）
06-cctop/
├── cctop/
└── worktrees/

# 案B: code/統一
06-cctop/
└── code/
    ├── main/
    └── worktrees/
```

**ユーザーの感想**: 「cctopとworktreeだけなら今のままでもいいけど、containersもあるんですよねぇ。３つあるならまとめたほうがいいのかなー」

### 7. containers/の本質的理解
**ユーザー**: 「containersは君を --dangerously-skip-permissions で動かすための施策の１つです」

**これで議論が決着**:
- containers/はプロダクトコードではない
- Claude実行環境というメタ的要素
- documents/やpassage/と同じカテゴリ

**最終的な理解**:
```
メタ要素（プロジェクト運営）:
- documents/
- passage/
- containers/

プロダクトコード:
- cctop/
- worktrees/
```

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
   - 最初worktrees/を独立gitにしてしまったのは誤り

2. **Gitの管理範囲の理解**
   - 各gitは現在のディレクトリ以下のみ管理可能
   - `../documents/`のような親ディレクトリ参照は無意味
   - 子gitから親gitの領域は触れない（これが安全性を保証）

3. **構造設計の原則**
   - 役割による自然なグループ化が重要
   - 「3つあるからまとめたい」という直感も大切
   - しかし、本質的な役割の違いを理解することがより重要
   - containers/の真の目的を理解して初めて適切な配置が決まった

4. **議論プロセスの重要性**
   - 最初の直感的な解決策が必ずしも正しくない
   - 行き違いや誤解を経て、より深い理解に到達
   - 「なぜ？」を問い続けることで本質が見える

## 📝 結論

現在のフラット構造が最適。各ディレクトリの役割が明確で、シンプルさと機能性のバランスが取れている。

---

**関連文書**:
- PLAN-20250630-001: Daemon-CLI分離実装計画
- BP-002: v0.3.0.0設計図
- HO-20250630-002: Git構造変更のメタルール整理依頼