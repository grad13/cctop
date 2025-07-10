# @cctop/daemon

cctop用リアルタイムファイル監視デーモン - 高性能ファイル変更追跡システム

## 概要

daemonモジュールは、継続的なバックグラウンドファイル監視機能を提供し、ファイルシステムイベント（作成、変更、削除、移動、復元）を追跡してSQLiteデータベースに永続化します。仕様に準拠した包括的なファイルシステム監視を、本番環境対応の信頼性で実装しています。

## 機能

- **リアルタイムファイル監視**: chokidarによる効率的なファイルシステム監視
- **6種類のイベントタイプ**: ファイルライフサイクルの包括的な追跡
  - `find` - 初期スキャン中に発見されたファイル
  - `create` - 監視中に作成された新規ファイル
  - `modify` - ファイル内容またはメタデータの変更
  - `move` - ファイルの移動/名前変更（inodeトラッキングによるインテリジェント検出）
  - `delete` - ファイルの削除（移動検出のための保留状態付き）
  - `restore` - 削除後5分以内のファイル復元
- **スマート移動検出**: inodeトラッキングを使用した100ms以内のファイル移動検出
- **復元検出**: 削除されたファイルが5分以内に再出現した場合の識別
- **SQLite WALモード**: 高性能な並行読み書きアクセス
- **プロセス管理**: 単一インスタンス制御のためのPIDファイル管理
- **設定可能な除外**: 柔軟なパターンベースのファイル/ディレクトリ除外
- **ハートビート監視**: 定期的なヘルスチェックログ（間隔設定可能）
- **本番環境対応**: 包括的なエラーハンドリングと正常なシャットダウン

## インストール

```bash
# 依存関係のインストール
npm install

# デーモンのビルド
npm run build
```

## 使用方法

### コマンドラインインターフェース（推奨）

```bash
# 現在のディレクトリでデーモンを起動
cctop daemon start

# 実行中のデーモンを停止
cctop daemon stop

# デーモンの状態を確認
cctop daemon status

# UIを起動（デーモンが実行中である必要があります）
cctop ui
# または単に
cctop
```

### 機能

- **重複防止**: ディレクトリごとに1つのデーモンインスタンスのみ
- **自動クリーンアップ**: 古いPIDファイルは自動的にクリーンアップされます
- **正常なシャットダウン**: SIGKILLの前に10秒のタイムアウト付きSIGTERM
- **ステータス監視**: 詳細情報付きでデーモンが実行中かチェック

### 直接実行

```bash
# スタンドアロンモードでデーモンを起動
npm run daemon

# または Node.js で直接実行
node dist/index.js --standalone

# 親プロセス（例：CLI）から起動
node dist/index.js  # --standalone フラグなし
```

### プログラムからの使用

```javascript
// 親プロセスからデーモンを起動
const { spawn } = require('child_process');

const daemon = spawn('node', ['path/to/daemon/dist/index.js'], {
  stdio: 'pipe',
  detached: false
});

// デーモンの出力を処理
daemon.stdout.on('data', (data) => {
  console.log(`Daemon: ${data}`);
});
```

### プロセス管理

```bash
# デーモンが実行中か確認
cat .cctop/runtime/daemon.pid

# デーモンを正常に停止（代わりに cctop daemon stop を使用してください）
kill $(cat .cctop/runtime/daemon.pid)

# すべてのデーモンプロセスを強制停止
pkill -f "node.*daemon.*standalone"
```

## 設定

デーモンは設定システムを使用します：

### ディレクトリ構造

```
.cctop/
├── config/
│   └── daemon-config.json    # デーモン専用設定
├── data/
│   └── activity.db          # WALモード付きSQLiteデータベース
├── logs/
│   └── daemon.log          # ローテーション付きデーモンログ
├── runtime/
│   └── daemon.pid          # メタデータ付きプロセスIDファイル
└── temp/                   # 一時ファイル
```

### 設定ファイル

#### daemon-config.json
```json
{
  "monitoring": {
    "watchPaths": ["."],
    "excludePatterns": [
      "**/node_modules/**",
      "**/.git/**",
      "**/.*",
      "**/.cctop/**",
      "**/dist/**",
      "**/coverage/**",
      "**/build/**",
      "**/*.log",
      "**/.DS_Store"
    ],
    "debounceMs": 100,
    "maxDepth": 10,
    "moveThresholdMs": 100,
    "systemLimits": {
      "requiredLimit": 524288,
      "checkOnStartup": true,
      "warnIfInsufficient": true
    }
  },
  "daemon": {
    "pidFile": ".cctop/runtime/daemon.pid",
    "logFile": ".cctop/logs/daemon.log",
    "logLevel": "info",
    "heartbeatInterval": 30000,
    "autoStart": true,
    "maxRestarts": 3,
    "restartDelay": 5000
  },
  "database": {
    "writeMode": "WAL",
    "syncMode": "NORMAL",
    "cacheSize": 65536,
    "busyTimeout": 5000,
    "checkpointInterval": 300000
  }
}
```

### 設定読み込み順序

1. デフォルト設定（組み込み）
2. daemon-config.json（存在する場合）
3. コマンドライン引数（最優先）

## データベーススキーマ

デーモンは以下の構造でSQLiteデータベースに書き込みます：

### events テーブル
```sql
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,  -- find/create/modify/delete/move/restore
  file_path TEXT NOT NULL,
  directory TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_size INTEGER,
  timestamp TEXT NOT NULL,    -- ISO 8601形式
  inode_number INTEGER
);
```

### files テーブル
```sql
CREATE TABLE files (
  file_path TEXT PRIMARY KEY,
  current_size INTEGER,
  last_event_type TEXT,
  last_event_time TEXT,
  created_at TEXT,
  inode_number INTEGER
);
```

### aggregates テーブル
```sql
CREATE TABLE aggregates (
  file_path TEXT PRIMARY KEY,
  total_events INTEGER DEFAULT 0,
  total_creates INTEGER DEFAULT 0,
  total_modifies INTEGER DEFAULT 0,
  total_deletes INTEGER DEFAULT 0,
  total_moves INTEGER DEFAULT 0,
  total_restores INTEGER DEFAULT 0,
  first_seen TEXT,
  last_seen TEXT,
  first_size INTEGER,
  last_size INTEGER,
  max_size INTEGER DEFAULT 0,
  total_size_changes INTEGER DEFAULT 0
);
```

## アーキテクチャ

```
DaemonManager
├── ConfigManager         # 3層設定管理
├── LogManager           # ローテーション付き構造化ログ
├── PidManager           # プロセスIDファイル管理
├── SignalHandler        # シグナル処理（SIGTERM/SIGINT）
├── FileEventHandler     # イベント処理コア
│   └── MoveDetector    # 移動検出ロジック
└── Database            # WALモード付きSQLite
    ├── SchemaManager   # スキーマ初期化
    ├── EventOperations # イベントCRUD操作
    └── TriggerManager  # 自動集計
```

### イベント処理フロー

1. **ファイルシステムイベント** → chokidarが変更を検出
2. **イベントハンドラー** → FileEventHandlerがイベントを処理
3. **移動検出** → MoveDetectorが移動パターンをチェック
4. **データベース書き込み** → イベントをSQLiteに永続化
5. **トリガー実行** → 自動集計更新

## 開発

### テストの実行

```bash
# ユニットテストのみ実行（高速）
npm run test:unit

# 統合テストを分割実行（タイムアウト回避）
npm run test:integration:1  # basic、daemon、edge-cases
npm run test:integration:2  # find、move detection
npm run test:integration:3  # restore、startup-delete、statistics

# E2Eテスト実行
npm run test:e2e

# 特定のテストファイルを実行
npm test tests/unit/duplicate-prevention.test.ts

# 開発用ウォッチモード
npm run test:watch

# 注意: npm test と npm run test:integration はタイムアウト問題のため無効化されています
```

### テストアーキテクチャ

テストスイートは信頼性の高いプロセス管理のための包括的な`DaemonTestManager`を使用：

```javascript
// テストヘルパーの使用例
import { DaemonTestManager, setupDaemonTest, teardownDaemonTest } from './test-helpers';

beforeEach(async () => {
  await setupDaemonTest(testDir);
});

afterEach(async () => {
  await teardownDaemonTest(daemon, testDir);
});
```

### ビルド

```bash
# クリーンして再ビルド
npm run clean
npm run build

# 開発用ウォッチモード
npm run build:watch
```

### プロジェクト構造

```
modules/daemon/
├── src/
│   ├── config/           # 設定管理
│   │   └── DaemonConfig.ts
│   ├── events/           # イベント処理
│   │   ├── FileEventHandler.ts
│   │   └── MoveDetector.ts
│   ├── logging/          # ログシステム
│   │   └── LogManager.ts
│   ├── system/           # システムユーティリティ
│   │   ├── PidManager.ts
│   │   └── SignalHandler.ts
│   └── index.ts          # メインエントリーポイント
├── tests/
│   ├── suites/           # テストスイート
│   │   ├── basic-aggregates.test.ts
│   │   ├── edge-cases.test.ts
│   │   └── statistics-tests.test.ts
│   ├── daemon.test.ts
│   ├── find-detection.test.ts
│   ├── move-detection.test.ts
│   ├── restore-detection.test.ts
│   └── test-helpers.ts   # 共有テストユーティリティ
├── dist/                 # コンパイル済み出力
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## パフォーマンス特性

- **低CPU使用率**: 最小限のポーリングによるイベント駆動型アーキテクチャ
- **メモリ効率**: バッファリングなしのストリーミングイベント処理
- **高速起動**: 1秒未満の初期化時間
- **並行アクセス**: SQLite WALモードによる並列読み書き
- **スケーラブル**: 数千のファイルと高頻度の変更でテスト済み
- **単一インスタンス**: ディレクトリごとの自動重複デーモン防止

### リソース使用量

- **CPU**: アイドル時 < 1%、アクティブ監視時 < 5%
- **メモリ**: ベース約50MB、ファイル数に応じてスケール
- **ディスクI/O**: WALモードによる最適化されたバッチ書き込み
- **ファイルディスクリプタ**: Linux上での効率的なinotify使用

## エラーハンドリング

### 正常なシャットダウン
- SIGTERM/SIGINTシグナルでの適切なクリーンアップ
- 終了前の保留イベントのフラッシュ
- データベース接続のクリーンアップ
- PIDファイルの削除

### 自動復旧
- エラー時のファイルウォッチャー再起動
- 指数バックオフによるデータベース再接続
- 破損状態の検出と復旧
- 古いPIDファイルのクリーンアップ

### 包括的なログ記録
- 構造化JSONログ
- 設定可能なログレベル（debug/info/warn/error）
- 自動ログローテーション
- エラースタックトレース

## トラブルシューティング

### よくある問題

1. **デーモンが起動しない**
   ```bash
   # 既存のデーモンを確認
   cctop daemon status
   
   # デーモンが実行されていないのに起動が失敗する場合：
   cctop daemon stop  # 古いPIDファイルをクリーンアップ
   cctop daemon start
   
   # 手動でクリーンアップが必要な場合
   rm .cctop/runtime/daemon.pid
   ```

2. **CPU使用率が高い**
   - daemon-config.jsonの除外パターンを確認
   - node_modulesや.gitを監視していないことを確認
   - 高頻度の変更に対してdebounceMsを増やす

3. **データベースロックエラー**
   - デーモンインスタンスが1つだけ実行されていることを確認
   - .cctop/data/のファイル権限を確認
   - WALモードが有効になっていることを確認

4. **イベントが欠落している**
   - エラーのログファイルを確認
   - 設定の監視パスを確認
   - ファイルシステムの制限が適切であることを確認

### デバッグモード

```bash
# デバッグログを有効化
export DEBUG=cctop:*
npm run daemon

# リアルタイムでログを監視
tail -f .cctop/logs/daemon.log | jq '.'
```

### データベースの確認

```bash
# SQLiteデータベースに接続
sqlite3 .cctop/data/activity.db

# よく使うクエリ

# 最新のイベントを20件表示
sqlite> SELECT id, event_type, filename, datetime(timestamp) as time 
        FROM events 
        ORDER BY id DESC 
        LIMIT 20;

# イベントタイプ別の集計
sqlite> SELECT event_type, COUNT(*) as count 
        FROM events 
        GROUP BY event_type 
        ORDER BY count DESC;

# 特定のファイルの履歴を確認
sqlite> SELECT event_type, datetime(timestamp) as time, file_size 
        FROM events 
        WHERE filename = 'example.txt' 
        ORDER BY id DESC;

# アクティブなファイルの一覧（filesテーブル）
sqlite> SELECT file_path, current_size, last_event_type, 
        datetime(last_event_time) as last_modified 
        FROM files 
        ORDER BY last_event_time DESC 
        LIMIT 20;

# ファイル別の統計情報（aggregatesテーブル）
sqlite> SELECT file_path, total_events, total_modifies, 
        max_size, datetime(last_seen) as last_activity 
        FROM aggregates 
        ORDER BY total_events DESC 
        LIMIT 20;

# 移動されたファイルの検出
sqlite> SELECT * FROM events 
        WHERE event_type = 'move' 
        ORDER BY id DESC 
        LIMIT 10;

# 復元されたファイルの検出
sqlite> SELECT * FROM events 
        WHERE event_type = 'restore' 
        ORDER BY id DESC 
        LIMIT 10;

# 今日のイベント数
sqlite> SELECT COUNT(*) as today_events 
        FROM events 
        WHERE date(timestamp) = date('now');

# ファイルサイズの変化を追跡
sqlite> SELECT e1.filename, 
        e1.file_size as old_size, 
        e2.file_size as new_size,
        (e2.file_size - e1.file_size) as size_diff
        FROM events e1
        JOIN events e2 ON e1.file_path = e2.file_path
        WHERE e1.id < e2.id
        AND e1.event_type IN ('create', 'modify')
        AND e2.event_type = 'modify'
        ORDER BY e2.id DESC
        LIMIT 20;

# データベースの統計情報
sqlite> SELECT name, COUNT(*) as row_count 
        FROM sqlite_master 
        LEFT JOIN (
            SELECT 'events' as tbl, COUNT(*) as cnt FROM events
            UNION ALL
            SELECT 'files', COUNT(*) FROM files
            UNION ALL
            SELECT 'aggregates', COUNT(*) FROM aggregates
        ) ON name = tbl
        WHERE type = 'table' AND name IN ('events', 'files', 'aggregates')
        GROUP BY name;

# SQLiteを終了
sqlite> .quit
```

### ワンライナーでの確認

```bash
# 最新イベント10件を表示
sqlite3 .cctop/data/activity.db "SELECT event_type, filename, datetime(timestamp) FROM events ORDER BY id DESC LIMIT 10"

# 今日のイベント数を確認
sqlite3 .cctop/data/activity.db "SELECT COUNT(*) as '今日のイベント数' FROM events WHERE date(timestamp) = date('now')"

# イベントタイプ別の統計
sqlite3 -column -header .cctop/data/activity.db "SELECT event_type, COUNT(*) as count FROM events GROUP BY event_type"

# データベースのサイズを確認
ls -lh .cctop/data/activity.db*
```

## APIリファレンス

### コマンドライン引数

- `--standalone`: 独立したバックグラウンドプロセスとして実行
- `--config <path>`: カスタム設定ファイルパス
- `--debug`: デバッグログを有効化
- `--version`: バージョン情報を表示

### 環境変数

- `CCTOP_CONFIG_PATH`: デフォルト設定ディレクトリをオーバーライド
- `CCTOP_LOG_LEVEL`: ログレベルを設定（debug/info/warn/error）
- `DEBUG`: デバッグ出力を有効化（例：`DEBUG=cctop:*`）

## 貢献

ガイドラインについては、メインプロジェクトのCONTRIBUTING.mdを参照してください。

## ライセンス

MITライセンス - 詳細はプロジェクトルートのLICENSEファイルを参照してください。