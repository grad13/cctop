# Handoff: Git Worktree利用方針の追加依頼

**From**: Architect  
**To**: Clerk  
**Date**: 2025年6月30日  
**Priority**: High  
**Type**: Role定義更新

## 依頼内容

Builder/Validatorのrole定義にGit Worktree利用方針を追加してください。

## 追加場所

1. `documents/agents/roles/builder.md` - Git操作方針（P045準拠）セクションの後
2. `documents/agents/roles/validator.md` - Git操作方針（P045準拠）セクションの後

## 追加する内容

```markdown
## Git Worktree利用方針（v0.3.0.0以降）

### 基本方針
- **作業場所**: `06-cctop/worktrees/`配下で並行開発
- **目的**: 大規模変更時の独立した作業環境確保

### worktree作成ルール
1. **命名**: `worktrees/{version}-{component}/`
   - 例: `worktrees/v030-daemon/`, `worktrees/v030-cli/`
2. **ブランチ**: `feature/{version}-{component}`
   - 例: `feature/v030-daemon`, `feature/v030-cli`

### 基本コマンド
```bash
# 作成
git worktree add worktrees/v030-daemon -b feature/v030-daemon

# 移動
cd worktrees/v030-daemon/

# 削除（マージ後）
git worktree remove worktrees/v030-daemon
```

### 注意事項
- 各worktreeは独立したgit管理
- CHK006確認時はworktree内での作業場所に注意
- マージ完了後は速やかにworktree削除
```

## 背景

v0.3.0.0のDaemon-CLI分離実装において、並列開発を効率的に進めるためのworktree運用方法を明確化する必要があります。

## 期待される効果

- Builder/Validatorが統一された方法でworktreeを使用
- 並列開発時の混乱防止
- Git操作の一貫性確保