# Next Phase: Period Statistics Design

**作成日**: 2025-06-21  
**作成者**: Inspector Agent  
**対象**: Period統計機能（Next Phase実装）

## 📋 概要

MVP完了後に実装する期間別統計機能の設計。Claude Codeセッションの非連続性に対応した実作業時間ベースの統計計算。

## 🎯 解決すべき課題

### セッション非連続性の問題
```
Claude Codeセッション例:
10:00-10:30 (30分)
14:00-14:15 (15分) 
16:00-16:45 (45分)
合計実作業時間: 1時間30分

従来のwindow_start/window_end方式:
window_start: 10:00, window_end: 16:45 = 6時間45分 ❌
```

**課題**:
- 実作業時間と期間の乖離
- セッション間の空白時間を除外する必要
- 正確な生産性測定の実現

## 🏗️ 設計案

### Option 1: 実作業時間蓄積型（推奨）

```sql
-- 期間タイプマスター
CREATE TABLE period_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,           -- 'hour', 'day', 'week', 'month'
  name TEXT NOT NULL,                  -- 'Hourly', 'Daily', etc.
  duration_minutes INTEGER NOT NULL,   -- 60, 1440, 10080, 43200
  description TEXT
);

-- 期間別統計（実時間ベース）
CREATE TABLE object_statistics_by_period (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  object_id INTEGER NOT NULL,
  period_id INTEGER NOT NULL,
  
  -- 論理的期間定義
  period_start DATETIME NOT NULL,      -- 期間開始（例：今日00:00）
  period_end DATETIME NOT NULL,        -- 期間終了（例：今日23:59）
  
  -- 実作業時間統計
  accumulated_work_minutes INTEGER DEFAULT 0,  -- 実際の作業時間（分）
  active_session_count INTEGER DEFAULT 0,      -- アクティブセッション数
  
  -- 期間内統計値
  event_count INTEGER DEFAULT 0,
  modification_count INTEGER DEFAULT 0,
  line_changes INTEGER DEFAULT 0,
  block_changes INTEGER DEFAULT 0,
  
  -- 効率性メトリクス
  events_per_minute REAL DEFAULT 0.0,          -- イベント/分
  lines_per_minute REAL DEFAULT 0.0,           -- 行変更/分
  
  -- メタデータ
  calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_session_id TEXT,
  
  FOREIGN KEY (object_id) REFERENCES object_fingerprint(id),
  FOREIGN KEY (period_id) REFERENCES period_types(id),
  UNIQUE(object_id, period_id, period_start)
);
```

### Option 2: セッション別統計型

```sql
-- セッション統計
CREATE TABLE session_statistics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  object_id INTEGER NOT NULL,
  session_id TEXT NOT NULL,
  
  -- セッション時間
  session_start DATETIME NOT NULL,
  session_end DATETIME NOT NULL,
  work_duration_minutes INTEGER NOT NULL,
  
  -- セッション内統計
  event_count INTEGER DEFAULT 0,
  modification_count INTEGER DEFAULT 0,
  line_changes INTEGER DEFAULT 0,
  block_changes INTEGER DEFAULT 0,
  
  FOREIGN KEY (object_id) REFERENCES object_fingerprint(id),
  UNIQUE(object_id, session_id)
);

-- 期間別統計は session_statistics から集計
```

## 🔧 実装方針

### 1. セッション管理機能
```javascript
class SessionManager {
  constructor() {
    this.currentSessionId = null;
    this.sessionStartTime = null;
    this.lastActivityTime = null;
    this.SESSION_TIMEOUT = 5 * 60 * 1000; // 5分
  }
  
  startSession() {
    this.currentSessionId = this.generateSessionId();
    this.sessionStartTime = new Date();
    this.lastActivityTime = new Date();
  }
  
  endSession() {
    if (this.currentSessionId) {
      const duration = Date.now() - this.sessionStartTime;
      this.recordSessionEnd(this.currentSessionId, duration);
      this.currentSessionId = null;
    }
  }
  
  checkSessionTimeout() {
    if (Date.now() - this.lastActivityTime > this.SESSION_TIMEOUT) {
      this.endSession();
    }
  }
}
```

### 2. 期間統計計算
```javascript
class PeriodStatisticsCalculator {
  async calculatePeriodStats(objectId, periodType, periodStart) {
    // セッション統計から期間統計を集計
    const sessions = await this.getSessionsInPeriod(
      objectId, periodStart, periodType
    );
    
    const stats = {
      accumulated_work_minutes: sessions.reduce((sum, s) => sum + s.duration, 0),
      active_session_count: sessions.length,
      event_count: sessions.reduce((sum, s) => sum + s.event_count, 0),
      // ...
    };
    
    // 効率性メトリクス計算
    if (stats.accumulated_work_minutes > 0) {
      stats.events_per_minute = stats.event_count / stats.accumulated_work_minutes;
      stats.lines_per_minute = stats.line_changes / stats.accumulated_work_minutes;
    }
    
    return stats;
  }
}
```

## 📊 期間別統計の活用例

### ダッシュボード表示
```sql
-- 今日の実作業時間と効率
SELECT 
  foc.current_file_name,
  ops.accumulated_work_minutes,
  ops.events_per_minute,
  ops.lines_per_minute,
  ops.active_session_count
FROM object_statistics_by_period ops
JOIN file_objects_cache foc ON ops.object_id = foc.object_id
JOIN period_types pt ON ops.period_id = pt.id
WHERE pt.code = 'day' 
  AND DATE(ops.period_start) = DATE('now')
ORDER BY ops.accumulated_work_minutes DESC;
```

### 週間生産性レポート
```sql
-- 週間の作業パターン分析
SELECT 
  DATE(period_start) as work_date,
  SUM(accumulated_work_minutes) as total_work_minutes,
  AVG(events_per_minute) as avg_efficiency,
  COUNT(DISTINCT object_id) as files_worked
FROM object_statistics_by_period ops
JOIN period_types pt ON ops.period_id = pt.id
WHERE pt.code = 'day'
  AND period_start >= DATE('now', '-7 days')
GROUP BY DATE(period_start)
ORDER BY work_date;
```

## 🧪 テスト戦略

### セッション管理テスト
```javascript
describe('SessionManager', () => {
  test('should handle session timeout correctly', () => {
    // 5分間隔でアクティビティなし → セッション終了
  });
  
  test('should calculate accurate work duration', () => {
    // 実際の作業時間 vs 経過時間の検証
  });
});
```

### 統計計算テスト
```javascript
describe('PeriodStatisticsCalculator', () => {
  test('should exclude gaps between sessions', () => {
    // セッション1: 10:00-10:30 (30分)
    // セッション2: 14:00-14:15 (15分)
    // 合計: 45分（4時間15分ではない）
  });
});
```

## 🔄 マイグレーション戦略

### マイグレーション要否
**✅ 既存データへの影響**: なし（安全な追加のみ）  
**⚠️ マイグレーション必要**: 新規テーブル・トリガー・インデックス追加

### マイグレーションファイル設計
```javascript
// migrations/002-add-period-statistics.js
const MIGRATION_002 = {
  version: 2,
  description: 'Add period statistics tables and triggers',
  
  up: (db) => {
    console.log('🔄 Adding period statistics functionality...');
    
    // 1. 新規テーブル作成
    db.exec(`CREATE TABLE period_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      description TEXT
    )`);
    
    db.exec(`CREATE TABLE object_statistics_by_period (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      object_id INTEGER NOT NULL,
      period_id INTEGER NOT NULL,
      period_start DATETIME NOT NULL,
      period_end DATETIME NOT NULL,
      accumulated_work_minutes INTEGER DEFAULT 0,
      active_session_count INTEGER DEFAULT 0,
      event_count INTEGER DEFAULT 0,
      modification_count INTEGER DEFAULT 0,
      line_changes INTEGER DEFAULT 0,
      block_changes INTEGER DEFAULT 0,
      events_per_minute REAL DEFAULT 0.0,
      lines_per_minute REAL DEFAULT 0.0,
      calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_session_id TEXT,
      FOREIGN KEY (object_id) REFERENCES object_fingerprint(id),
      FOREIGN KEY (period_id) REFERENCES period_types(id),
      UNIQUE(object_id, period_id, period_start)
    )`);
    
    // 2. 初期データ投入
    const insertPeriodType = db.prepare(`
      INSERT INTO period_types (code, name, duration_minutes, description) 
      VALUES (?, ?, ?, ?)
    `);
    
    const periodTypes = [
      ['hour', 'Hourly', 60, 'Hourly statistics'],
      ['day', 'Daily', 1440, 'Daily statistics'],
      ['week', 'Weekly', 10080, 'Weekly statistics'],
      ['month', 'Monthly', 43200, 'Monthly statistics']
    ];
    
    for (const [code, name, duration, description] of periodTypes) {
      insertPeriodType.run(code, name, duration, description);
    }
    
    // 3. インデックス追加
    db.exec(`CREATE INDEX idx_period_stats_window_start ON object_statistics_by_period(period_start DESC)`);
    db.exec(`CREATE INDEX idx_period_stats_event_count ON object_statistics_by_period(event_count DESC)`);
    db.exec(`CREATE INDEX idx_period_stats_work_time ON object_statistics_by_period(accumulated_work_minutes DESC)`);
    
    // 4. トリガー追加（セッション管理と連携）
    db.exec(`CREATE TRIGGER tr_update_period_statistics 
      AFTER UPDATE ON session_statistics
      FOR EACH ROW
      BEGIN
        -- 期間統計の更新ロジック
        -- セッション完了時に期間統計を再計算
      END`);
    
    console.log('✅ Period statistics migration completed');
  },
  
  down: (db) => {
    console.log('🔄 Rolling back period statistics...');
    
    // ロールバック（逆順）
    db.exec(`DROP TRIGGER IF EXISTS tr_update_period_statistics`);
    db.exec(`DROP INDEX IF EXISTS idx_period_stats_work_time`);
    db.exec(`DROP INDEX IF EXISTS idx_period_stats_event_count`);
    db.exec(`DROP INDEX IF EXISTS idx_period_stats_window_start`);
    db.exec(`DROP TABLE IF EXISTS object_statistics_by_period`);
    db.exec(`DROP TABLE IF EXISTS period_types`);
    
    console.log('✅ Period statistics rollback completed');
  }
};

module.exports = MIGRATION_002;
```

### マイグレーション実行システム
```javascript
// scripts/migration-runner.js
class MigrationRunner {
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
  
  async runMigrations() {
    const currentVersion = this.getCurrentVersion();
    const availableMigrations = this.getAvailableMigrations();
    
    for (const migration of availableMigrations) {
      if (migration.version > currentVersion) {
        console.log(`🔄 Running migration ${migration.version}: ${migration.description}`);
        
        try {
          migration.up(this.db);
          
          // 実行記録
          this.db.prepare(`
            INSERT INTO schema_migrations (version, description) 
            VALUES (?, ?)
          `).run(migration.version, migration.description);
          
          console.log(`✅ Migration ${migration.version} completed`);
        } catch (error) {
          console.error(`❌ Migration ${migration.version} failed:`, error);
          throw error;
        }
      }
    }
  }
}
```

## 🚀 実装フェーズ

### Phase 2.1: マイグレーションシステム
1. **MigrationRunner実装** - バージョン管理・実行システム
2. **migration-002.js作成** - 期間統計テーブル追加
3. **マイグレーション実行** - 本番環境適用

### Phase 2.2: セッション管理
1. SessionManager実装
2. セッション自動検出・タイムアウト
3. session_statistics テーブル

### Phase 2.3: 期間統計
1. period_types テーブル（マイグレーションで追加済み）
2. object_statistics_by_period テーブル（マイグレーションで追加済み）
3. 集計ロジック実装

### Phase 2.4: UI・レポート
1. 期間別統計表示
2. 生産性レポート
3. ダッシュボード統合

## 📈 成功指標

- ✅ セッション検出精度: 95%以上
- ✅ 実作業時間計算精度: 誤差±2分以内
- ✅ 期間統計生成速度: 100ms以内
- ✅ UI応答性: リアルタイム更新

---

*この設計はMVP完了後の実装を想定しており、MVP段階では object_statistics（累積統計）のみで十分な価値を提供します。*