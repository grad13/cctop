# s001: Integration Architecture Specification

**作成日**: 2025-06-22 12:10  
**作成者**: Architect Agent  
**対象**: cctopシステムの統合アーキテクチャ  
**目的**: モジュール間の連携と統合方法を明確化

## 📋 概要

本仕様書は、cctopシステムの各モジュールがどのように統合され、相互に連携するかを定義する。特に設定システム（ConfigManager）を中心とした統合アーキテクチャを明確化し、現在の統合問題を解決する。

## 🏗️ システム全体アーキテクチャ

### レイヤー構成

```
┌─────────────────────────────────────────────────────┐
│                  bin/cctop                          │
│              （エントリーポイント）                 │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│                CCTopService                         │
│            （サービス統合層）                       │
│  ┌─────────────────────────────────────────────┐  │
│  │           ConfigManager                      │  │
│  │        （設定管理・中央制御）                │  │
│  └─────────────────────────────────────────────┘  │
└─────┬──────────┬──────────┬──────────┬────────────┘
      │          │          │          │
┌─────▼────┐ ┌──▼────┐ ┌──▼────┐ ┌──▼────┐
│Database  │ │File   │ │Cache  │ │Display│
│Manager   │ │Watcher│ │Manager│ │Manager│
└──────────┘ └───────┘ └───────┘ └───────┘
```

### データフローとイベントフロー

```
設定フロー:
ConfigManager ──config──> 各Manager
     │
     └──change event──> CCTopService ──update──> 各Manager

データフロー:
FileWatcher ──events──> EventManager ──> DatabaseManager
                            │
                            └──> CacheManager ──> DisplayManager
```

## 📊 モジュール間インターフェース

### 1. 初期化順序と依存関係

```javascript
// 正しい初期化順序
1. ConfigManager     // 設定の読み込み
2. DatabaseManager   // データベース接続
3. CacheManager      // キャッシュ初期化
4. FileWatcher       // ファイル監視開始
5. DisplayManager    // UI初期化
6. CCTopService      // 統合サービス開始
```

### 2. ConfigManager統合仕様

#### 初期化時の設定伝播
```javascript
// bin/cctop
const configManager = new ConfigManager();
const config = await configManager.load({
  configPath: options.config,
  profile: options.profile,
  cliOptions: extractCliOptions(options)
});

// CCTopService初期化
const service = new CCTopService(configManager);
await service.initialize();
```

#### CCTopServiceでの統合実装
```javascript
class CCTopService {
  constructor(configManager) {
    this.configManager = configManager;
    this.config = configManager.getAll();
    this.services = {};
  }

  async initialize() {
    // 1. データベース初期化
    this.services.database = new DatabaseManager(this.config.database);
    await this.services.database.initialize();

    // 2. キャッシュマネージャー初期化
    this.services.cacheManagers = {
      eventType: new EventTypeCacheManager(this.config.cache.eventTypeCache),
      statistics: new StatisticsCacheManager(this.config.cache.statisticsCache),
      persistent: new PersistentCacheManager(this.config.cache.persistentCache)
    };

    // 3. ファイル監視初期化
    this.services.fileWatcher = new FileWatcher(this.config.monitoring);
    
    // 4. イベントマネージャー初期化
    this.services.eventManager = new EventManager(
      this.services.database,
      this.services.cacheManagers
    );

    // 5. 表示マネージャー初期化
    this.services.displayManager = new DisplayManager(this.config.display);

    // 6. 設定変更監視の設定
    this.setupConfigWatchers();

    // 7. サービス間の接続
    this.connectServices();
  }

  setupConfigWatchers() {
    // 監視パスの動的更新
    this.configManager.watch('monitoring.watchPaths', (newPaths) => {
      this.services.fileWatcher.updateWatchPaths(newPaths);
    });

    // 除外パターンの動的更新
    this.configManager.watch('monitoring.excludePatterns', (newPatterns) => {
      this.services.fileWatcher.updateIgnorePatterns(newPatterns);
    });

    // キャッシュ設定の動的更新
    this.configManager.watch('cache', (newCacheConfig) => {
      this.updateCacheConfigs(newCacheConfig);
    });

    // 表示設定の動的更新
    this.configManager.watch('display', (newDisplayConfig) => {
      this.services.displayManager.updateConfig(newDisplayConfig);
    });
  }

  connectServices() {
    // FileWatcher -> EventManager
    this.services.fileWatcher.on('file-event', (event) => {
      this.services.eventManager.processEvent(event);
    });

    // EventManager -> DisplayManager
    this.services.eventManager.on('stats-updated', (stats) => {
      this.services.displayManager.updateStats(stats);
    });
  }
}
```

### 3. 各サービスの統合要件

#### DatabaseManager
```javascript
class DatabaseManager {
  constructor(config) {
    this.config = config;
    this.dbPath = config.path;
    this.pragmas = {
      journal_mode: config.mode || 'WAL',
      busy_timeout: config.timeout || 5000,
      foreign_keys: 'ON'
    };
  }

  async initialize() {
    await this.connect();
    await this.applyPragmas();
    await this.createTables();
  }

  updateConfig(newConfig) {
    // データベース設定は再起動が必要
    console.warn('Database config change requires restart');
  }
}
```

#### FileWatcher（必須実装）
```javascript
class FileWatcher extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.watchPaths = config.watchPaths || ['.'];
    this.ignorePatterns = this.compilePatterns(config.excludePatterns);
    this.watcher = null;
  }

  // 🔴 必須実装メソッド
  updateIgnorePatterns(patterns) {
    this.ignorePatterns = this.compilePatterns(patterns);
    if (this.watcher) {
      // 既存の監視を停止して再起動
      this.restart();
    }
  }

  updateWatchPaths(paths) {
    this.watchPaths = paths;
    if (this.watcher) {
      this.restart();
    }
  }

  compilePatterns(patterns) {
    return patterns.map(pattern => {
      // 文字列パターンを正規表現に変換
      if (pattern.startsWith('/') && pattern.endsWith('/')) {
        return new RegExp(pattern.slice(1, -1));
      }
      return new RegExp(pattern);
    });
  }

  async restart() {
    await this.stop();
    await this.start();
  }
}
```

#### CacheManager統合
```javascript
class EventTypeCacheManager {
  constructor(config) {
    this.maxSize = config.maxSize || 1000;
    this.ttl = config.ttl || config.ttlMs || 30 * 60 * 1000;
    this.cache = new Map();
  }

  updateConfig(newConfig) {
    this.maxSize = newConfig.maxSize || this.maxSize;
    this.ttl = newConfig.ttl || newConfig.ttlMs || this.ttl;
    // 必要に応じてキャッシュをクリア
    if (newConfig.maxSize < this.maxSize) {
      this.evictExcess();
    }
  }
}

// StatisticsCacheManagerの修正
class StatisticsCacheManager {
  constructor(config) {
    // 🔴 キー名の統一: maxEntries -> maxSize
    this.maxSize = config.maxSize || 100;
    this.ttl = config.ttl || config.ttlMs || 30 * 60 * 1000;
  }
}
```

## 🔄 イベント仕様

### システムイベント一覧

| 発行元 | イベント名 | データ | 購読者 |
|--------|-----------|--------|--------|
| ConfigManager | changed | {keyPath, newValue, oldValue} | CCTopService |
| FileWatcher | file-event | {type, path, stats} | EventManager |
| EventManager | stats-updated | {stats} | DisplayManager |
| EventManager | event-stored | {event} | CacheManagers |
| DisplayManager | render-complete | {frameTime} | MetricsCollector |

### エラーイベント処理
```javascript
// 統一的なエラー処理
class CCTopService {
  setupErrorHandlers() {
    // 各サービスのエラーを集約
    Object.values(this.services).forEach(service => {
      if (service && service.on) {
        service.on('error', (error) => {
          this.handleServiceError(service.constructor.name, error);
        });
      }
    });

    // ConfigManagerのエラー
    this.configManager.on('error', (error) => {
      this.handleConfigError(error);
    });
  }

  handleServiceError(serviceName, error) {
    console.error(`[${serviceName}] Error:`, error);
    // エラーレベルに応じた処理
    if (error.fatal) {
      this.shutdown();
    }
  }
}
```

## 📋 統合チェックリスト

### 必須実装項目
- [ ] FileWatcher.updateIgnorePatterns()メソッド
- [ ] StatisticsCacheManager: maxEntries → maxSize
- [ ] DatabaseManagerへの設定オブジェクト渡し
- [ ] エラーイベントの統一処理

### 推奨実装項目
- [ ] 設定変更時の検証
- [ ] サービス間の循環参照チェック
- [ ] グレースフルシャットダウン
- [ ] 設定のホットリロード通知

## 🚨 一般的な統合問題と解決策

### 1. 初期化順序の問題
**問題**: サービスAがサービスBに依存するが、Bが未初期化  
**解決**: 明確な初期化順序の定義と遵守

### 2. 設定伝播の遅延
**問題**: 設定変更が一部のサービスに反映されない  
**解決**: イベント駆動による確実な通知

### 3. メモリリーク
**問題**: イベントリスナーの解除忘れ  
**解決**: サービス停止時のクリーンアップ処理

### 4. 設定の不整合
**問題**: 動的更新中の一時的な不整合状態  
**解決**: トランザクション的な設定更新

## 📊 パフォーマンス考慮事項

### 設定更新のコスト
- 軽量な更新（表示設定等）: 即座に反映
- 重い更新（データベース設定等）: 再起動を推奨
- 中間的な更新（キャッシュ設定等）: 段階的な適用

### イベント処理の最適化
```javascript
// バッチ処理による最適化
class EventManager {
  constructor() {
    this.eventQueue = [];
    this.batchTimer = null;
  }

  processEvent(event) {
    this.eventQueue.push(event);
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processBatch();
      }, 10); // 10msのデバウンス
    }
  }

  processBatch() {
    const events = this.eventQueue.splice(0);
    // バッチ処理
    this.batchTimer = null;
  }
}
```

## 🔧 テスト戦略

### 統合テストシナリオ
1. **設定伝播テスト**: ConfigManager → 各サービス
2. **動的更新テスト**: 実行時の設定変更
3. **エラー伝播テスト**: サービス障害時の動作
4. **パフォーマンステスト**: 大量イベント時の性能

### モックとスタブ
```javascript
// 統合テスト用のモック
class MockConfigManager extends EventEmitter {
  constructor(initialConfig) {
    super();
    this.config = initialConfig;
  }

  get(key, defaultValue) {
    return _.get(this.config, key, defaultValue);
  }

  simulateChange(key, value) {
    this.emit('changed', key, value);
  }
}
```

---

**次のステップ**: API仕様書（s002）の作成