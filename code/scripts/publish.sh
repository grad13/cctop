#!/bin/bash
set -e

# dev ブランチにいることを確認
current=$(git branch --show-current)
if [ "$current" != "dev" ]; then
  echo "Error: must be on dev branch"
  exit 1
fi

# 未コミット変更がないことを確認
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Error: uncommitted changes exist. Commit or stash first."
  exit 1
fi

# master に切り替え
git checkout master

# dev から公開ファイルを同期（非公開ファイル以外すべて）
git checkout dev -- code/ documents/spec/ documents/screenshots/ \
  documents/CONTRIBUTING.md documents/event-filtering.md \
  README.md LICENSE .github/
# NOTE: .gitignore は同期しない（ブランチごとに個別管理）

# 変更があればコミット
if ! git diff --cached --quiet; then
  git commit -m "sync from dev"
fi

# push
git push origin master

# dev に戻る
git checkout dev
