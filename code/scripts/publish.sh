#!/bin/bash
set -e

# local ブランチにいることを確認
current=$(git branch --show-current)
if [ "$current" != "local" ]; then
  echo "Error: must be on local branch"
  exit 1
fi

# 未コミット変更がないことを確認
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Error: uncommitted changes exist. Commit or stash first."
  exit 1
fi

# master に切り替え
git checkout master

# local から公開ファイルを同期（非公開ファイル以外すべて）
git checkout local -- code/ documents/spec/ documents/screenshots/ \
  documents/CONTRIBUTING.md documents/event-filtering.md \
  README.md LICENSE .github/
# NOTE: .gitignore は同期しない（ブランチごとに個別管理）

# master の .gitignore に該当するファイルをステージから除外
ignored=$(git ls-files --cached --ignored --exclude-standard)
if [ -n "$ignored" ]; then
  echo "$ignored" | xargs git rm --cached -r
fi

# 変更があればコミット
if ! git diff --cached --quiet; then
  git commit -m "sync from local"
fi

# push
git push origin master

# local に戻る
git checkout local
