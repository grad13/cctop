#!/bin/bash
# meta: updated=2026-06-28 16:57 checked=-
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

# 公開対象パス
PUBLIC_PATHS="code documents/spec documents/screenshots CONTRIBUTING.md README.md LICENSE .github"

# master に切り替え
git checkout master

# master 側の現状を一旦削除（local での削除・移動を master へ伝播させる）
# git checkout <branch> -- <path> は追加・更新しかしないため、先に rm して
# local に存在するものだけを復元する「ミラー」方式にする。
git rm -r --quiet --ignore-unmatch $PUBLIC_PATHS

# local から公開サブセットを復元（local に存在するものだけ追加・更新）
git checkout local -- $PUBLIC_PATHS
# NOTE: .gitignore は同期しない（ブランチごとに個別管理）

# master の .gitignore に該当するファイルをステージから除外
ignored=$(git ls-files --cached --ignored --exclude-standard)
if [ -n "$ignored" ]; then
  echo "$ignored" | xargs git rm --cached -r
fi

# push 前プレビュー + 確認（削除を含む public master への push のため）
# 確認は必ず commit の前に置く: commit 後だと master HEAD が前進し
# 中断時の `git reset --hard HEAD` が無効化されるため。
echo "=== Changes to be published to master ==="
git diff --cached --stat
echo "========================================="
read -p "Proceed with publish (push to public master)? [y/N] " ans
if [ "$ans" != "y" ] && [ "$ans" != "Y" ]; then
  echo "Aborted."
  git reset --hard HEAD
  git checkout local
  exit 1
fi

# 変更があればコミット
if ! git diff --cached --quiet; then
  git commit -m "sync from local"
fi

# push
git push origin master

# local に戻る
git checkout local
