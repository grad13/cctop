# CG-003: Database Schema実装ガイド

**作成日**: 2025年6月26日 10:30  
**更新日**: 2025年6月27日 18:37  
**作成者**: Architect Agent  
**タイプ**: Code Guide  
**関連仕様**: FUNC-000

## 📋 概要

FUNC-000に基づく5テーブル構成のSQLiteデータベーススキーマ実装ガイド。

## 🔧 実装コード

### スキーマ定義

```javascript
// src/database/schema.js

const schema = {
  // イベントタイプ定義テーブル
  event_types: `
    CREATE TABLE event_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT
    )`,
  
  // イベントタイプ初期データ
  event_types_init: `
    INSERT INTO event_types (code, name, description) VALUES
      ('find', 'Find', 'File discovered during initial scan'),
      ('create', 'Create', 'New file created'),
      ('modify', 'Modify', 'File content modified'),
      ('delete', 'Delete', 'File deleted'),
      ('move', 'Move', 'File moved/renamed'),
      ('lost', 'Lost', 'File detected as missing on startup'),
      ('refind', 'Refind', 'Previously lost file rediscovered')
  `,
  
  // ファイル現在状態管理テーブル
  files: `
    CREATE TABLE files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path TEXT NOT NULL UNIQUE,
      file_name TEXT NOT NULL,
      directory TEXT NOT NULL,
      inode INTEGER,
      is_directory INTEGER DEFAULT 0,
      is_deleted INTEGER DEFAULT 0,
      last_event_id INTEGER,
      created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
      updated_at INTEGER DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (last_event_id) REFERENCES events(id)
    )`,
  
  // イベント履歴テーブル
  events: `
    CREATE TABLE events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      event_type_id INTEGER NOT NULL,
      file_id INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      directory TEXT NOT NULL,
      is_directory INTEGER DEFAULT 0,
      previous_event_id INTEGER,
      source_path TEXT,
      FOREIGN KEY (event_type_id) REFERENCES event_types(id),
      FOREIGN KEY (file_id) REFERENCES files(id),
      FOREIGN KEY (previous_event_id) REFERENCES events(id)
    )`,
    
  // 測定値履歴テーブル
  measurements: `
    CREATE TABLE measurements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      file_size INTEGER,
      line_count INTEGER,
      block_count INTEGER,
      inode INTEGER,
      measured_at INTEGER DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events(id)
    )`,
    
  // 集計値テーブル
  aggregates: `
    CREATE TABLE aggregates (
      file_id INTEGER PRIMARY KEY,
      current_file_size INTEGER DEFAULT 0,
      current_line_count INTEGER DEFAULT 0,
      current_block_count INTEGER DEFAULT 0,
      total_events INTEGER DEFAULT 0,
      total_modifications INTEGER DEFAULT 0,
      total_line_changes INTEGER DEFAULT 0,
      total_size_changes INTEGER DEFAULT 0,
      create_events INTEGER DEFAULT 0,
      modify_events INTEGER DEFAULT 0,
      move_events INTEGER DEFAULT 0,
      delete_events INTEGER DEFAULT 0,
      last_updated INTEGER DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (file_id) REFERENCES files(id)
    )`,

  // インデックス定義
  indexes: [
    'CREATE INDEX idx_events_timestamp ON events(timestamp)',
    'CREATE INDEX idx_events_file_id ON events(file_id)',
    'CREATE INDEX idx_events_event_type_id ON events(event_type_id)',
    'CREATE INDEX idx_measurements_event_id ON measurements(event_id)',
    'CREATE INDEX idx_files_path ON files(file_path)',
    'CREATE INDEX idx_files_inode ON files(inode)'
  ]
};

module.exports = schema;
```

### Database Manager実装

```javascript
// src/database/database-manager.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const schema = require('./schema');

class DatabaseManager {
  constructor(configPath) {
    this.dbPath = configPath;
    this.db = null;
  }

  async initialize() {
    await this.connect();
    await this.createTables();
    await this.createIndexes();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          // WALモード有効化
          this.db.run('PRAGMA journal_mode = WAL', (err) => {
            if (err) reject(err);
            else resolve();
          });
        }
      });
    });
  }

  async createTables() {
    // テーブル作成
    await this.run(schema.event_types);
    await this.run(schema.files);
    await this.run(schema.events);
    await this.run(schema.measurements);
    await this.run(schema.aggregates);
    
    // 初期データ投入
    await this.initializeEventTypes();
  }

  async createIndexes() {
    for (const indexSql of schema.indexes) {
      await this.run(indexSql);
    }
  }

  async initializeEventTypes() {
    // 既にデータがあるかチェック
    const count = await this.get('SELECT COUNT(*) as count FROM event_types');
    if (count.count === 0) {
      await this.run(schema.event_types_init);
    }
  }

  // イベント記録
  async recordEvent(eventData) {
    const { event_type, file_path, file_name, directory, ...metadata } = eventData;
    
    // トランザクション開始
    await this.run('BEGIN TRANSACTION');
    
    try {
      // 1. ファイルレコードの取得または作成
      let file = await this.getOrCreateFile(file_path, file_name, directory);
      
      // 2. イベントタイプIDの取得
      const eventType = await this.get(
        'SELECT id FROM event_types WHERE code = ?',
        [event_type]
      );
      
      // 3. イベントの記録
      const eventResult = await this.run(`
        INSERT INTO events (
          timestamp, event_type_id, file_id, file_path, 
          file_name, directory, is_directory, previous_event_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          metadata.timestamp || Date.now(),
          eventType.id,
          file.id,
          file_path,
          file_name,
          directory,
          metadata.is_directory || 0,
          file.last_event_id
        ]
      );
      
      // 4. 測定値の記録
      if (metadata.file_size !== undefined || metadata.line_count !== undefined) {
        await this.run(`
          INSERT INTO measurements (
            event_id, file_size, line_count, block_count, inode
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            eventResult.lastID,
            metadata.file_size,
            metadata.line_count,
            metadata.block_count,
            metadata.inode
          ]
        );
      }
      
      // 5. filesテーブルの更新
      await this.updateFile(file.id, eventResult.lastID, event_type);
      
      // 6. 集計値の更新
      await this.updateAggregates(file.id, event_type, metadata);
      
      await this.run('COMMIT');
      
      return eventResult.lastID;
      
    } catch (error) {
      await this.run('ROLLBACK');
      throw error;
    }
  }

  async getOrCreateFile(file_path, file_name, directory) {
    let file = await this.get(
      'SELECT * FROM files WHERE file_path = ?',
      [file_path]
    );
    
    if (!file) {
      const result = await this.run(`
        INSERT INTO files (file_path, file_name, directory)
        VALUES (?, ?, ?)`,
        [file_path, file_name, directory]
      );
      
      file = {
        id: result.lastID,
        file_path,
        file_name,
        directory,
        last_event_id: null
      };
    }
    
    return file;
  }

  async updateFile(fileId, eventId, eventType) {
    const updates = ['last_event_id = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const params = [eventId];
    
    if (eventType === 'delete') {
      updates.push('is_deleted = 1');
    } else if (eventType === 'create' || eventType === 'refind') {
      updates.push('is_deleted = 0');
    }
    
    params.push(fileId);
    
    await this.run(
      `UPDATE files SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
  }

  async updateAggregates(fileId, eventType, metadata) {
    // 実装は省略（FUNC-000の仕様に従って実装）
  }

  // ユーティリティメソッド
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Lost files検出用
  async getLiveFiles() {
    return await this.all(
      'SELECT * FROM files WHERE is_deleted = 0'
    );
  }

  // Refind検出用
  async findByInode(inode) {
    return await this.get(`
      SELECT f.*, et.code as latest_event
      FROM files f
      JOIN events e ON f.last_event_id = e.id
      JOIN event_types et ON e.event_type_id = et.id
      WHERE f.inode = ?`,
      [inode]
    );
  }

  // 最近のイベント取得（表示用）
  async getRecentEvents(limit = 100) {
    return await this.all(`
      SELECT 
        e.timestamp,
        et.code as event_type,
        e.file_name,
        e.directory,
        m.file_size,
        m.line_count,
        m.block_count
      FROM events e
      JOIN event_types et ON e.event_type_id = et.id
      LEFT JOIN measurements m ON e.id = m.event_id
      ORDER BY e.timestamp DESC
      LIMIT ?`,
      [limit]
    );
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = DatabaseManager;
```

## 🧪 テストのポイント

1. **スキーマの整合性**
   - 外部キー制約の動作確認
   - インデックスの効果測定

2. **トランザクション処理**
   - エラー時のロールバック
   - 同時アクセス時の挙動

3. **パフォーマンス**
   - 大量イベント記録時の速度
   - インデックスの効果

## ⚠️ 注意事項

- SQLiteはファイルベースなので、ファイルパスは絶対パスで管理
- WALモードでの運用を前提
- inode再利用問題への対応が必要（Builder handoff HO-20250625-002参照）

## 🔗 関連ドキュメント

- [FUNC-000: SQLiteデータベース基盤](../functions/FUNC-000-sqlite-database-foundation.md)
- [BP-001: v0.2.0.0実装計画](../blueprints/BP-001-for-version0200-restructered.md)
- [HO-20250625-002: inode再利用問題](../../passage/handoffs/pending/architect/HO-20250625-002-inode-reuse-specification.md)