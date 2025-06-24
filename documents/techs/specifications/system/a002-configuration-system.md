# Configuration System Specification

**作成日**: 2025-06-22 03:25  
**管理者**: Inspector Agent  
**対象**: cctop設定システム仕様

## 📋 概要

cctopの設定システムは、ユーザビリティと柔軟性を両立させた階層的設定管理を提供します。

## 🏗️ 設定階層

### 1. 設定優先順位
```
コマンドライン引数 > 環境変数 > ユーザー設定ファイル > デフォルト設定
```

### 2. 設定ファイル配置
```
~/.cctop/
├── config.json            # メイン設定ファイル
├── profiles/              # プロファイル設定
│   ├── development.json   # 開発環境用
│   ├── production.json    # 本番環境用
│   └── custom.json        # カスタム設定
├── plugin/                # プラグイン用
├── activity.db            # データベース（既存）
└── cache/                 # キャッシュディレクトリ
    └── persistent-cache.db
```

## ⚙️ 設定項目定義

### コア設定（config.json）
```json
{
  "version": "1.0.0",
  "profile": "default",
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
    "includeHidden": false,
    "debounceMs": 100,
    "maxDepth": 10
  },
  "database": {
    "path": "~/.cctop/activity.db",
    "mode": "WAL",
    "timeout": 5000,
    "backupInterval": 3600000
  },
  "cache": {
    "eventTypeCache": {
      "maxSize": 1000,
      "ttlMs": 1800000
    },
    "statisticsCache": {
      "maxSize": 500,
      "ttlMs": 1800000
    },
    "persistentCache": {
      "enabled": true,
      "path": "~/.cctop/cache/persistent-cache.db",
      "defaultTtlMs": 1800000
    },
    "backgroundLoader": {
      "debounceMs": 50,
      "maxBatchSize": 100
    }
  },
  "display": {
    "refreshRateMs": 16,
    "maxLines": 50,
    "theme": "default",
    "showTimestamps": true,
    "compactMode": false,
    "colorEnabled": true
  },
  "performance": {
    "enableMetrics": false,
    "logLevel": "info",
    "maxMemoryMB": 512,
    "gcInterval": 60000
  }
}
```

### プロファイル設定例（profiles/development.json）
```json
{
  "extends": "default",
  "monitoring": {
    "excludePatterns": [
      "/node_modules/",
      "/\\.git/",
      "/\\.DS_Store/",
      "/coverage/",
      "/\\.log$/",
      "/test-*/"
    ],
    "debounceMs": 50
  },
  "performance": {
    "enableMetrics": true,
    "logLevel": "debug"
  },
  "display": {
    "maxLines": 100,
    "compactMode": true
  }
}
```

## 🔧 環境変数サポート

### 主要環境変数
```bash
# 設定ファイル関連
CCTOP_CONFIG_DIR=~/.cctop           # 設定ディレクトリ
CCTOP_PROFILE=development           # 使用プロファイル
CCTOP_CONFIG_FILE=/path/config.json # 設定ファイル直接指定

# 監視設定
CCTOP_WATCH_PATHS=./src,./docs      # 監視パス（カンマ区切り）
CCTOP_EXCLUDE_PATTERNS=node_modules,*.tmp  # 除外パターン
CCTOP_MAX_DEPTH=5                   # 最大監視深度

# データベース設定
CCTOP_DB_PATH=/tmp/cctop.db         # データベースパス
CCTOP_DB_MODE=WAL                   # データベースモード

# キャッシュ設定
CCTOP_CACHE_ENABLED=true            # キャッシュ有効化
CCTOP_CACHE_TTL=1800000             # キャッシュTTL（ms）

# 表示設定
CCTOP_MAX_LINES=30                  # 最大表示行数
CCTOP_THEME=compact                 # テーマ名
CCTOP_COLOR_ENABLED=false           # カラー出力

# パフォーマンス設定
CCTOP_LOG_LEVEL=warn               # ログレベル
CCTOP_ENABLE_METRICS=true          # メトリクス有効化
```

## 📝 コマンドライン引数

### 基本構文
```bash
./bin/cctop [command] [options]
```

### 設定関連オプション
```bash
# 設定ファイル・プロファイル
--config, -c <path>        # 設定ファイル指定
--profile, -p <name>       # プロファイル指定
--config-dir <path>        # 設定ディレクトリ指定

# 監視設定
--watch <paths>            # 監視パス指定（複数可）
--exclude <patterns>       # 除外パターン指定
--include-hidden          # 隠しファイル監視
--max-depth <num>         # 最大監視深度

# データベース設定
--db-path <path>          # データベースパス
--db-mode <mode>          # データベースモード

# 表示設定
--max-lines <num>         # 最大表示行数
--theme <name>            # テーマ指定
--no-color                # カラー出力無効
--compact                 # コンパクト表示
--refresh-rate <ms>       # 更新間隔

# その他
--log-level <level>       # ログレベル
--enable-metrics          # メトリクス有効化
--help, -h                # ヘルプ表示
--version, -v             # バージョン表示
```

## 🏛️ 設定管理アーキテクチャ

### 1. ConfigManager設計
```javascript
class ConfigManager {
  constructor() {
    this.config = {};
    this.watchers = [];
  }
  
  // 設定読み込み（階層的マージ）
  async load(options = {}) {
    const configs = [
      this.loadDefaults(),
      await this.loadUserConfig(),
      await this.loadProfile(),
      this.loadEnvironmentVariables(),
      this.loadCommandLineArgs(options)
    ];
    
    this.config = this.mergeConfigs(configs);
    return this.config;
  }
  
  // 設定取得
  get(key, defaultValue = null) {
    return this.getNestedValue(this.config, key) ?? defaultValue;
  }
  
  // 設定更新
  set(key, value) {
    this.setNestedValue(this.config, key, value);
    this.notifyWatchers(key, value);
  }
  
  // 設定監視
  watch(key, callback) {
    this.watchers.push({ key, callback });
  }
}
```

### 2. 設定バリデーション
```javascript
const configSchema = {
  monitoring: {
    watchPaths: { type: 'array', items: 'string', required: true },
    excludePatterns: { type: 'array', items: 'string' },
    debounceMs: { type: 'number', min: 0, max: 10000 },
    maxDepth: { type: 'number', min: 1, max: 50 }
  },
  database: {
    path: { type: 'string', required: true },
    mode: { type: 'string', enum: ['WAL', 'DELETE', 'TRUNCATE'] }
  },
  display: {
    maxLines: { type: 'number', min: 1, max: 1000 },
    refreshRateMs: { type: 'number', min: 1, max: 1000 }
  }
};
```

## 🔄 動的設定更新

### 1. Hot Reload対応
- 設定ファイル変更の自動検出
- 影響範囲の分析と部分再起動
- 設定変更の即座反映

### 2. 変更可能項目
```javascript
const hotReloadableKeys = [
  'display.maxLines',
  'display.refreshRateMs',
  'display.theme',
  'display.compactMode',
  'monitoring.excludePatterns',
  'monitoring.debounceMs',
  'cache.eventTypeCache.maxSize',
  'cache.statisticsCache.maxSize',
  'performance.logLevel'
];
```

## 🛠️ 実装ファイル構成

### 予定実装ファイル
```
src/config/
├── config-manager.js        # メイン設定管理クラス
├── config-loader.js         # 設定ファイル読み込み
├── config-validator.js      # 設定値検証
├── config-merger.js         # 設定マージ処理
├── environment-parser.js    # 環境変数パース
├── cli-parser.js           # コマンドライン引数パース
├── config-watcher.js       # 設定ファイル監視
└── defaults.js             # デフォルト設定定義
```

### テストファイル
```
test/unit/config/
├── config-manager.test.js
├── config-loader.test.js
├── config-validator.test.js
├── config-merger.test.js
├── environment-parser.test.js
├── cli-parser.test.js
└── config-watcher.test.js
```

## 🎯 実装優先順位

### Phase 1: 基本設定システム（高優先度）
1. **defaults.js**: デフォルト設定定義
2. **config-manager.js**: 基本的な設定管理
3. **config-loader.js**: JSON設定ファイル読み込み
4. **config-merger.js**: 設定マージ処理

### Phase 2: 拡張機能（中優先度）
5. **environment-parser.js**: 環境変数サポート
6. **cli-parser.js**: コマンドライン引数パース
7. **config-validator.js**: 設定値検証

### Phase 3: 高度機能（低優先度）
8. **config-watcher.js**: 動的設定更新
9. プロファイル機能の完全実装
10. 設定移行・アップグレード機能

## 📊 品質要件

### パフォーマンス目標
- 設定読み込み: < 10ms
- 設定取得: < 0.1ms
- 設定更新: < 1ms
- メモリ使用量: < 1MB

### テスト要件
- Unit Test: 全関数95%以上カバレッジ
- Integration Test: 実際の設定ファイルでの動作確認
- Performance Test: 大規模設定での負荷テスト

### 互換性要件
- Node.js 14.0.0以上
- 既存のcctopコマンド完全互換
- previous-v01設定からの移行サポート

---

**次のステップ**: この仕様に基づいて実装計画を策定し、Phase 1から順次実装を開始します。