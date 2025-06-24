# FUNC-007: Post-Install Setup Foundation

**作成日**: 2025-06-24  
**作成者**: Architect Agent (Professional監査・更新版)  
**目的**: cctop v0.1.0.0 インストール後セットアップ仕様  
**BP-000準拠**: ✅ 完全整合済み (L98)  
**抽出元**: inst001-post-install-setup.md

## 概要
cctop v0.1.0.0のnpm install時に実行されるpostinstallスクリプトの動作仕様。FUNC-006と連携してconfig.jsonの自動作成を担当。

## 1. 基本動作

### 1.1 実行タイミング
- npm installコマンド実行後、自動的にpostinstallスクリプトが起動
- package.jsonのscripts.postinstallで定義

### 1.2 処理フロー
1. 設定ディレクトリ（~/.cctop）の存在確認
2. 設定ファイル（~/.cctop/config.json）の存在確認
3. データベースファイル（~/.cctop/activity.db）の存在確認（BP-000準拠）
4. ユーザーへの対話的確認
5. 必要に応じてファイル作成・初期化

## 2. 設定ファイル処理

### 2.1 設定ファイルパス
- **パス**: `~/.cctop/config.json`
- **形式**: JSON

### 2.2 デフォルト設定内容（BP-000準拠）
```json
{
  "version": "0.1.0",
  "monitoring": {
    "watchPaths": [],
    "excludePatterns": [
      "**/node_modules/**",
      "**/.git/**",
      "**/.DS_Store",
      "**/.cctop/**",
      "**/coverage/**",
      "**/*.log"
    ],
    "debounceMs": 100,
    "maxDepth": 10
  },
  "database": {
    "path": "~/.cctop/activity.db",
    "mode": "WAL"
  },
  "display": {
    "maxEvents": 20,
    "refreshRateMs": 100
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

## 🎯 v0.1.0.0実装ガイダンス

### Builder Agent向け実装要点
1. **自動監視対象追加**: 起動時の現在ディレクトリ自動追加機能（BP-000 L204-324準拠）
2. **FUNC-006連携**: 作成したconfig.jsonをFUNC-006で読み込み
3. **BP-000完全準拠**: activity.db、シンプル設定構造、必須項目のみ

### 重要な実装機能（BP-000準拠）
```javascript
// 自動監視対象追加機能（BP-000 L274-324）
async initialize(cliArgs = {}) {
  const targetDir = cliArgs.watchPath || process.cwd();
  const absoluteTargetDir = path.resolve(targetDir);
  
  const isAlreadyWatched = this.config.monitoring.watchPaths.some(watchPath => {
    return path.resolve(watchPath) === absoluteTargetDir;
  });
  
  if (!isAlreadyWatched) {
    const shouldAdd = await this.promptAddDirectory(absoluteTargetDir);
    if (shouldAdd) {
      this.config.monitoring.watchPaths.push(absoluteTargetDir);
      await this.save();
    }
  }
}
```

### 実装ファイル構成（BP-000準拠）
```
scripts/
└── postinstall.js       # メインスクリプト

package.json:
"scripts": {
  "postinstall": "node scripts/postinstall.js"
}
```

### FUNC-006との連携
- **作成**: postinstall時にconfig.json作成
- **読み込み**: 起動時にFUNC-006で設定読み込み
- **監視追加**: 起動時の対話的ディレクトリ追加

### 重要な設定項目
- **watchPaths**: 初期は空リスト（起動時に自動追加）
- **activity.db**: BP-000準拠のデータベース名
- **maxEvents**: 20（BP-000デフォルト）

---

**BP-000関連セクション**: L98（INST001参照）, L204-324（自動監視対象追加）  
**実装ファイル**: `scripts/postinstall.js`  

*関連FUNC文書*:
- `FUNC-006`: 基本設定管理（作成したconfig.json読み込み）
- `FUNC-001`: データベーススキーマ（activity.db作成）