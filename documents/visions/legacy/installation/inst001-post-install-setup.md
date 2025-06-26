# INST001: ポストインストールセットアップ仕様

## 概要
cctopのnpm install時に実行されるpostinstallスクリプトの動作仕様を定義する。

## 1. 基本動作

### 1.1 実行タイミング
- npm installコマンド実行後、自動的にpostinstallスクリプトが起動
- package.jsonのscripts.postinstallで定義

### 1.2 処理フロー
1. 設定ディレクトリ（~/.cctop）の存在確認
2. 設定ファイル（~/.cctop/config.json）の存在確認
3. データベースファイル（~/.cctop/events.db）の存在確認
4. ユーザーへの対話的確認
5. 必要に応じてファイル作成・初期化

## 2. 設定ファイル処理

### 2.1 設定ファイルパス
- **パス**: `~/.cctop/config.json`
- **形式**: JSON

### 2.2 デフォルト設定内容
```json
{
  "version": "0.1.0",
  "watchPaths": ["./"],
  "excludePatterns": [
    "**/node_modules/**",
    "**/.git/**",
    "**/dist/**",
    "**/build/**",
    "**/.next/**",
    "**/.nuxt/**",
    "**/.cache/**",
    "**/coverage/**",
    "**/.DS_Store",
    "**/*.log",
    "**/.env*",
    "**/.cctop/**"
  ],
  "includePatterns": [],
  "monitoring": {
    "debounceMs": 100,
    "maxDepth": 10,
    "followSymlinks": false
  },
  "display": {
    "maxEvents": 50,
    "refreshInterval": 100,
    "showTimestamps": true,
    "colorEnabled": true,
    "relativeTime": false,
    "mode": "all"
  },
  "database": {
    "path": "~/.cctop/events.db",
    "maxEvents": 10000,
    "cleanupInterval": 3600000,
    "walMode": true
  },
  "performance": {
    "maxMemoryMB": 256,
    "gcInterval": 60000
  }
}
```

### 2.3 設定ファイル作成ロジック
1. **新規インストール時**（ファイルが存在しない）
   - 設定ディレクトリを作成
   - デフォルト設定でconfig.jsonを作成
   - 「設定ファイルを作成しました: ~/.cctop/config.json」と通知

2. **既存ファイルがある場合**
   - ユーザーに確認プロンプトを表示
   - 「既に設定ファイルが存在します。設定を初期化しますか？ [y/N]: 」
   - yesの場合: デフォルト設定で上書き
   - noの場合: 既存設定を維持

## 3. データベース処理

### 3.1 データベースファイル
- **パス**: `~/.cctop/events.db`
- **形式**: SQLite3

### 3.2 データベース初期化ロジック
1. **新規インストール時**（ファイルが存在しない）
   - 何もしない（初回起動時に自動作成される）

2. **既存ファイルがある場合**
   - ユーザーに確認プロンプトを表示
   - 「既にデータベースが存在します。DBを初期化しますか？ [y/N]: 」
   - yesの場合: ファイルを削除（次回起動時に再作成）
   - noの場合: 既存データベースを維持

## 4. エラーハンドリング

### 4.1 権限エラー
- ~/.cctopディレクトリの作成権限がない場合
- エラーメッセージを表示してインストールを継続
- 「警告: 設定ファイルの作成に失敗しました。手動で作成してください。」

### 4.2 対話的入力のタイムアウト
- 30秒以内に応答がない場合はデフォルト（No）として処理

## 5. 実装ファイル
- **スクリプト**: `scripts/postinstall.js`
- **package.json**: `"postinstall": "node scripts/postinstall.js"`

## 6. 関連仕様
- [CONFIG001: 設定管理仕様](../config/config001-management.md)
- [DB001: データベーススキーマ設計](../database/db001-schema-design.md)