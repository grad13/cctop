# Phase 1 詳細実装計画

**Document ID**: phase1-detailed-plan  
**Date**: 2025-06-22  
**Author**: Inspector Agent  
**Status**: Draft  
**Purpose**: cctop v3.0.0 Phase 1の詳細実装計画

## 📋 Phase 1 概要

### 目標
chokidarの組み込み初回スキャン機能を活用した、実動作するファイル監視ツールの実装

### スコープ
- ✅ 基本的なファイル監視（追加・変更・削除）
- ✅ ディレクトリ監視（追加・削除）
- ✅ 初回スキャンによる既存ファイル検出
- ✅ 基本的な統計情報（ファイル数・ディレクトリ数）
- ✅ 設定システムの基盤
- ❌ 詳細な統計（サイズ、拡張子別等）→ Phase 1.5
- ❌ データベース保存 → Phase 2以降
- ❌ UI/表示の高度化 → Phase 3以降

## 🏗️ アーキテクチャ設計

### ディレクトリ構成（d000仕様準拠）
```
cctop/
├── bin/
│   └── cctop              # エントリポイント（シェルスクリプト）
├── src/
│   ├── monitors/          # ファイル監視（仕様準拠）
│   │   └── file-monitor.js
│   ├── cli/               # CLI表示
│   │   ├── display-manager.js  # 画面表示制御
│   │   └── formatters/         # 表示フォーマッター
│   │       └── stream-formatter.js
│   └── utils/             # Phase 1用ユーティリティ
│       ├── config-loader.js    # 設定読み込み
│       └── logger.js           # ログ出力
├── config/                # 設定ファイル（src外に配置）
│   └── default-config.json
├── package.json
├── README.md
└── .gitignore

~/.cctop/                  # ユーザーディレクトリ（Phase 1では基本のみ）
├── config.json            # ユーザー設定（Phase 1では作成のみ）
└── activity.db            # データベース（Phase 2以降で使用）
```

### Phase 1で実装する部分
- **bin/cctop**: エントリポイント
- **src/monitors/file-monitor.js**: 基本的なファイル監視
- **src/cli/display-manager.js**: シンプルな表示管理
- **src/utils/**: 最小限のユーティリティ
- **config/default-config.json**: デフォルト設定

### Phase 1では実装しない部分（将来用に構造だけ準備）
- **src/database/**: Phase 2で実装
- **src/cache/**: Phase 3-4で実装
- **src/analyzers/**: Phase 5で実装
- **~/.cctop/profiles/**: Phase 2以降で実装

### クラス設計

#### 1. FileMonitor（コア機能）
```javascript
class FileMonitor {
  constructor(config, stats, logger) {
    this.config = config;
    this.stats = stats;
    this.logger = logger;
    this.watcher = null;
  }
  
  start() {
    // chokidar初期化
    // イベントハンドラ設定
    // 統計収集開始
  }
  
  stop() {
    // クリーンアップ
    // 最終統計表示
  }
}
```

#### 2. BasicStats（統計収集）
```javascript
class BasicStats {
  constructor() {
    this.counts = {
      files: 0,
      directories: 0,
      events: 0
    };
    this.startTime = Date.now();
  }
  
  increment(type) { /* ... */ }
  getSummary() { /* ... */ }
  reset() { /* ... */ }
}
```

#### 3. Logger（ログ出力）
```javascript
class Logger {
  constructor(config) {
    this.showTimestamps = config.display.showTimestamps;
    this.colorEnabled = config.display.colorEnabled;
  }
  
  logEvent(type, path, timestamp) { /* ... */ }
  logInfo(message) { /* ... */ }
  logError(message) { /* ... */ }
}
```

#### 4. ConfigLoader（設定管理）
```javascript
class ConfigLoader {
  constructor() {
    this.defaultConfig = require('../config/default-config.json');
    this.userConfigPath = path.join(os.homedir(), '.cctop', 'config.json');
  }
  
  async load() {
    // 1. デフォルト設定を読み込み
    // 2. ~/.cctop/config.jsonが存在すれば読み込み
    // 3. 環境変数をオーバーライド
    // 4. CLIオプションを最優先で適用
    return mergedConfig;
  }
  
  async ensureUserDir() {
    // ~/.cctopディレクトリを作成（存在しない場合）
    // Phase 1では設定ファイルの準備のみ
  }
}

## 📝 実装タスク

### Priority 1: 必須機能
1. **既存コードの移行・リファクタリング**
   - [ ] src/watchers/ → src/monitors/へ移動
   - [ ] file-watcher.js → file-monitor.jsへリネーム
   - [ ] FileWatcherクラス → FileMonitorクラスへ変更
   - [ ] src/config/ → config/default-config.jsonへ移行
   - [ ] ConfigManager → ConfigLoaderへ変更
   - [ ] loggerクラスの抽出
   - [ ] ~/.cctop/ディレクトリ作成機能

2. **CLI引数サポート**
   - [ ] --watch <path> : 監視パス指定
   - [ ] --exclude <pattern> : 除外パターン追加
   - [ ] --no-initial : 初回スキャンスキップ
   - [ ] --quiet : 統計のみ表示
   - [ ] --help : ヘルプ表示

3. **統計機能の強化**
   - [ ] スキャン時間の計測
   - [ ] イベントタイプ別カウント
   - [ ] readyイベントでのサマリー表示

### Priority 2: 品質向上
4. **設定の拡張**
   - [ ] 環境変数サポート（CCTOP_WATCH_PATH等）
   - [ ] 設定ファイル読み込み準備（構造のみ）

5. **出力の改善**
   - [ ] 相対パス表示の最適化
   - [ ] カラー出力の制御
   - [ ] 進捗表示（オプション）

6. **エラー処理**
   - [ ] 権限エラーの適切な処理
   - [ ] 大規模ディレクトリ警告
   - [ ] 無効なパスの検証

### Priority 3: 将来への準備
7. **拡張性の確保**
   - [ ] プラグインアーキテクチャの基盤
   - [ ] イベントエミッターパターン
   - [ ] データベース接続の準備（インターフェースのみ）

## 🚀 実装手順（RDD方式）

### Day 1: ディレクトリ構成移行
1. 現在の実装を動作確認
2. 仕様準拠のディレクトリ構成へ移行
   - src/watchers/ → src/monitors/
   - file-watcher.js → file-monitor.js
   - FileWatcherクラス → FileMonitorクラス
   - src/config/ → config/
3. ~/.cctop/ディレクトリ作成機能
4. 動作確認（移行後も正常動作すること）

### Day 2: CLI機能
1. cli-parser.js実装
2. 基本的な引数処理（--watch, --help）
3. 動作確認
4. 残りの引数を追加

### Day 3: 統計強化
1. BasicStatsクラスの拡張
2. readyイベントでのサマリー実装
3. 実行時間計測
4. フォーマット改善
5. require更新（FileWatcher → FileMonitor）

### Day 4: 品質向上
1. エラーハンドリング追加
2. 出力の最適化
3. 手動テストスクリプト作成
4. ドキュメント更新

### Day 5: 最終調整
1. コードレビュー
2. パフォーマンステスト
3. README.md更新
4. Phase 1完成宣言

## 📊 成功指標

### 機能面
- [ ] npm startで即座に起動
- [ ] 1万ファイルのディレクトリで正常動作
- [ ] Ctrl+Cで正常終了
- [ ] 統計情報の正確な表示

### 品質面
- [ ] エラー時の適切なメッセージ
- [ ] メモリリークなし
- [ ] CPU使用率が妥当
- [ ] コードが読みやすい

### RDD準拠
- [ ] 毎日動作確認済み
- [ ] ユーザーが実際に使える
- [ ] 次のPhaseへの拡張が容易

## 🗄️ データベース・設定配置計画

### Phase 1での準備
```bash
~/.cctop/
├── config.json            # 空の設定ファイル（テンプレート）
└── .gitkeep              # ディレクトリ保持用
```

### Phase 2以降での拡張
```bash
~/.cctop/
├── config.json           # ユーザー設定
├── profiles/             # プロファイル設定
│   ├── development.json
│   └── production.json
├── activity.db           # SQLiteデータベース
└── cache/                # キャッシュディレクトリ
    └── persistent-cache.db
```

### 設定ファイルの階層（d001仕様準拠）
1. **config/default-config.json**: アプリケーション同梱のデフォルト
2. **~/.cctop/config.json**: ユーザー個別設定
3. **環境変数**: CCTOP_*で始まる設定
4. **CLIオプション**: コマンドライン引数

## 🤔 検討事項

### 技術的判断
1. **非同期処理の扱い**
   - 初回スキャンは同期的でOK？
   - 大規模ディレクトリでのブロッキング対策

2. **メモリ管理**
   - 統計情報の保持期間
   - イベントバッファリング

3. **クロスプラットフォーム**
   - Windows対応の考慮
   - パス区切り文字の処理
   - ~/.cctop/のWindows対応（%APPDATA%）

### ユーザビリティ
1. **デフォルト動作**
   - 引数なしの場合の挙動
   - 初回スキャンのデフォルト

2. **出力フォーマット**
   - タイムスタンプ形式
   - パス表示方法

## 📅 スケジュール案

| 日程 | タスク | 成果物 |
|------|--------|--------|
| Day 1 | リファクタリング | 分離されたクラス群 |
| Day 2 | CLI実装 | 引数処理機能 |
| Day 3 | 統計強化 | 詳細な統計表示 |
| Day 4 | 品質向上 | エラー処理・最適化 |
| Day 5 | 完成 | Phase 1 リリース |

## 🎯 次のステップ

1. この計画のレビュー・承認
2. 優先順位の確定
3. Day 1の実装開始
4. 日次進捗確認

## 📌 重要な注記

### 現在の実装との差異
現在の実装：
```
src/
├── config/          # 設定管理
│   ├── config-manager.js
│   └── defaults.js
└── watchers/        # ファイル監視
    └── file-watcher.js
```

仕様準拠の構成：
```
src/
├── monitors/        # ファイル監視（名称変更）
│   └── file-monitor.js  # file-watcher.jsからリネーム
├── cli/            # CLI表示（新規追加）
│   └── display-manager.js
└── utils/          # ユーティリティ
    └── config-loader.js

config/             # src外に配置
└── default-config.json
```

### 移行戦略
1. **動作を維持しながら段階的に移行**
2. **ディレクトリ名変更は最小限に**（watchersからmonitorsへ）
3. **新機能追加時に正しい場所に配置**
4. **設定システムの段階的拡張**

## 🎯 Phase 2: データ・プレゼンテーション分離アーキテクチャ

### 背景・設計思想
前回version-02の失敗原因の1つは、データ収集機能と表示機能が密結合していたことによるテストの困難さでした。Phase 2では、この問題を解決するためにEvent Emitterパターンを使用した分離アーキテクチャを採用します。

### アーキテクチャ概要

#### 1. データレイヤー（Data Layer）
```javascript
// src/data/event-collector.js
class EventCollector extends EventEmitter {
  constructor(fileMonitor) {
    super();
    this.fileMonitor = fileMonitor;
    this.stats = new DataStats();
    this.setupEventHandlers();
  }
  
  setupEventHandlers() {
    this.fileMonitor.on('add', (path) => {
      const eventData = this.processFileAdd(path);
      this.emit('data:file-added', eventData);
    });
    // 他のイベントも同様に処理
  }
  
  processFileAdd(path) {
    // データ収集・統計更新
    // プレゼンテーション情報を含まない純粋なデータ
    return {
      type: 'file-add',
      path: path,
      timestamp: Date.now(),
      stats: this.stats.getCurrentStats()
    };
  }
}
```

#### 2. プレゼンテーションレイヤー（Presentation Layer）
```javascript
// src/presentation/console-presenter.js
class ConsolePresenter {
  constructor(eventCollector, formatters) {
    this.eventCollector = eventCollector;
    this.formatters = formatters;
    this.setupEventHandlers();
  }
  
  setupEventHandlers() {
    this.eventCollector.on('data:file-added', (eventData) => {
      const formatted = this.formatters.formatFileAdd(eventData);
      console.log(formatted);
    });
    // 他のイベントも同様に処理
  }
}
```

#### 3. フォーマッターレイヤー（Formatter Layer）
```javascript
// src/presentation/formatters/event-formatter.js
class EventFormatter {
  constructor(config) {
    this.showTimestamps = config.display.showTimestamps;
    this.colorEnabled = config.display.colorEnabled;
  }
  
  formatFileAdd(eventData) {
    const timestamp = this.showTimestamps ? 
      this.formatTimestamp(eventData.timestamp) : '';
    const icon = '📄';
    const filename = path.basename(eventData.path);
    
    return `${timestamp}${icon} File added: ${filename}`;
  }
}
```

### データフローの設計

```
FileMonitor (chokidar) 
    ↓ (raw events)
EventCollector (data processing)
    ↓ (structured data events)
ConsolePresenter (presentation logic)
    ↓ (formatted output)
Console Output
```

### テスタビリティの向上

#### 1. データレイヤーのテスト
```javascript
// test/unit/data/event-collector.test.js
describe('EventCollector', () => {
  test('ファイル追加イベントが正しく処理される', () => {
    const mockFileMonitor = new EventEmitter();
    const collector = new EventCollector(mockFileMonitor);
    
    const dataEventSpy = jest.fn();
    collector.on('data:file-added', dataEventSpy);
    
    // モックイベント送信
    mockFileMonitor.emit('add', '/test/file.txt');
    
    // データイベントの検証（表示は関係なし）
    expect(dataEventSpy).toHaveBeenCalledWith({
      type: 'file-add',
      path: '/test/file.txt',
      timestamp: expect.any(Number),
      stats: expect.any(Object)
    });
  });
});
```

#### 2. プレゼンテーションレイヤーのテスト
```javascript
// test/unit/presentation/console-presenter.test.js
describe('ConsolePresenter', () => {
  test('データイベントが正しくフォーマットされて表示される', () => {
    const mockEventCollector = new EventEmitter();
    const mockFormatters = { formatFileAdd: jest.fn().mockReturnValue('formatted output') };
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    const presenter = new ConsolePresenter(mockEventCollector, mockFormatters);
    
    // データイベント送信
    mockEventCollector.emit('data:file-added', {
      type: 'file-add',
      path: '/test/file.txt',
      timestamp: 1234567890,
      stats: {}
    });
    
    // 表示の検証
    expect(mockFormatters.formatFileAdd).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('formatted output');
  });
});
```

### Phase 2実装計画

#### Priority 1: コア分離
1. **EventCollectorクラスの実装**
   - FileMonitorからEventEmitterを継承
   - 純粋なデータ処理ロジック
   - 統計情報の管理

2. **ConsolePresenterクラスの実装**
   - EventCollectorからのイベント受信
   - 表示ロジックの集約
   - 設定に基づく表示制御

3. **EventFormatterクラスの実装**
   - 表示フォーマットの責務を分離
   - 再利用可能なフォーマット関数
   - 設定駆動のフォーマット

#### Priority 2: 拡張性の確保
4. **複数Presenterの対応準備**
   - JSON出力Presenter
   - ファイル出力Presenter
   - Web UI Presenter（将来）

5. **プラグインアーキテクチャの基盤**
   - カスタムFormatterの対応
   - イベントフィルターの機能
   - 拡張ポイントの定義

### 期待される効果

#### 1. テスタビリティの大幅向上
- データ処理と表示を独立してテスト可能
- モックの使用が容易
- ユニットテストのカバレッジ向上

#### 2. 保守性の向上
- 表示変更時にデータ処理への影響なし
- 新しい出力形式の追加が容易
- バグの影響範囲が限定的

#### 3. 拡張性の確保
- 将来のWeb UI実装が容易
- 複数の出力形式の同時サポート
- カスタマイゼーションの柔軟性

---

**Note**: この計画はRDD方針に基づき、実動作を最優先としています。仕様準拠への移行も、動作確認を行いながら段階的に実施します。