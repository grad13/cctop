# REP-0159: Git Worktree Implementation Report

**作成日**: 2025-06-30  
**作成者**: Builder Agent  
**カテゴリ**: 実装・作業記録  
**関連**: クラッシュ問題調査（REP-0158）  

## 概要

システムクラッシュ問題の並行検証環境として、Git Worktreeを導入した実装記録。3つの異なるコミット状態を同時に検証可能な環境を構築。

## 背景

### 問題状況
- ターミナル（Terminal.app、iTerm2）とブラウザ（Firefox）の全体クラッシュ問題が発生
- 二分探索により、コミット2b47119（DatabaseManagerリファクタリング）で問題が導入されたことを特定
- 安全な環境で並行検証する必要性が発生

### Git Worktreeの選定理由
1. **並行検証**: 複数のコミット状態を同時に実行可能
2. **安全性**: メイン環境を破壊せずに問題のあるコードを実行
3. **効率性**: ブランチ切り替えなしで即座に環境を切り替え
4. **軽量性**: 完全なクローンより軽量で高速

## 実装内容

### ディレクトリ構造
```
06-cctop/
├── cctop/                    # メイン開発環境
├── worktrees/               # Git Worktree環境
│   ├── safe-49eb90f/        # 最後の安全なコミット
│   ├── crash-2b47119/       # クラッシュが導入されたコミット
│   └── current-master/      # 最新のmaster（修正済み）
└── worktrees/README.md      # 使用方法ドキュメント
```

### セットアップ手順
```bash
# 1. worktreesディレクトリ作成
mkdir -p worktrees

# 2. 各worktree作成
git worktree add ../worktrees/safe-49eb90f 49eb90f
git worktree add ../worktrees/crash-2b47119 2b47119
git worktree add ../worktrees/current-master

# 3. 各環境でnode_modules構築
cd worktrees/safe-49eb90f && npm install
cd worktrees/crash-2b47119 && npm install
cd worktrees/current-master && npm install
```

### 検証環境の特徴

| Worktree | コミット | 状態 | 用途 |
|----------|---------|------|------|
| safe-49eb90f | 49eb90f | 正常動作 | 基準となる安全な環境 |
| crash-2b47119 | 2b47119 | クラッシュあり | 問題の再現・調査 |
| current-master | master | 修正済み | 修正の有効性検証 |

## 活用方法

### 基本的な使い方
```bash
# 各環境で並行実行
cd worktrees/safe-49eb90f && npm start     # Terminal 1
cd worktrees/crash-2b47119 && npm start    # Terminal 2
cd worktrees/current-master && npm start   # Terminal 3
```

### 推奨される活用パターン

1. **デバッグ専用環境**
   - メインで開発を継続しながら、別環境で問題を調査
   - ログ追加や実験的な変更を安全に実施

2. **A/Bテスト環境**
   - 3つのターミナルを並べて挙動を比較
   - パフォーマンスや動作の違いを視覚的に確認

3. **安全な実験場**
   - 破壊的な変更をメイン環境に影響なくテスト
   - 失敗してもworktreeを削除すれば完全にクリーン

### 実践的なテクニック

#### VSCode統合
```bash
# 各worktreeを別ウィンドウで開く
code worktrees/safe-49eb90f
code worktrees/crash-2b47119
code worktrees/current-master
```

#### エイリアス設定
```bash
# ~/.zshrc or ~/.bashrc
alias wt='git worktree'
alias wtl='git worktree list'
alias wts='cd ~/Workspace/Code/06-cctop/worktrees/safe-49eb90f'
alias wtc='cd ~/Workspace/Code/06-cctop/worktrees/crash-2b47119'
alias wtm='cd ~/Workspace/Code/06-cctop/worktrees/current-master'
```

## 成果と効果

### 即座の成果
1. **安全な検証環境**: クラッシュする環境を隔離して実行可能
2. **効率的な比較**: 3つの状態を同時に確認可能
3. **迅速な切り替え**: ディレクトリ移動だけで環境変更

### 期待される効果
1. **デバッグ効率の向上**: 並行して複数の仮説を検証
2. **リスクの最小化**: メイン環境を保護しながら実験
3. **ドキュメント化の促進**: 各バージョンの挙動を記録しやすい

## 今後の活用可能性

1. **バグの二分探索**
   ```bash
   git worktree add worktrees/bisect-test <commit>
   # 検証後
   git worktree remove worktrees/bisect-test
   ```

2. **並行開発**
   - 新機能開発用worktree
   - ホットフィックス用worktree
   - リリース準備用worktree

3. **パフォーマンステスト**
   - 異なるバージョン間でのベンチマーク実行
   - リグレッションテストの自動化

## 注意事項

- worktree内の変更は独立しているが、同じリポジトリを共有
- 不要になったworktreeは`git worktree remove`で削除
- 定期的に`git worktree prune`で不要なエントリをクリーンアップ

## 関連ドキュメント

- `/Users/takuo-h/Workspace/Code/06-cctop/worktrees/README.md` - 使用方法詳細
- 二分探索結果（Builder Status内に記録）
- クラッシュ問題修正記録（今後作成予定）

## キーワード
Git Worktree, 並行検証, クラッシュ調査, デバッグ環境, 環境分離, 二分探索, 
システムクラッシュ, ターミナルクラッシュ, 検証環境構築, 開発効率化,
safe-49eb90f, crash-2b47119, current-master, npm, node_modules,
A/Bテスト, VSCode統合, エイリアス設定, リスク最小化, デバッグ効率