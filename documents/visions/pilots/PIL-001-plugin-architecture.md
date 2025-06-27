# PIL-001: プラグインアーキテクチャ

**作成日**: 2025年6月25日 10:00  
**更新日**: 2025年6月26日 18:00  
**作成者**: Architect Agent  
**対象バージョン**: -  
**関連仕様**: FUNC-000

## 📊 機能概要

cctopのイベント追跡システムを拡張し、ユーザーが独自の統計値や解析機能を追加できるプラグインアーキテクチャ。各プラグインは独立したSQLiteデータベースを持ち、メインDBの安定性を保ちながら柔軟な拡張を実現する。

**ユーザー価値**: 
- プロジェクト固有のメトリクス追跡
- チーム独自の解析ツール統合
- メインツールのアップデートに影響されない拡張性
- プラグイン単位での共有・配布が可能

## 🎯 機能境界

### ✅ **実行する**
- プラグイン登録・有効化・無効化システム
- 独立したプラグインDB（.cctop/plugins/*.db）
- イベントフック機構（create/modify/delete時の呼び出し）
- プラグイン間の依存関係管理
- 基本的なプラグインAPI提供
- プラグイン設定ファイル（plugin.json）

### ❌ **実行しない**
- プラグインのサンドボックス化（初期は信頼ベース）
- リモートプラグインリポジトリ
- プラグインの自動更新機能
- GUI設定画面（CLIベースで開始）
- プラグイン間の直接通信

## 📐 アーキテクチャ設計

### ディレクトリ構造
```
.cctop/
├── cctop.db              # メインDB
├── plugins/              # プラグインディレクトリ
│   ├── registry.json     # プラグイン登録情報
│   ├── git/              # gitプラグイン
│   │   ├── plugin.json   # プラグイン定義
│   │   ├── git.db        # プラグインDB
│   │   └── index.js      # プラグインコード
│   └── code-metrics/     # コード解析プラグイン
│       ├── plugin.json
│       ├── metrics.db
│       └── index.js
└── config.json           # メイン設定
```

### プラグイン定義（plugin.json）
```json
{
  "name": "git-stats",
  "version": "1.0.0",
  "description": "Git repository statistics",
  "author": "cctop-community",
  "cctop": {
    "minVersion": "0.2.0",
    "maxVersion": "1.0.0"
  },
  "hooks": {
    "onFileCreate": true,
    "onFileModify": true,
    "onFileDelete": false
  },
  "database": {
    "schema": "schema.sql",
    "migrations": ["migrations/"]
  },
  "config": {
    "trackMergeCommits": {
      "type": "boolean",
      "default": true,
      "description": "Track merge commit statistics"
    }
  }
}
```

## 🔌 プラグインAPI設計

### 基本インターフェース
```javascript
// プラグインが実装すべきインターフェース
class CctopPlugin {
  constructor(context) {
    this.db = context.db;           // プラグインDB接続
    this.config = context.config;   // プラグイン設定
    this.logger = context.logger;   // ログ出力
  }

  // イベントフック
  async onFileCreate(event) {
    // event: { fileId, filePath, inode, timestamp, size }
  }

  async onFileModify(event) {
    // 変更時の処理
  }

  async onFileDelete(event) {
    // 削除時の処理
  }

  // 統計値取得API
  async getMetrics(fileId) {
    // UIに表示する統計値を返す
  }
}
```

### メインシステムとの連携
```javascript
// cctop本体でのプラグイン呼び出し
class PluginManager {
  async triggerEvent(eventType, eventData) {
    for (const plugin of this.enabledPlugins) {
      if (plugin.hooks[eventType]) {
        try {
          await plugin[eventType](eventData);
        } catch (error) {
          this.logger.error(`Plugin ${plugin.name} failed:`, error);
          // プラグインエラーでメインは止めない
        }
      }
    }
  }
}
```

## 📊 プラグインDB設計例

### Git統計プラグイン
```sql
-- .cctop/plugins/git/git.db
CREATE TABLE git_events (
  event_id INTEGER PRIMARY KEY,  -- main cctop.db events.id
  branch TEXT NOT NULL,
  commit_hash TEXT,
  author_name TEXT,
  author_email TEXT,
  is_merge BOOLEAN DEFAULT FALSE,
  commit_message TEXT,
  timestamp INTEGER NOT NULL
);

CREATE TABLE git_stats (
  event_id INTEGER PRIMARY KEY,
  additions INTEGER DEFAULT 0,
  deletions INTEGER DEFAULT 0,
  files_changed INTEGER DEFAULT 0
);

CREATE INDEX idx_git_branch ON git_events(branch);
CREATE INDEX idx_git_author ON git_events(author_name);
```

### コード解析プラグイン
```sql
-- .cctop/plugins/code-metrics/metrics.db
CREATE TABLE file_metrics (
  event_id INTEGER PRIMARY KEY,
  language TEXT NOT NULL,
  total_lines INTEGER,
  code_lines INTEGER,
  comment_lines INTEGER,
  blank_lines INTEGER,
  complexity_score INTEGER
);

CREATE TABLE code_issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  issue_type TEXT NOT NULL,  -- 'todo', 'fixme', 'hack', etc
  line_number INTEGER,
  content TEXT,
  FOREIGN KEY (event_id) REFERENCES file_metrics(event_id)
);
```

## 🔄 プラグインライフサイクル

### 1. **インストール**
```bash
cctop plugin install git-stats
# 1. プラグインファイルを.cctop/plugins/にコピー
# 2. plugin.jsonを検証
# 3. schema.sqlを実行してDB作成
# 4. registry.jsonに登録
```

### 2. **有効化**
```bash
cctop plugin enable git-stats
# 1. プラグインをロード
# 2. 既存ファイルに対してcatchupスキャン（オプション）
# 3. イベントフック登録
```

### 3. **実行時**
```
ファイル変更検出
  ↓
メインDB記録
  ↓
PluginManager.triggerEvent()
  ↓
各プラグインの処理（並列）
  ↓
プラグインDB記録
```

### 4. **無効化・削除**
```bash
cctop plugin disable git-stats  # フック解除のみ
cctop plugin remove git-stats   # DB含めて削除
```

## 🧪 実装優先順位

### Phase 1: 基本機能
1. プラグインディレクトリ構造
2. plugin.json読み込み・検証
3. 基本的なイベントフック機構
4. プラグインDB接続管理

### Phase 2: 開発者向け機能
1. プラグイン開発用CLI
2. スキーママイグレーション
3. プラグインテストフレームワーク
4. サンプルプラグイン提供

### Phase 3: エコシステム
1. プラグイン間依存関係
2. プラグインバージョニング
3. パフォーマンスプロファイリング
4. プラグインマーケットプレイス

## 🚦 技術的検討事項

### パフォーマンス対策
- プラグイン呼び出しは非同期・並列実行
- タイムアウト設定（デフォルト5秒）
- プラグインDBへの接続プール管理

### セキュリティ考慮
- プラグインは.cctop/配下のみアクセス可
- ファイルシステムアクセスは読み取りのみ
- ネットワークアクセスは明示的な許可制

### エラーハンドリング
- プラグインエラーでメイン処理を止めない
- エラーログは分離して記録
- 自動リトライ機構（設定可能）

## 📋 設定例

### メイン設定での有効化
```json
// .cctop/config.json
{
  "plugins": {
    "enabled": ["git-stats", "code-metrics"],
    "autoInstall": false,
    "timeout": 5000
  }
}
```

### プラグイン個別設定
```json
// .cctop/plugins/git/config.json
{
  "trackMergeCommits": true,
  "ignoreBranches": ["tmp/*", "experiment/*"],
  "authorAliases": {
    "bob@company.com": "Bob Smith"
  }
}
```

## 🎯 成功指標

1. **拡張性**: 新しい統計値を1時間以内に追加可能
2. **パフォーマンス**: プラグイン5個でも遅延10ms以内
3. **安定性**: プラグインクラッシュがメインに影響しない
4. **採用率**: リリース後6ヶ月で10個の公開プラグイン