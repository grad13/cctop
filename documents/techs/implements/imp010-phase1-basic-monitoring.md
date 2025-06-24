# cctop v4.0.0 Phase 1: 基本ファイル監視詳細計画

**Document ID**: ip009-phase1-basic-monitoring  
**Date**: 2025-06-22  
**Created**: 2025-06-22 23:30  
**Author**: Builder Agent  
**Status**: Active  
**Purpose**: Phase 1の実装詳細計画（RDD方式によるMVP）

## 概要

cctop v4.0.0の最初のPhaseとして、chokidarを使用したファイル監視MVPを実装する。RDD（実動作駆動開発）の原則に従い、実動作確認を最優先とし、テストは補助的役割とする。

## 目標

chokidarを使用したリアルタイムファイル監視と組み込み初回スキャン機能のMVP実装

## データフロー

```
[chokidar] ---> [DB] ---> [console] ---> [ユーザー]
     |           |           |             |
ファイル変更   永続化保存   表示        操作・確認
イベント検出                           (MVP: 表示確認のみ)
```

## 実装要件

### 必須機能
1. **chokidarによるファイル監視**
   - ファイル追加（add）
   - ファイル変更（change）
   - ファイル削除（unlink）
   - ディレクトリ追加（addDir）
   - ディレクトリ削除（unlinkDir）

2. **初回スキャン機能**
   - 起動時の既存ファイル検出
   - ファイル数・ディレクトリ数の集計
   - スキャン時間の測定

3. **CLI引数処理**
   - 監視対象パス指定
   - 基本的なオプション（--help等）

4. **ファイル変更イベントをリアルタイムでコンソールに流す基本的な表示機能**
   - タイムスタンプ付きイベント表示
   - 読みやすい形式での出力

5. **RDD方式でのテスト実装**
   - 実動作確認を最優先
   - テストは補助的役割

## アーキテクチャ設計

### ディレクトリ構造
```
cctop/
├── bin/
│   └── cctop                    # CLI エントリポイント
├── src/
│   ├── config/
│   │   └── default-config.js    # デフォルト設定
│   ├── database/
│   │   └── database-manager.js  # SQLite管理
│   ├── monitors/
│   │   └── file-monitor.js      # chokidar統合
│   └── index.js                 # メインサービス
├── config/
│   └── default-config.json      # 設定ファイル
├── package.json
└── README.md
```

### コンポーネント設計

#### 1. FileMonitor (src/monitors/file-monitor.js)
```javascript
class FileMonitor {
  constructor(options)
  startWatching(path)
  stopWatching()
  onEvent(eventType, filePath, stats)
}
```

**責務**:
- chokidar統合
- イベント検出・通知
- 初回スキャン実行

#### 2. DatabaseManager (src/database/database-manager.js)
```javascript
class DatabaseManager {
  constructor(dbPath)
  initialize()
  insertEvent(event)
  close()
}
```

**責務**:
- SQLite接続管理
- イベントデータの永続化
- データベース初期化

#### 3. ConfigManager (src/config/default-config.js)
```javascript
class ConfigManager {
  static getDefault()
  static merge(userConfig)
}
```

**責務**:
- 設定管理
- デフォルト値提供

#### 4. CCTopService (src/index.js)
```javascript
class CCTopService {
  constructor(config)
  start()
  stop()
  handleFileEvent(event)
  displayEvent(event)
}
```

**責務**:
- 全体統合
- イベント処理
- console出力

### データベーススキーマ

#### events テーブル
```sql
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,           -- 'add', 'change', 'unlink', 'addDir', 'unlinkDir'
  file_path TEXT NOT NULL,
  timestamp INTEGER NOT NULL,         -- Unix timestamp (ms)
  file_size INTEGER,                  -- ファイルサイズ (bytes)
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX idx_events_timestamp ON events(timestamp);
CREATE INDEX idx_events_file_path ON events(file_path);
CREATE INDEX idx_events_type ON events(event_type);
```

## 実装手順（RDD方式）

### Day 1: 基本構造構築
1. **プロジェクト初期化**
   - npm init
   - package.json設定
   - 基本ディレクトリ作成

2. **最小限動作確認**
   - bin/cctopで基本CLI動作
   - "Hello cctop"表示
   - **動作確認**: `./bin/cctop` 実行

### Day 2: chokidar統合
1. **FileMonitor実装**
   - chokidar基本統合
   - console.logで直接出力
   - **動作確認**: ファイル変更でconsole出力

2. **初回スキャン追加**
   - readyイベント処理
   - ファイル・ディレクトリ数表示
   - **動作確認**: 起動時統計表示

### Day 3: データベース統合
1. **DatabaseManager実装**
   - SQLite接続
   - events テーブル作成
   - **動作確認**: データ挿入・確認

2. **CCTopService統合**
   - FileMonitor → DatabaseManager
   - console表示継続
   - **動作確認**: イベントがDBに保存

### Day 4: CLI引数処理
1. **引数パース実装**
   - 監視対象パス指定
   - --helpオプション
   - **動作確認**: `./bin/cctop /path/to/watch`

2. **設定システム基本実装**
   - ConfigManager実装
   - デフォルト設定読み込み
   - **動作確認**: 設定値での動作

### Day 5: 品質向上・RDDテスト
1. **エラーハンドリング強化**
   - ファイルアクセスエラー対応
   - データベースエラー対応
   - **動作確認**: エラー時の適切な表示

2. **RDD方式テスト実装**
   - 基本的な動作テスト
   - 実環境での動作確認重視
   - **動作確認**: npm test 実行

## console出力形式

### 初回スキャン出力
```
Starting cctop v4.0.0...
Scanning /path/to/watch...
Found 87 files, 24 directories (scan: 19ms)
Watching for changes...
```

### イベント出力
```
2025-06-22T23:30:15.123Z | change | src/example.js
2025-06-22T23:30:16.456Z | add    | test/new-test.js
2025-06-22T23:30:17.789Z | unlink | temp/old-file.txt
```

## 成功指標

### 機能面
- [ ] chokidarでファイル変更を検出できる
- [ ] 初回スキャンで既存ファイルを検出できる
- [ ] CLI引数で監視パスを指定できる
- [ ] イベントがリアルタイムでconsole表示される
- [ ] イベントがSQLiteに保存される

### 品質面（RDD重視）
- [ ] `npm start`で即座に起動する
- [ ] ファイル作成・変更・削除を正確に検出
- [ ] エラー時に適切なメッセージ表示
- [ ] Ctrl+Cで正常終了
- [ ] 実環境での動作が安定

### パフォーマンス面
- [ ] 起動時間 < 1秒
- [ ] イベント検出遅延 < 100ms
- [ ] メモリ使用量 < 50MB（通常時）

## リスク対策

### 技術的リスク
1. **chokidarの挙動差異**
   - OS間での動作差異
   - 対策: 複数OS環境でのテスト

2. **SQLiteファイル競合**
   - 複数プロセス起動時の競合
   - 対策: ファイルロック実装

3. **大量ファイル処理**
   - パフォーマンス劣化
   - 対策: イベント数制限・バッファリング

### 実装リスク
1. **データベーススキーマ変更**
   - 将来的な拡張性
   - 対策: マイグレーション計画

2. **設定システム拡張**
   - Phase 2以降での設定追加
   - 対策: 拡張可能な設計

## Phase 2への引き継ぎ事項

### 完了予定項目
- 基本的な3層アーキテクチャ（chokidar → DB → console）
- SQLiteデータベース基盤
- 設定システム基盤
- CLI引数処理基盤

### Phase 2で追加予定
- 移動・リネーム検出ロジック
- moveイベントの生成・表示
- unlink→addペアの検出アルゴリズム

## 開発環境

### 必要なツール
- Node.js 18+
- npm
- SQLite3

### 依存関係
```json
{
  "dependencies": {
    "chokidar": "^3.5.3",
    "sqlite3": "^5.1.6",
    "commander": "^11.0.0"
  },
  "devDependencies": {
    "jest": "^29.7.0"
  }
}
```

## RDD実践ガイドライン

### 日次確認事項
- [ ] `npm start`で起動することを確認
- [ ] ファイル変更が検出されることを確認
- [ ] console出力が読みやすいことを確認
- [ ] データベースにデータが保存されることを確認

### 実動作重視の原則
- テストより実環境での動作確認を優先
- モックは最小限に抑制
- 実際のファイル操作での検証
- ユーザー視点での使いやすさ確認

---

**実装期限**: 2025-06-27（5日間）  
**成果物**: 動作するcctop v4.0.0 Phase 1  
**次のステップ**: Phase 2詳細計画策定