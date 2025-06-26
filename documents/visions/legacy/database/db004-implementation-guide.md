# Database Implementation Guide

**作成日**: 2025-06-21  
**作成者**: Inspector Agent  
**対象**: データベース実装の具体的ガイド

## 🛠️ 実装フェーズ

### Phase 1: スキーマ作成
1. **テーブル作成**: マスターテーブル → メインテーブル → 統計テーブル
2. **インデックス作成**: パフォーマンス最適化
3. **トリガー実装**: リアルタイム統計更新
4. **初期データ投入**: event_types, period_types

### Phase 2: CRUD操作実装
1. **基本操作**: insertEvent, getLatestEvents, getObjectStatistics
2. **統計API**: getTopObjects, getPeriodStatistics
3. **キャッシュ管理**: updateObjectCache, refreshCache

### Phase 3: 最適化・監視
1. **パフォーマンス監視**: クエリ実行時間測定
2. **統計精度検証**: トリガー vs 手動計算の比較
3. **データ整合性チェック**: 定期的な整合性確認

## 💻 コード実装例

### DatabaseManager クラス設計

```javascript
class DatabaseManager {
  constructor(dbPath = './cctop.db') {
    this.dbPath = dbPath;
    this.db = null;
  }

  async initialize() {
    const Database = require('better-sqlite3');
    this.db = new Database(this.dbPath);
    
    // WALモード有効化（パフォーマンス向上）
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    
    await this.createTables();
    await this.createIndexes();
    await this.createTriggers();
    await this.initializeEventTypes();
    await this.initializePeriodTypes();
  }

  async createTables() {
    const schema = require('./schema-sql');
    
    // マスターテーブル優先
    this.db.exec(schema.EVENT_TYPES);
    this.db.exec(schema.PERIOD_TYPES);
    
    // メインテーブル
    this.db.exec(schema.OBJECT_FINGERPRINT);
    this.db.exec(schema.EVENTS);
    
    // 統計・キャッシュテーブル
    this.db.exec(schema.OBJECT_STATISTICS);
    this.db.exec(schema.OBJECT_STATISTICS_BY_PERIOD);
    this.db.exec(schema.FILE_OBJECTS_CACHE);
  }

  async createIndexes() {
    const indexes = require('./indexes-sql');
    indexes.ALL_INDEXES.forEach(sql => this.db.exec(sql));
  }

  async createTriggers() {
    const triggers = require('./triggers-sql');
    this.db.exec(triggers.CACHE_UPDATE_TRIGGER);
    this.db.exec(triggers.STATISTICS_UPDATE_TRIGGER);
  }
}
```

### Object管理システム

```javascript
class ObjectManager {
  constructor(db) {
    this.db = db;
    this.getObjectStmt = db.prepare(`
      SELECT id as object_id FROM object_fingerprint 
      WHERE hash = ?
    `);
    this.createObjectStmt = db.prepare(`
      INSERT INTO object_fingerprint (hash, inode)
      VALUES (?, ?)
    `);
  }

  async getOrCreateObjectId(fileHash, inode) {
    // 1. 既存object検索
    const existing = this.getObjectStmt.get(fileHash);
    if (existing) {
      return existing.object_id;
    }

    // 2. 新規object作成
    const result = this.createObjectStmt.run(fileHash, inode);
    return result.lastInsertRowid;
  }
}
```

### イベント挿入システム

```javascript
class EventManager {
  constructor(db) {
    this.db = db;
    this.insertEventStmt = db.prepare(`
      INSERT INTO events (
        timestamp, event_type_id, object_id, file_path, file_name, directory,
        previous_event_id, source_path, file_size, line_count, block_count,
        line_count_delta, block_count_delta, session_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
  }

  async insertEvent(eventData) {
    // chokidar統合: stats.mtimeを使用
    const result = this.insertEventStmt.run([
      eventData.timestamp,  // chokidarのstats.mtime
      eventData.event_type_id,
      eventData.object_id,
      eventData.file_path,
      eventData.file_name,
      eventData.directory,
      eventData.previous_event_id,
      eventData.source_path,
      eventData.file_size,
      eventData.line_count,
      eventData.block_count,
      eventData.line_count_delta,
      eventData.block_count_delta,
      eventData.session_id
    ]);

    return { id: result.lastInsertRowid };
  }
}
```

### 統計取得API

```javascript
class StatisticsManager {
  constructor(db) {
    this.db = db;
    this.topObjectsStmt = db.prepare(`
      SELECT 
        current_file_name,
        current_file_path,
        total_events,
        total_modifications,
        total_line_changes
      FROM object_complete_view
      WHERE total_events > 0
      ORDER BY total_events DESC 
      LIMIT ?
    `);
  }

  getTopObjectsByEvents(limit = 10) {
    return this.topObjectsStmt.all(limit);
  }

  getPeriodStatistics(objectId) {
    const stmt = this.db.prepare(`
      SELECT 
        tp.period_name,
        ops.window_start,
        ops.window_end,
        ops.event_count,
        ops.line_changes,
        ops.block_changes
      FROM object_statistics_by_period ops
      JOIN period_types tp ON ops.period_id = tp.period_id
      WHERE ops.object_id = ?
      ORDER BY tp.duration_minutes, ops.window_start DESC
    `);
    return stmt.all(objectId);
  }
}
```

## 🔄 chokidar統合実装

```javascript
const chokidar = require('chokidar');

class FileWatcher {
  constructor(databaseManager) {
    this.db = databaseManager;
    this.objectManager = new ObjectManager(databaseManager.db);
    this.eventManager = new EventManager(databaseManager.db);
  }

  async startWatching(watchPath) {
    const watcher = chokidar.watch(watchPath, {
      ignored: /[\/\\]\./,
      persistent: true
    });

    watcher.on('change', async (path, stats) => {
      if (stats) {
        await this.handleFileEvent('modify', path, stats);
      }
    });

    watcher.on('add', async (path, stats) => {
      if (stats) {
        await this.handleFileEvent('create', path, stats);
      }
    });

    // move/rename検出は別途実装
  }

  async handleFileEvent(eventType, filePath, stats) {
    try {
      // 1. ファイルハッシュ計算
      const fileHash = await this.calculateFileHash(filePath);
      
      // 2. ObjectID取得または作成
      const objectId = await this.objectManager.getOrCreateObjectId(
        fileHash, 
        stats.ino
      );

      // 3. 行数・ブロック数計算
      const lineCount = await this.calculateLineCount(filePath);
      const blockCount = await this.calculateBlockCount(filePath);

      // 4. 変化量計算
      const lineCountDelta = await this.calculateLineCountDelta(objectId, lineCount);

      // 5. イベント挿入
      const eventData = {
        timestamp: stats.mtime,  // 🔄 chokidarの実際のファイル変更時刻
        event_type_id: this.getEventTypeId(eventType),
        object_id: objectId,
        file_path: filePath,
        file_name: path.basename(filePath),
        directory: path.dirname(filePath),
        file_size: stats.size,
        line_count: lineCount,
        block_count: blockCount,
        line_count_delta: lineCountDelta,
        session_id: this.getSessionId()
      };

      await this.eventManager.insertEvent(eventData);
      
    } catch (error) {
      console.error('File event handling error:', error);
    }
  }
}
```

## 📊 パフォーマンス監視

```javascript
class PerformanceMonitor {
  constructor(db) {
    this.db = db;
    this.metrics = {
      eventInsertTime: [],
      queryTimes: {},
      triggerExecutionTime: []
    };
  }

  measureEventInsert(fn) {
    return this.measurePerformance(fn, 'eventInsert');
  }

  measureQuery(queryName, fn) {
    return this.measurePerformance(fn, queryName);
  }

  async measurePerformance(fn, operation) {
    const start = process.hrtime.bigint();
    const result = await fn();
    const end = process.hrtime.bigint();
    
    const durationMs = Number(end - start) / 1000000;
    
    if (!this.metrics.queryTimes[operation]) {
      this.metrics.queryTimes[operation] = [];
    }
    this.metrics.queryTimes[operation].push(durationMs);
    
    return result;
  }

  getPerformanceReport() {
    const report = {};
    
    for (const [operation, times] of Object.entries(this.metrics.queryTimes)) {
      if (times.length > 0) {
        report[operation] = {
          count: times.length,
          avgMs: times.reduce((a, b) => a + b, 0) / times.length,
          maxMs: Math.max(...times),
          minMs: Math.min(...times)
        };
      }
    }
    
    return report;
  }
}
```

## 🧪 テスト戦略

### ユニットテスト例

```javascript
// database-manager.test.js
describe('DatabaseManager', () => {
  let db;

  beforeEach(async () => {
    db = new DatabaseManager(':memory:');
    await db.initialize();
  });

  test('should create all tables', () => {
    const tables = db.db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table'
    `).all();
    
    const tableNames = tables.map(t => t.name);
    expect(tableNames).toContain('events');
    expect(tableNames).toContain('object_fingerprint');
    expect(tableNames).toContain('object_statistics');
  });

  test('should insert event and update statistics via trigger', async () => {
    // ObjectID作成
    const objectId = await db.objectManager.getOrCreateObjectId('hash123', 12345);
    
    // イベント挿入
    await db.eventManager.insertEvent({
      timestamp: new Date().toISOString(),
      event_type_id: 3, // modify
      object_id: objectId,
      file_path: '/test/file.js',
      file_name: 'file.js',
      directory: '/test',
      file_size: 1000,
      line_count: 50,
      block_count: 5,
      line_count_delta: 10,
      session_id: 'test-session'
    });
    
    // 統計が自動更新されているか確認
    const stats = db.db.prepare(`
      SELECT total_events, total_modifications, total_line_changes
      FROM object_statistics WHERE object_id = ?
    `).get(objectId);
    
    expect(stats.total_events).toBe(1);
    expect(stats.total_modifications).toBe(1);
    expect(stats.total_line_changes).toBe(10);
  });
});
```

## 🔄 マイグレーション管理

### 基本マイグレーションシステム
```javascript
// src/database/migration-manager.js
class MigrationManager {
  constructor(db) {
    this.db = db;
    this.initializeMigrationTable();
  }
  
  initializeMigrationTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        description TEXT NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
  
  getCurrentVersion() {
    const result = this.db.prepare(`
      SELECT MAX(version) as version FROM schema_migrations
    `).get();
    return result.version || 1; // MVP starts at version 1
  }
  
  recordMigration(version, description) {
    this.db.prepare(`
      INSERT INTO schema_migrations (version, description) 
      VALUES (?, ?)
    `).run(version, description);
  }
  
  needsMigration(targetVersion) {
    return this.getCurrentVersion() < targetVersion;
  }
}
```

### MVP初期化時の自動バージョン設定
```javascript
// DatabaseManager初期化時
async initialize() {
  const Database = require('better-sqlite3');
  this.db = new Database(this.dbPath);
  
  // WALモード有効化
  this.db.pragma('journal_mode = WAL');
  this.db.pragma('synchronous = NORMAL');
  
  // マイグレーション管理初期化
  this.migrationManager = new MigrationManager(this.db);
  
  // スキーマ作成
  await this.createTables();
  await this.createIndexes();
  await this.createTriggers();
  await this.initializeEventTypes();
  
  // MVP版をバージョン1として記録
  if (this.migrationManager.getCurrentVersion() === 0) {
    this.migrationManager.recordMigration(1, 'Initial MVP schema');
  }
}
```

### 将来の期間統計追加時
```javascript
// 期間統計機能追加時（Next Phase）
async upgradeToPeriodStatistics() {
  if (this.migrationManager.needsMigration(2)) {
    console.log('🔄 Adding period statistics functionality...');
    
    // migration-002.js の内容を実行
    const migration002 = require('./migrations/002-add-period-statistics');
    migration002.up(this.db);
    
    this.migrationManager.recordMigration(2, 'Add period statistics tables and triggers');
    console.log('✅ Period statistics migration completed');
  }
}
```

### package.jsonスクリプト
```json
{
  "scripts": {
    "migration:status": "node scripts/migration-status.js",
    "migration:run": "node scripts/migration-runner.js",
    "migration:rollback": "node scripts/migration-rollback.js"
  }
}
```

---

*関連文書*:
- `schema-design.md`: テーブル定義
- `triggers-and-indexes.md`: トリガーとインデックス定義
- `queries-and-views.md`: 主要クエリパターン
- `next-phase-period-statistics.md`: 期間統計マイグレーション計画