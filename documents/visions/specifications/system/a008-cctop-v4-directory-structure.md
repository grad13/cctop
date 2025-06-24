# cctop v4.0.0 最終形態ディレクトリ構造設計

**Document ID**: a008-cctop-v4-directory-structure  
**Created**: 2025-06-22 23:45  
**Updated**: 2025-06-22 23:50  
**Author**: Builder Agent  
**Status**: Active  
**Purpose**: cctop v4.0.0の最終形態（Phase 1-5完了）のディレクトリ構造定義

## 概要

cctop v4.0.0の最終形態は、**chokidar → DB → console** の3層分離アーキテクチャを基本とし、移動検出・統合表示・フィルタリング・統計分析のすべての機能を含む。RDD方式に基づく段階的開発を経て到達する実用的なファイル監視ツールの完成形。

## 🎯 設計原則

### 1. 3層分離アーキテクチャ（堅持）
- **監視層**: chokidar + 移動検出
- **永続化層**: SQLite + 統計データ
- **表示層**: 多様な表示モード（stream/unique/stats）

### 2. 機能別モジュール化
- **monitors/**: ファイル監視・変更検出
- **processors/**: データ処理・フィルタリング
- **displays/**: 表示モード・UI制御
- **analytics/**: 統計計算・分析

### 3. 実用性重視
- CLIツールとしての完成度
- NPMパッケージとしての配布
- 実環境での安定動作

## 📁 最終形態ディレクトリ構造

```
cctop/
├── bin/
│   └── cctop                    # CLI エントリポイント
├── src/
│   ├── config/
│   │   ├── config-manager.js    # 設定管理（階層的設定）
│   │   ├── default-config.js    # デフォルト設定値
│   │   └── cli-options.js       # CLI引数処理
│   ├── database/
│   │   ├── database-manager.js  # SQLite管理
│   │   ├── schema.js            # テーブル・インデックス定義
│   │   └── migrations/          # スキーママイグレーション
│   │       ├── 001-initial.sql      # 基本テーブル
│   │       ├── 002-moves.sql        # 移動テーブル
│   │       └── 003-statistics.sql   # 統計テーブル
│   ├── monitors/
│   │   ├── file-monitor.js      # chokidar統合・基本監視
│   │   ├── move-detector.js     # ファイル移動・リネーム検出
│   │   └── event-processor.js   # イベント正規化・前処理
│   ├── processors/
│   │   ├── event-aggregator.js  # 重複イベント統合
│   │   ├── event-filter.js      # フィルタリングエンジン
│   │   └── filter-config.js     # フィルタ設定管理
│   ├── displays/
│   │   ├── stream-display.js    # Allモード（ストリーム表示）
│   │   ├── unique-display.js    # Uniqueモード（統合表示）
│   │   ├── stats-display.js     # 統計表示モード
│   │   └── display-manager.js   # 表示モード切替・制御
│   ├── analytics/
│   │   ├── statistics-engine.js # 統計計算エンジン
│   │   ├── report-generator.js  # レポート生成
│   │   └── metrics-collector.js # メトリクス収集
│   └── index.js                 # CCTopService（メイン統合）
├── config/
│   ├── default-config.json      # デフォルト設定
│   └── filter-presets.json      # フィルタプリセット
├── test/
│   ├── integration/
│   │   ├── end-to-end.test.js       # E2Eテスト
│   │   ├── file-operations.test.js  # ファイル操作統合
│   │   └── display-modes.test.js    # 表示モード統合
│   ├── unit/
│   │   ├── monitors/                # monitors/*テスト
│   │   ├── processors/              # processors/*テスト
│   │   ├── displays/                # displays/*テスト
│   │   └── analytics/               # analytics/*テスト
│   └── fixtures/
│       ├── sample-files/            # テスト用ファイル
│       └── sample-configs/          # テスト用設定
├── docs/
│   ├── README.md                # ユーザーガイド
│   ├── CLI-REFERENCE.md         # CLI使用方法
│   └── CONFIG-GUIDE.md          # 設定ガイド
├── package.json                 # NPM設定
├── .gitignore                   # Git除外設定
└── LICENSE                      # ライセンス
```

## 🔧 主要コンポーネント設計

### 監視層 (monitors/)

#### src/monitors/file-monitor.js
```javascript
class FileMonitor {
  constructor(config)
  startWatching(path)
  stopWatching()
  onEvent(eventType, filePath, stats)
  getInitialScan()
}
```
**責務**: chokidar統合、基本イベント検出、初回スキャン

#### src/monitors/move-detector.js
```javascript
class MoveDetector {
  constructor(timeout = 500)
  detectMove(unlinkEvent, addEvent)
  getPendingUnlinks()
  confirmMove(fromPath, toPath)
}
```
**責務**: unlink→addペアからmove検出、タイミング判定

#### src/monitors/event-processor.js
```javascript
class EventProcessor {
  constructor()
  normalizeEvent(rawEvent)
  enrichEvent(event)
  validateEvent(event)
}
```
**責務**: イベント正規化、メタデータ追加、検証

### 永続化層 (database/)

#### src/database/database-manager.js
```javascript
class DatabaseManager {
  constructor(dbPath)
  initialize()
  insertEvent(event)
  insertMove(moveEvent)
  queryEvents(filters)
  getStatistics(timeRange)
  close()
}
```
**責務**: SQLite管理、CRUD操作、クエリ実行

#### src/database/schema.js
```javascript
class Schema {
  static getInitialSchema()
  static getMigrations()
  static createTables(db)
  static createIndexes(db)
}
```
**責務**: テーブル定義、インデックス、マイグレーション

### 処理層 (processors/)

#### src/processors/event-aggregator.js
```javascript
class EventAggregator {
  constructor()
  aggregateEvents(events)
  deduplicateEvents(events)
  groupByFile(events)
}
```
**責務**: 重複イベント統合、ファイル別グループ化

#### src/processors/event-filter.js
```javascript
class EventFilter {
  constructor(config)
  applyFilters(events, filters)
  filterByType(events, types)
  filterByPath(events, patterns)
  filterByTime(events, timeRange)
}
```
**責務**: イベントフィルタリング、条件判定

### 表示層 (displays/)

#### src/displays/stream-display.js
```javascript
class StreamDisplay {
  constructor(config)
  displayEvent(event)
  formatEvent(event)
  updateDisplay()
}
```
**責務**: Allモード表示、リアルタイムストリーム

#### src/displays/unique-display.js
```javascript
class UniqueDisplay {
  constructor(config)
  displayAggregated(aggregatedEvents)
  formatUnique(fileEvents)
  updateSummary()
}
```
**責務**: Uniqueモード表示、ファイル別統合

#### src/displays/stats-display.js
```javascript
class StatsDisplay {
  constructor(config)
  displayStatistics(stats)
  formatStats(data)
  renderCharts(data)
}
```
**責務**: 統計表示、チャート描画

#### src/displays/display-manager.js
```javascript
class DisplayManager {
  constructor()
  setMode(mode)
  switchMode(newMode)
  getCurrentDisplay()
  handleInput(key)
}
```
**責務**: 表示モード切替、キーボード処理

### 分析層 (analytics/)

#### src/analytics/statistics-engine.js
```javascript
class StatisticsEngine {
  constructor()
  calculateFileStats(events)
  calculateTimeStats(events)
  calculateTypeStats(events)
  generateSummary(events)
}
```
**責務**: 統計計算、集計処理

#### src/analytics/report-generator.js
```javascript
class ReportGenerator {
  constructor()
  generateDailyReport(date)
  generateFileReport(filePath)
  generateSummaryReport(timeRange)
  exportReport(report, format)
}
```
**責務**: レポート生成、エクスポート

## 📊 最終形態データフロー

### 基本データフロー（全Phase統合）
```
[chokidar] → [monitors/] → [processors/] → [database/] → [displays/] → [console] → [ユーザー]
     |           |             |              |            |            |          |
ファイル変更   監視・検出    処理・統合      永続化       表示制御     出力      操作・確認
     |           |             |              |            |            |          |
     |      file-monitor    event-filter   database    display      各種       キーボード
     |      move-detector   event-aggregator  -manager   -manager     モード      入力
     |      event-processor                   schema.js  stream/unique/stats     ↓
     |                                                                        [analytics/]
     |                                                                        統計・分析
```


### 詳細データフロー（レイヤー別）

#### 1. 監視層 → 永続化層
```
FileMonitor(chokidar) → EventProcessor → DatabaseManager
                   ↓
MoveDetector → DatabaseManager(moves table)
```

#### 2. 永続化層 → 処理層
```
DatabaseManager.queryEvents() → EventFilter → filtered events
                              ↓
                            EventAggregator → aggregated events
```

#### 3. 処理層 → 表示層
```
filtered/aggregated events → DisplayManager → mode selection
                                   ↓
                            StreamDisplay/UniqueDisplay/StatsDisplay
                                   ↓
                               console output
```

#### 4. 分析層（独立処理）
```
DatabaseManager.getStatistics() → StatisticsEngine → calculated stats
                                        ↓
                                 ReportGenerator → formatted reports
```

### インタラクティブフロー（Phase 3-5）
```
[ユーザー] → [キーボード入力] → [DisplayManager] → [mode切替/filter設定]
     ↓                            ↓                     ↓
[確認・操作] ← [console] ← [各Display] ← [EventFilter/Aggregator]
                               ↑
                         [DatabaseManager] ← [新しいクエリ]
```

## 📋 最終形態SQLiteスキーマ

### 基本テーブル (001-initial.sql)
```sql
-- メインイベントテーブル（r002/r003統合仕様）
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,           -- 'Find', 'Create', 'Modify', 'Delete'
  file_path TEXT NOT NULL,            -- 絶対パス（正規化済み）
  timestamp INTEGER NOT NULL,         -- Unix timestamp (ms)、±50ms精度
  file_size INTEGER,                  -- ファイルサイズ (bytes)、必須
  line_count INTEGER,                 -- ファイル行数、テキストのみ
  block_count INTEGER,                -- Claude Code論理ブロック数
  inode INTEGER,                      -- inode番号（移動検出用、Unix系のみ）
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX idx_events_timestamp ON events(timestamp);
CREATE INDEX idx_events_file_path ON events(file_path);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_inode ON events(inode);
CREATE INDEX idx_events_block_count ON events(block_count);
```

### 移動テーブル (002-moves.sql)
```sql
-- ファイル移動・リネーム記録
CREATE TABLE moves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_path TEXT NOT NULL,
  to_path TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  confidence REAL NOT NULL,           -- 検出信頼度 (0.0-1.0)
  detection_method TEXT NOT NULL,     -- 'inode', 'hash', 'timing'
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX idx_moves_timestamp ON moves(timestamp);
CREATE INDEX idx_moves_from_path ON moves(from_path);
CREATE INDEX idx_moves_to_path ON moves(to_path);
```

### 統計テーブル (003-statistics.sql)
```sql
-- 日次統計サマリー
CREATE TABLE daily_stats (
  date TEXT PRIMARY KEY,              -- YYYY-MM-DD
  total_events INTEGER NOT NULL,
  add_count INTEGER NOT NULL,
  change_count INTEGER NOT NULL,
  unlink_count INTEGER NOT NULL,
  move_count INTEGER NOT NULL,
  active_files INTEGER NOT NULL,      -- その日活動したファイル数
  peak_hour INTEGER,                  -- 最も活動が多い時間
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- ファイル別統計
CREATE TABLE file_stats (
  file_path TEXT PRIMARY KEY,
  total_events INTEGER NOT NULL,
  last_event_type TEXT NOT NULL,
  last_timestamp INTEGER NOT NULL,
  change_frequency REAL,              -- 1日あたりの変更頻度
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX idx_file_stats_frequency ON file_stats(change_frequency);
CREATE INDEX idx_file_stats_last_timestamp ON file_stats(last_timestamp);
```

## 🎯 最終形態NPMパッケージ設定

### package.json
```json
{
  "name": "cctop",
  "version": "4.0.0",
  "description": "Advanced file monitoring tool with real-time display, move detection, filtering, and analytics",
  "keywords": ["file-monitoring", "chokidar", "cli", "real-time", "file-watcher"],
  "bin": {
    "cctop": "./bin/cctop"
  },
  "main": "./src/index.js",
  "files": [
    "bin/",
    "src/",
    "config/",
    "docs/",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "start": "node bin/cctop",
    "test": "jest",
    "test:unit": "jest test/unit",
    "test:integration": "jest test/integration",
    "test:e2e": "jest test/integration/end-to-end.test.js",
    "test:rdd": "npm run test:integration && npm run test:e2e",
    "dev": "node bin/cctop --dev",
    "build": "echo 'No build required'",
    "lint": "echo 'Add ESLint here'",
    "prepack": "npm test"
  },
  "dependencies": {
    "chokidar": "^3.5.3",
    "sqlite3": "^5.1.6",
    "commander": "^11.0.0",
    "chalk": "^5.3.0",
    "cli-table3": "^0.6.3",
    "ora": "^7.0.1"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "@types/node": "^20.0.0"
  },
  "engines": {
    "node": ">=16.0.0"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/cctop.git"
  },
  "bugs": {
    "url": "https://github.com/your-org/cctop/issues"
  },
  "homepage": "https://github.com/your-org/cctop#readme",
  "license": "MIT"
}
```

### CLI使用例
```bash
# 基本監視
cctop                              # 現在ディレクトリ監視
cctop /path/to/project             # 指定ディレクトリ監視

# 表示モード
cctop --mode stream                # ストリームモード（デフォルト）
cctop --mode unique                # ユニークモード
cctop --mode stats                 # 統計モード

# フィルタリング
cctop --filter add,change          # 特定イベントタイプのみ
cctop --exclude "*.log,node_modules" # 除外パターン
cctop --include "src/**/*.js"      # 含めるパターン

# 統計・レポート
cctop --stats daily                # 日次統計表示
cctop --report /path/to/report.json # レポート出力

# 設定
cctop --config /path/to/config.json # カスタム設定
cctop --init-config                # 設定ファイル初期化
```

## 🧪 最終形態テスト構造（RDD方式）

### 統合テスト（最重要）
```
test/integration/
├── end-to-end.test.js            # 完全なE2Eシナリオ
├── file-operations.test.js       # ファイル操作検証
├── display-modes.test.js         # 表示モード切替
├── move-detection.test.js        # 移動・リネーム検出
├── filtering.test.js             # フィルタリング機能
└── statistics.test.js            # 統計・分析機能
```

### ユニットテスト（補助的）
```
test/unit/
├── monitors/
│   ├── file-monitor.test.js      # chokidar統合
│   ├── move-detector.test.js     # 移動検出ロジック
│   └── event-processor.test.js   # イベント正規化
├── processors/
│   ├── event-aggregator.test.js  # 重複統合
│   └── event-filter.test.js      # フィルタリング
├── displays/
│   ├── stream-display.test.js    # ストリーム表示
│   ├── unique-display.test.js    # ユニーク表示
│   └── stats-display.test.js     # 統計表示
├── analytics/
│   ├── statistics-engine.test.js # 統計計算
│   └── report-generator.test.js  # レポート生成
└── database/
    ├── database-manager.test.js  # SQLite操作
    └── schema.test.js            # スキーマ管理
```

### テスト用データ
```
test/fixtures/
├── sample-files/
│   ├── js-project/               # JavaScript プロジェクト
│   ├── large-repo/               # 大規模リポジトリ
│   └── simple-files/             # 基本ファイル操作
├── sample-configs/
│   ├── basic-config.json         # 基本設定
│   ├── filter-config.json        # フィルタ設定
│   └── analytics-config.json     # 統計設定
└── sample-databases/
    ├── empty.db                  # 空データベース
    ├── basic-events.db           # 基本イベント
    └── full-features.db          # 全機能データ
```

### RDD テスト戦略（r002統合）
- **E2E最優先**: 実際のユーザーシナリオを重視
- **実動作確認**: 毎日のRDD確認ルーチン
- **モック最小化**: 可能な限り実装コンポーネント使用
- **統合重視**: コンポーネント間連携の検証

### **[chokidar] → [DB] 統合テスト詳細**（r002統合）

#### **基本確実性テスト**（Phase 1必須）
- [ ] 基本5操作（Create/Find/Modify/Delete）すべてで100%記録成功
- [ ] chokidarイベント数 === DB記録数（完全一致）
- [ ] timestamp精度±50ms以内
- [ ] 10ファイル高速作成で取りこぼしゼロ
- [ ] 必須メタデータ6項目すべて正確記録

#### **実用性検証テスト**（Phase 2重要）
- [ ] 1000ファイル監視で10秒以内処理
- [ ] メモリ使用量200MB以下維持
- [ ] CPU使用率5%以下（アイドル時）
- [ ] 複雑な競合状態でも整合性維持

#### **テストファイル追加**
```
test/integration/chokidar-db/
├── basic-operations.test.js      # Phase 1: 基本操作
├── metadata-integrity.test.js    # Phase 1: メタデータ完全性
├── data-integrity.test.js        # Phase 1: データ整合性
├── block-count-verification.test.js # r003: block_count検証
├── performance.test.js           # Phase 2: パフォーマンス
└── error-handling.test.js        # Phase 3: エラー処理
```

#### **block_count統合テスト**（r003統合）
- [ ] JavaScript: 関数・クラス・インターフェース・型・enum・オブジェクト検出
- [ ] TypeScript: 同上 + abstract class・export対応
- [ ] Python: 関数・クラス・定数検出
- [ ] Markdown: ヘッダー（#〜######）検出
- [ ] JSON: トップレベルキー数取得

## 🔧 最終形態設定管理

### config/default-config.json
```json
{
  "database": {
    "path": "~/.cctop/activity.db",
    "autoMigrate": true,
    "enableWAL": true
  },
  "monitoring": {
    "ignorePatterns": [
      "node_modules/**",
      ".git/**",
      "*.log",
      ".DS_Store",
      "coverage/**"
    ],
    "includePatterns": ["**/*"],
    "watchOptions": {
      "persistent": true,
      "ignoreInitial": false
    }
  },
  "moveDetection": {
    "timeout": 500,
    "useInode": true,
    "useHash": true,
    "confidenceThreshold": 0.7
  },
  "display": {
    "defaultMode": "stream",
    "maxEventsBuffer": 1000,
    "timestampFormat": "ISO",
    "colorOutput": true,
    "refreshRate": 100
  },
  "filtering": {
    "enabledByDefault": false,
    "defaultTypes": ["add", "change", "unlink", "move"]
  },
  "analytics": {
    "enableStatistics": true,
    "dailyStatsUpdate": true,
    "retentionDays": 30
  }
}
```

### config/filter-presets.json
```json
{
  "development": {
    "include": ["src/**", "test/**"],
    "exclude": ["*.log", "coverage/**"],
    "types": ["add", "change", "unlink"]
  },
  "documentation": {
    "include": ["**/*.md", "docs/**"],
    "types": ["add", "change", "unlink", "move"]
  },
  "assets": {
    "include": ["**/*.{png,jpg,css,js}"],
    "types": ["add", "unlink", "move"]
  }
}
```

## 🎯 最終形態成功指標

### 機能完成度
- [ ] Phase 1-5全機能実装完了
- [ ] 3つの表示モード（stream/unique/stats）動作
- [ ] 移動・リネーム検出精度 >90%
- [ ] フィルタリング機能完全動作
- [ ] 統計・分析機能完全動作

### 品質指標
- [ ] E2Eテスト成功率 100%
- [ ] 統合テスト成功率 100%
- [ ] ユニットテストカバレッジ >85%
- [ ] 実環境での安定動作（1週間連続）
- [ ] NPMパッケージとして正常配布

### パフォーマンス指標
- [ ] 起動時間 <2秒（1万ファイル環境）
- [ ] イベント検出遅延 <100ms
- [ ] メモリ使用量 <200MB（通常使用）
- [ ] CPU使用率 <5%（アイドル時）
- [ ] SQLiteファイルサイズ最適化

### ユーザビリティ指標
- [ ] 直感的なCLI操作
- [ ] 豊富なヘルプ・ドキュメント
- [ ] エラーメッセージの分かりやすさ
- [ ] 設定の柔軟性
- [ ] 複数プラットフォーム対応（Linux/macOS/Windows）

## 📈 配布・保守戦略

### NPMパッケージ配布
- **パッケージ名**: `cctop`
- **対象ユーザー**: 開発者、システム管理者
- **インストール方法**: `npm install -g cctop`
- **ドキュメント**: GitHub Pages

### 継続的改善
- **フィードバック収集**: GitHub Issues
- **機能追加**: ユーザー要望ベース
- **パフォーマンス最適化**: 継続的測定
- **セキュリティ更新**: 依存関係管理

---

## 🎉 まとめ

cctop v4.0.0の最終形態は、**chokidar → DB → console** の3層分離アーキテクチャを基盤とし、以下の特徴を持つ実用的なファイル監視ツールです：

### 🚀 主要機能
1. **リアルタイム監視**: chokidarによる高精度ファイル監視
2. **移動検出**: inode・ハッシュベースの移動・リネーム検出
3. **多様な表示**: stream/unique/statsの3つのモード
4. **柔軟なフィルタリング**: イベントタイプ・パス・時間でのフィルタ
5. **詳細統計**: ファイル活動の分析・レポート生成

### 🏗️ アーキテクチャの優位性
- **シンプルな構造**: 4つの主要レイヤーで構成
- **段階的拡張**: Phase 1から5への段階的開発
- **高い保守性**: 明確な責務分離
- **優れたテスタビリティ**: RDD方式による実動作重視

### 🎯 実用性
- **NPMパッケージ**: グローバルインストール対応
- **豊富なCLIオプション**: 多様な使用シナリオに対応
- **安定した動作**: 実環境での長期間安定動作
- **優れたパフォーマンス**: 大規模プロジェクトでも軽快動作

このディレクトリ構造により、cctop v4.0.0は実用的で拡張可能なファイル監視ツールとして完成します。

---

**cctop v4.0.0最終形態ディレクトリ構造により、実用的で拡張可能な高品質ファイル監視ツールが実現されます。**