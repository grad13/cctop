# cctop v0.1.0.0 実装計画書

**作成日**: 2025-06-24  
**作成者**: Builder Agent  
**目的**: v0.1.0.0の詳細実装計画（基盤確立版）

## 🎯 v0.1.0.0の目標

**100%信頼性のあるファイル監視基盤の確立** - chokidar → DB → CLI表示の完全な動作

## 📊 実装スコープ

### 含まれるもの
1. **データベース基盤**（db001準拠、トリガー・インデックスは後回し）
2. **設定システム**（a002準拠、基本機能のみ）
3. **chokidar統合**（r002準拠、完全なテスト付き）
4. **CLI表示**（ui001準拠、All/Uniqueモード）
5. **完全なテストスイート**（r002設計に基づく）

### 含まれないもの
- プラグインシステム
- Tracer機能（Selection/Detailモード）
- 高度なFilter/Sort機能
- トリガー・インデックス（db002）
- 設定のホットリロード

## 🏗️ システムアーキテクチャ

```
┌─────────────────┐
│   File System   │
└────────┬────────┘
         │ ファイル変更
┌────────▼────────┐
│    chokidar     │
└────────┬────────┘
         │ イベント検出
┌────────▼────────┐
│ Event Processor │ ← 設定システム
└────────┬────────┘
         │ 正規化・メタデータ付加
┌────────▼────────┐
│  SQLite (db001) │
└────────┬────────┘
         │ データ取得
┌────────▼────────┐
│   CLI Display   │
│  (All/Unique)   │
└─────────────────┘
```

## 📁 ディレクトリ構造

### プロジェクトディレクトリ
```
cctop/
├── bin/
│   └── cctop              # 実行エントリポイント
├── src/
│   ├── config/
│   │   ├── config-manager.js
│   │   └── config-loader.js
│   ├── database/
│   │   ├── database-manager.js
│   │   ├── schema.js
│   │   └── event-manager.js
│   ├── monitors/
│   │   ├── file-monitor.js
│   │   └── event-processor.js
│   └── ui/
│       ├── cli-display.js
│       ├── stream-renderer.js
│       └── keyboard-handler.js
├── test/
│   └── integration/
│       └── chokidar-db/
│           ├── basic-operations.test.js
│           ├── metadata-integrity.test.js
│           ├── data-integrity.test.js
│           └── fixtures/
└── package.json
```

### ユーザー設定ディレクトリ（a002準拠）
```
~/.cctop/                   # ユーザーホームディレクトリ配下
├── config.json            # メイン設定ファイル（ネスト構造）
├── plugin/                # プラグイン用（v0.1.0.0では未使用）
└── activity.db            # データベースファイル（events.dbではない）
```

## 🔄 実装フェーズ

### Phase 1: 基盤構築（2日）

#### 1.1 プロジェクトセットアップ
- package.json更新（依存関係追加）
  - postinstallスクリプトの設定（[INST001](../../techs/specifications/installation/inst001-post-install-setup.md)参照）
- ディレクトリ構造作成
- bin/cctop実行ファイル作成
- 設定ファイルの初期化（[CONFIG001](../../techs/specifications/config/config001-management.md)参照）

#### 1.2 データベース実装（db001準拠）
```javascript
// src/database/schema.js
const schema = {
  event_types: `
    CREATE TABLE event_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT
    )`,
  
  object_fingerprint: `
    CREATE TABLE object_fingerprint (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inode INTEGER
    )`,
  
  events: `
    CREATE TABLE events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      event_type_id INTEGER NOT NULL,
      object_id INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      directory TEXT NOT NULL,
      previous_event_id INTEGER,
      source_path TEXT,
      file_size INTEGER,
      line_count INTEGER,
      block_count INTEGER,
      FOREIGN KEY (event_type_id) REFERENCES event_types(id),
      FOREIGN KEY (previous_event_id) REFERENCES events(id),
      FOREIGN KEY (object_id) REFERENCES object_fingerprint(id)
    )`,
    
  object_statistics: `
    CREATE TABLE object_statistics (
      object_id INTEGER PRIMARY KEY,
      current_file_size INTEGER DEFAULT 0,
      current_line_count INTEGER DEFAULT 0,
      current_block_count INTEGER DEFAULT 0,
      total_events INTEGER DEFAULT 0,
      total_modifications INTEGER DEFAULT 0,
      total_line_count INTEGER DEFAULT 0,
      total_block_count INTEGER DEFAULT 0,
      total_line_changes INTEGER DEFAULT 0,
      total_block_changes INTEGER DEFAULT 0,
      create_events INTEGER DEFAULT 0,
      modify_events INTEGER DEFAULT 0,
      move_events INTEGER DEFAULT 0,
      last_updated INTEGER DEFAULT CURRENT_TIMESTAMP,
      calculation_method TEXT DEFAULT 'trigger',
      FOREIGN KEY (object_id) REFERENCES object_fingerprint(id)
    )`
};
```

#### 1.3 設定システム基本実装（完全config.json依存版）

**設定値の唯一のソース**:
- `~/.cctop/config.json`: 全デフォルト設定の定義
- コマンドライン引数: 一時的なオーバーライドのみ
- **JSコード内**: 設定値は一切定義しない（定数除く）

**インストール時作成されるconfig.json**:
```json
{
  "version": "0.1.0",
  "monitoring": {
    "watchPaths": ["."],
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
    "maxEvents": 50,
    "refreshRateMs": 100
  }
}
```

**設定読み込み優先順位（シンプル化）**:
1. コマンドライン引数（--config指定ファイル または CLI上書き）
2. ~/.cctop/config.json（必須、存在しない場合はエラー）

**config.json読み込み時のエラーハンドリング**:

1. **ファイル不存在**:
   - エラーメッセージ表示
   - デフォルト値でconfig.jsonを自動作成
   - ユーザーに確認を促して終了（再実行を要求）

2. **JSON構文エラー**:
   - パースエラーの詳細位置を表示
   - 修正方法を案内して終了

3. **必須項目不足**:
   - 不足している必須項目をリスト表示
   - config.json確認・修正を促して終了

4. **型エラー・無効値**:
   - 型不整合の警告表示
   - 可能な場合はデフォルト値で継続

**必須設定項目**:
```javascript
const requiredFields = [
  'database.path',        // データベースファイルパス
  'display.maxEvents',    // 表示イベント数
  'monitoring.watchPaths' // 監視対象パス
];
```

**エラーメッセージ例**:
```
エラー: 設定ファイルに必須項目が不足しています:
  - database.path
  - display.maxEvents

~/.cctop/config.jsonを確認し、不足項目を追加してください。
デフォルト設定を参考にしてください。
```

**設定システムの設計原則**:
- **設定の一元化**: ~/.cctop/config.jsonが唯一の設定ソース
- **JSコードのクリーン化**: ハードコード値を完全排除
- **ユーザーフレンドリー**: 設定変更 = config.json編集のみ
- **明確な責任分離**: config.json=デフォルト、CLI=一時上書き

**実装における注意点**:
- `displayConfig.maxLines`は必ず値が存在（config.jsonから）
- フォールバック処理（`|| defaultValue`）は不要
- config.json読み込みエラー時は即座に終了
- CLIDisplayコンストラクタのプロパティ名統一: `displayConfig.maxEvents` → `this.maxLines`

### Phase 2: chokidar統合（2日）

#### 2.1 File Monitor実装
**chokidar初期化設定（vis005準拠）**:
```javascript
this.watcher = chokidar.watch(config.paths, {
  persistent: true,
  ignoreInitial: false,  // 初期スキャンを有効化
  awaitWriteFinish: {
    stabilityThreshold: 100,
    pollInterval: 50
  },
  atomic: true,
  alwaysStat: true      // statsオブジェクトを常に提供
});
```

**初期スキャンの処理**:
- `ignoreInitial: false`により、起動時に既存ファイルをすべてスキャン
- `ready`イベントで初期スキャン完了を検出
- 初期スキャン中の`add`イベント → `find`として記録
- 初期スキャン後の`add`イベント → `create`として記録

#### 2.2 Event Processor実装
```javascript
// 初期スキャン状態管理
let isReady = false;
watcher.on('ready', () => {
  isReady = true;
  console.log('Initial scan complete');
});

// イベント変換テーブル（r002準拠）
const eventMapping = {
  'add': (stats) => isReady ? 'create' : 'find',
  'change': () => 'modify',
  'unlink': () => 'delete',
  'addDir': (stats) => isReady ? 'create' : null,  // 初期スキャン中は記録しない
  'unlinkDir': () => 'delete'
};

// メタデータ収集（r002準拠）
async function collectMetadata(filePath, stats) {
  return {
    file_size: stats.size,
    line_count: await countLines(filePath),
    block_count: stats.blocks || null,
    timestamp: Date.now(),
    file_path: path.resolve(filePath),
    inode: stats.ino || null
  };
}
```

**r002準拠のイベント処理**:
- 初期スキャン中: 既存ファイル発見を`find`として記録
- リアルタイム監視中: 新規作成を`create`として記録
- `ready`イベント: 初期スキャン完了の判定に使用
- ディレクトリ: 初期スキャン中は記録しない

### Phase 3: テスト実装（2日）

#### 3.1 テスト開発必須原則
**機能追加時のテスト義務**:
1. **1つ機能を追加したら、都度それに関するtestを書くこと**
2. **使い捨てのtestコード作成は、これを一切の例外なく認めない**

これらの原則により、機能とテストが常に同期し、品質を継続的に保証する。

#### 3.2 基本テストスイート（r002 Phase 1準拠）
- basic-operations.test.js: create/find/modify/delete動作確認
- metadata-integrity.test.js: 6項目メタデータ完全性
- data-integrity.test.js: chokidar-DB間のデータ整合性

#### 3.3 テスト成功基準
- [ ] chokidarイベント数 === DB記録数
- [ ] timestamp精度±50ms以内
- [ ] 10ファイル高速作成で取りこぼしゼロ
- [ ] 必須メタデータ6項目すべて正確記録

### Phase 4: CLI実装（1日）

#### 4.1 基本表示機能（ui001準拠）
```javascript
// 表示モード
const displayModes = {
  ALL: 'all',      // すべてのイベント表示
  UNIQUE: 'unique' // ファイルごとに最新のみ
};

// キーボード操作
const keyBindings = {
  'a': () => setMode('ALL'),
  'u': () => setMode('UNIQUE'),
  'q': () => process.exit(0)
};
```

#### 4.2 表示フォーマット（ui001/ui002準拠）

**全体レイアウト**:
```
Modified             Elapsed    File Name             Directory       Event   Lines  Blocks
-------------------------------------------------------------------------------------------------
2025-06-24 14:30:15   00:01:23  index.js             src/            modify    125      8
2025-06-24 14:28:03   00:01:07  new-test.js          test/           create     45      3
2025-06-24 14:25:44   00:00:52  config.json          ./              delete     -       -
─────────────────────────────────────────────────────────────────────────────────
All Activities  Cached Events: 3/156
[a] All  [u] Unique  [q] Exit
```

**カラム仕様**:
| カラム | 幅 | 配置 | 説明 |
|--------|-----|------|------|
| Modified | 19 | 右寄せ | ファイル変更時刻 |
| Elapsed | 10 | 右寄せ | 経過時間 |
| File Name | 28 | 左寄せ | ファイル名 |
| Directory | 15 | 左寄せ | ディレクトリパス |
| Event | 8 | 左寄せ | イベントタイプ |
| Lines | 5 | 右寄せ | 行数 |
| Blocks | 6 | 右寄せ | ブロック数 |

**色分け（ui001準拠）**:
- find: 青（chalk.blue）
- create: 明るい緑（chalk.greenBright）
- modify: デフォルト（色なし）
- move: シアン（chalk.cyan）
- delete: グレー（chalk.gray）

### Phase 5: 統合・検証（1日）- 実動作駆動開発（Running-Driven Development: RDD）に基づく実動作確認

#### 5.1 RDD原則に基づく実動作確認
**r001-cctop-v4-development-roadmap.mdのRDD理念準拠**:
1. **実行可能性最優先**: `npm start`で即座に動作することを最初に確認
2. **日次動作確認**: 開発中は毎日必ず実環境で動作確認
3. **段階的統合**: 新機能は必ず動作中のシステムに統合
4. **実ユーザー視点**: 実際の使用者の体験を重視

**実動作確認項目**:
- [ ] `bin/cctop`実行で即座起動（3秒以内）
- [ ] ファイル変更がリアルタイムで表示される
- [ ] All/Uniqueモード切り替えが動作する
- [ ] Ctrl+Cで正常終了する
- [ ] 1000ファイル監視での安定動作
- [ ] ~/.cctop/activity.dbが正しく作成される

#### 5.2 統合テスト（実環境）
- 実際のプロジェクトディレクトリでの動作確認
- 長時間運用（最低1時間）での安定性確認
- メモリリーク・CPU使用率の監視

#### 5.3 ドキュメント作成
- README.md更新（クイックスタート含む）
- インストール・使用方法
- 設定ガイド

## 📊 成功基準

### 必須達成項目
- [ ] `npm start`で即座に起動
- [ ] chokidar → DB → 表示の完全な動作
- [ ] r002 Phase 1のテスト全合格
- [ ] 6項目メタデータの正確な記録
- [ ] All/Uniqueモード切り替え動作

### パフォーマンス目標
- 起動時間: < 3秒
- メモリ使用量: < 200MB
- CPU使用率: < 5%（アイドル時）
- 1000ファイル監視可能

### 実装上の注意点
- 初期化メッセージ（"starting", "initialized"等）はデバッグ用
- NODE_ENV=testまたはCCTOP_VERBOSE設定時のみ表示
- テストではメッセージ内容に依存しない実装とする

## 🚀 実装順序

1. **Day 1-2**: Phase 1（基盤構築）
2. **Day 3-4**: Phase 2（chokidar統合）+ Phase 3（テスト）並行
3. **Day 5**: Phase 4（CLI実装）
4. **Day 6**: Phase 5（統合・検証）
5. **Day 7**: バッファ・最終調整

## ⚠️ リスクと対策

### リスク1: chokidar-DB統合の不具合
**対策**: r002の詳細テスト設計に完全準拠

### リスク2: パフォーマンス問題
**対策**: 最初はシンプルに実装、後で最適化

### リスク3: メタデータ収集の遅延
**対策**: 非同期処理とバッファリング

## 📝 備考

- この計画はRDD原則に基づき、常に動作する状態を維持
- 各フェーズ完了時に必ず実動作確認
- テストはr002設計に完全準拠（基盤部分のため妥協なし）
- v0.2.0.0以降で高度な機能を追加予定