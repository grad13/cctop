# Claude Code GitHub Actions

このディレクトリには、Claude Code GitHub Actionのワークフローが含まれています。

## 🤖 claude-code.yml
issueやPRで`@claude`メンションすると、Claudeが自動的に応答します。

### 使い方
- Issue/PRで質問: `@claude このバグの原因を調べてください`
- コードレビュー: `@claude このPRをレビューしてください`
- 実装依頼: `@claude この機能を実装してください`

## 🔄 claude-auto-issue.yml
優先度ラベル付きのissueを自動的に処理します。

### 設定
1. issueに優先度ラベルを付ける
   - `priority:high` - 高優先度
   - `priority:medium` - 中優先度
   - `priority:low` - 低優先度

2. 毎時実行され、未処理のissueを自動的に処理

## セットアップ

```bash
# セットアップスクリプトを実行
./tools/setup-claude-action.sh

# 必要なシークレットを設定
gh secret set ANTHROPIC_API_KEY
```

## 必要なGitHub Secrets
- `ANTHROPIC_API_KEY`: Anthropic APIキー（必須）
- `GITHUB_TOKEN`: 自動的に提供される