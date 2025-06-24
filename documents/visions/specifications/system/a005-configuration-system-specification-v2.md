# s000: Configuration System Specification v2.0

**作成日**: 2025-06-22 12:00  
**作成者**: Architect Agent  
**版**: 2.0（実装準拠版）  
**対象**: cctop設定システムの正確な仕様

## 📋 概要

本仕様書は、cctop設定システムの実装に基づいた正確な仕様を定義する。従来の仕様書（v1.0）は8モジュール構成を想定していたが、実装では4モジュールに統合されており、本仕様書はその実態を反映する。

## 🎯 設計思想

### 基本原則
1. **階層的設定管理**: 5層の優先順位による柔軟な設定
2. **動的更新**: 実行時の設定変更と即座の反映
3. **イベント駆動**: 設定変更の通知による疎結合
4. **高度なマージ**: 6種類の配列マージ戦略
5. **ゼロ依存**: Node.js標準ライブラリのみ使用

### 設定の優先順位（高→低）
```
1. CLI引数         - コマンドライン指定
2. 環境変数        - CCTOP_* プレフィックス
3. ユーザー設定    - ~/.cctop/config.json
4. プロファイル    - ~/.cctop/profiles/*.json
5. デフォルト      - ハードコード値
```

## 🏗️ アーキテクチャ

### モジュール構成（実装準拠）

```
src/config/
├── config-manager.js    # 中核：設定管理の統括
├── config-loader.js     # ファイル読み込みとキャッシュ
├── config-merger.js     # 高度なマージ処理
└── defaults.js          # デフォルト設定と検証
```

### モジュール間の依存関係

```
┌─────────────────────────────────────────────────┐
│                ConfigManager                     │
│  - 5層階層管理                                  │
│  - EventEmitterベース                           │
│  - 動的更新・監視                               │
└──────────┬──────────────────┬───────────────────┘
           │                  │
           ▼                  ▼
┌──────────────────┐  ┌──────────────────┐
│  ConfigLoader    │  │    defaults      │
│  - ファイル読込  │  │  - デフォルト値  │
│  - プロファイル  │  │  - 環境別設定    │
│  - キャッシュ    │  │  - 検証機能      │
└──────────────────┘  └──────────────────┘
           │                  │
           └──────┬───────────┘
                  ▼
          ┌──────────────────┐
          │  ConfigMerger    │
          │  - 6種類の戦略   │
          │  - カスタムルール│
          │  - 競合追跡      │
          └──────────────────┘
```

## 📊 詳細仕様

### ConfigManager（中核モジュール）

#### 責務
- 設定の階層的管理と統合
- 動的な設定更新の制御
- 設定変更イベントの発行
- 各層の設定のマージ

#### 主要API
```javascript
class ConfigManager extends EventEmitter {
  // 設定の読み込み
  async load(options = {}) {
    // options.configPath: 設定ファイルパス
    // options.profile: プロファイル名
    // options.cliOptions: CLI引数オブジェクト
    return config;
  }

  // 設定値の取得
  get(keyPath, defaultValue = null) {
    // keyPath: 'database.timeout' のようなドット記法
    return value;
  }

  // 設定値の更新
  set(keyPath, value, layer = 'runtime') {
    // layer: 'cli', 'env', 'user', 'profile', 'default'
    this.emit('changed', keyPath, value, oldValue);
  }

  // 設定変更の監視
  watch(keyPath, callback) {
    // callback: (newValue, oldValue, keyPath) => void
    return unsubscribe;
  }

  // 全設定の取得
  getAll() {
    return this.mergedConfig;
  }

  // 設定の再読み込み
  async reload() {
    this.emit('reloaded', this.mergedConfig);
  }
}
```

#### イベント
| イベント名 | 発生タイミング | パラメータ |
|-----------|---------------|-----------|
| loaded | 初回読み込み完了 | (config) |
| changed | 設定値変更 | (keyPath, newValue, oldValue) |
| reloaded | 再読み込み完了 | (config) |
| error | エラー発生 | (error) |

### ConfigLoader（ファイル読み込み）

#### 責務
- 設定ファイルの検索と読み込み
- JSON/JSファイルのサポート
- プロファイル継承の解決
- 読み込みキャッシュ管理

#### 主要API
```javascript
class ConfigLoader {
  // 設定ファイルの読み込み
  async loadConfigFile(filePath, options = {}) {
    // options.throwOnError: エラー時に例外をスロー
    // options.expandPaths: パス展開を実行
    return configObject;
  }

  // プロファイルの読み込み（継承対応）
  async loadProfile(profileName, profilesDir) {
    // 'extends' フィールドによる継承チェーン解決
    return mergedProfile;
  }

  // 標準的な場所での設定ファイル検索
  async findConfigFiles(configName, searchPaths) {
    // 検索パス: cwd, ~/.cctop, ~/.config/cctop, /etc/cctop
    return foundFiles[];
  }
}
```

#### キャッシュ仕様
- TTL: 60秒
- キー: ファイルパス
- 無効化: mtime変更検出

### ConfigMerger（高度なマージ）

#### 責務
- 複雑な設定オブジェクトのマージ
- 6種類の配列マージ戦略
- カスタムマージルール
- マージ競合の追跡

#### 配列マージ戦略
```javascript
const arrayStrategies = {
  'replace': (target, source) => source,              // 完全置換
  'append': (target, source) => [...target, ...source],     // 末尾追加
  'prepend': (target, source) => [...source, ...target],    // 先頭追加
  'merge': (target, source) => /* インデックス毎マージ */,
  'unique': (target, source) => /* 重複除去 */,
  'concat-unique': (target, source) => /* 順序保持＋重複除去 */
};
```

#### カスタムマージルール
```javascript
merger.addCustomRule('display.theme', (target, source, path) => {
  // パス固有のマージロジック
  return mergedValue;
});
```

### defaults（基本設定）

#### 責務
- システムのデフォルト設定値定義
- 環境別設定のオーバーライド
- パス展開機能（~/の解決）
- 設定構造の基本検証

#### デフォルト設定構造
```javascript
const DEFAULT_CONFIG = {
  monitoring: {
    watchPaths: ['.'],
    excludePatterns: [
      '/node_modules/', '/\\.git/', '/\\.DS_Store/',
      '/\\.cctop/', '/coverage/', '/\\.log$/'
    ],
    debounceMs: 100,
    maxDepth: 10
  },
  database: {
    path: '~/.cctop/activity.db',
    mode: 'WAL',
    timeout: 5000
  },
  cache: {
    eventTypeCache: {
      maxSize: 1000,
      ttlMs: 1800000  // 30分
    },
    statisticsCache: {
      maxSize: 500,
      ttlMs: 1800000
    },
    persistentCache: {
      enabled: true,
      path: '~/.cctop/cache/persistent-cache.db',
      defaultTtlMs: 1800000
    }
  },
  display: {
    refreshRateMs: 16,  // 60fps
    maxLines: 50,
    theme: 'default',
    showTimestamps: true,
    compactMode: false
  }
};
```

## 🔌 統合仕様

### 初期化フロー

```javascript
// 1. bin/cctopでの初期化
const configManager = new ConfigManager();
const config = await configManager.load({
  configPath: program.config,
  profile: program.profile,
  cliOptions: {
    'monitoring.watchPaths': program.args,
    'database.path': program.database,
    'display.maxLines': program.lines
  }
});

// 2. CCTopServiceへの伝播
const service = new CCTopService(configManager);

// 3. 各サービスへの設定注入
const cacheManager = new CacheManager(config.cache);
const dbManager = new DatabaseManager(config.database);
const fileWatcher = new FileWatcher(config.monitoring);
```

### 動的更新の実装

```javascript
// CCTopServiceでの設定変更監視
configManager.on('changed', (keyPath, newValue) => {
  switch(keyPath) {
    case 'monitoring.watchPaths':
      this.fileWatcher.updateWatchPaths(newValue);
      break;
    case 'monitoring.excludePatterns':
      this.fileWatcher.updateIgnorePatterns(newValue);
      break;
    case 'cache':
      this.updateCacheConfigs(newValue);
      break;
  }
});
```

### 必須実装要件

#### FileWatcher統合
```javascript
// FileWatcherクラスに以下のメソッドが必須
class FileWatcher {
  updateIgnorePatterns(patterns) {
    this.ignorePatterns = patterns.map(p => new RegExp(p));
    if (this.watcher) {
      this.restart();
    }
  }
}
```

## 🔧 環境変数マッピング

| 環境変数 | 設定キー | 型 | 例 |
|---------|---------|----|----|
| CCTOP_WATCH_PATHS | monitoring.watchPaths | string[] | "./src,./docs" |
| CCTOP_EXCLUDE_PATTERNS | monitoring.excludePatterns | string[] | "*.tmp,*.log" |
| CCTOP_DB_PATH | database.path | string | "/tmp/cctop.db" |
| CCTOP_DB_MODE | database.mode | string | "WAL" |
| CCTOP_MAX_LINES | display.maxLines | number | "100" |
| CCTOP_THEME | display.theme | string | "compact" |

## 📝 設定ファイル形式

### JSON形式（推奨）
```json
{
  "version": "1.0.0",
  "profile": "development",
  "monitoring": {
    "watchPaths": ["./src", "./test"],
    "debounceMs": 50
  },
  "cache": {
    "eventTypeCache": {
      "maxSize": 2000
    }
  }
}
```

### JavaScript形式（動的設定）
```javascript
module.exports = {
  monitoring: {
    watchPaths: process.env.NODE_ENV === 'test' 
      ? ['./test'] 
      : ['./src'],
    excludePatterns: require('./custom-excludes')
  }
};
```

## 🚨 既知の問題と対策

### 1. キャッシュ機能の不具合
**問題**: ConfigLoaderのキャッシュが機能していない  
**原因**: キャッシュキー生成またはmtimeチェックの不具合  
**対策**: キャッシュロジックのデバッグと修正

### 2. プロファイル適用順序
**問題**: プロファイル設定がデフォルト値で上書きされる  
**原因**: マージ順序の誤り  
**対策**: mergeLayers()での層の順序確認

### 3. 設定ファイル検索の重複
**問題**: 同じファイルが複数回検出される  
**原因**: 検索パスの重複  
**対策**: 検索結果の重複排除

## 📊 パフォーマンス要件

| 操作 | 目標値 | 現状 | 備考 |
|------|--------|------|------|
| 初回読み込み | <10ms | 3ms | ✅ 達成 |
| キャッシュヒット | <1ms | N/A | ❌ 未達成 |
| 設定取得 | <0.1ms | 0ms | ✅ 達成 |
| 動的更新 | <5ms | 未測定 | - |

## 🔄 バージョン履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| 2.0 | 2025-06-22 | 実装準拠の全面改訂 |
| 1.0 | 2025-06-22 | 初版（8モジュール想定） |

---

**次のステップ**: 統合仕様書（s001）の作成