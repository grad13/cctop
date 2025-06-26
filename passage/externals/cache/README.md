# Cache Directory - エージェント共有キャッシュ

**作成日**: 2025年6月16日 06:35  
**管理者**: すべてのエージェント  
**権限**: 読み書き可能  

## 📂 概要

このディレクトリは、inputs/内の大容量ファイルに対するキャッシュシステムです。エージェントが協調して情報を抽出・共有し、アクセス効率を大幅に向上させます。

## 🗂️ サブディレクトリ

### summaries/
- **用途**: ファイルの要約と検索履歴
- **形式**: Markdown（{元ファイル名}-summary.md）
- **内容**: 概要、主要トピック、検索履歴、重要な発見

### extracts/
- **用途**: 重要部分の詳細抽出
- **形式**: Markdown（{元ファイル名}-extract.md）
- **内容**: 詳細な引用、コード片、重要セクション

### metadata/
- **用途**: ファイルメタ情報と統計
- **形式**: JSON（{元ファイル名}-meta.json）
- **内容**: サイズ、アクセス履歴、キャッシュ状態、キーワード

## 📋 キャッシュ生成ルール

### 自動生成トリガー
1. **初回アクセス**: 256KB以上のファイル
2. **検索実行**: 新しい検索パターンは要約に追記
3. **更新検知**: 元ファイルのタイムスタンプ変更

### 命名規則
```
元ファイル: reddit-article.html
要約: summaries/reddit-article-summary.md
抽出: extracts/reddit-article-extract.md
メタ: metadata/reddit-article-meta.json
```

## 🔄 アクセスフロー

```
1. metadata/確認 → キャッシュ存在チェック
   ↓
2. summaries/確認 → 概要と検索履歴
   ↓
3. extracts/確認 → 必要に応じて詳細
   ↓
4. inputs/アクセス → 最終手段として元ファイル
```

## 📊 期待効果

- **速度**: 2500ms → 500ms（80%削減）
- **サイズ**: 379KB → 5-10KB（95%削減）
- **協調**: エージェント間での発見共有

## ⚠️ メンテナンス

- **30日ルール**: 最終アクセスから30日でアーカイブ候補
- **容量上限**: cache/全体で100MB
- **整合性**: 元ファイル削除時はキャッシュも削除

## 📁 ファイル一覧

### summaries/
- reddit-multi-agent-orchestration-summary.md
- talk-with-ChatGPT-about-mcp-summary.md
- reddit-kiss-yagni-solid-summary.md

### extracts/
- talk-with-ChatGPT-about-mcp-key-examples.md
- reddit-kiss-yagni-solid-extract.md

### metadata/
- reddit-multi-agent-orchestration-meta.json
- talk-with-ChatGPT-about-mcp-meta.json
- reddit-kiss-yagni-solid-meta.json

## 🔗 関連
- 元ファイル: ../inputs/
- 設計書: REP-0025