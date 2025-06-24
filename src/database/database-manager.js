/**
 * Database Manager
 * 機能2: SQLite データベースの基本管理
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const os = require('os');
const { schema, initialData } = require('./schema');

class DatabaseManager {
  constructor(dbPath = null) {
    // a002準拠: デフォルトは ~/.cctop/activity.db
    this.dbPath = dbPath || path.join(os.homedir(), '.cctop', 'activity.db');
    this.db = null;
    this.isInitialized = false;
  }

  /**
   * データベース初期化
   */
  async initialize() {
    try {
      // ~/.cctop ディレクトリが存在しない場合は作成
      const cctopDir = path.dirname(this.dbPath);
      if (!fs.existsSync(cctopDir)) {
        fs.mkdirSync(cctopDir, { recursive: true });
        console.log(`📁 Created ~/.cctop directory: ${cctopDir}`);
      }

      // データベース接続
      await this.connect();
      
      // スキーマ作成
      await this.createTables();
      
      // 初期データ挿入
      await this.insertInitialData();
      
      this.isInitialized = true;
      console.log(`🗄️ Database initialized: ${this.dbPath}`);
      
    } catch (error) {
      // 破損したDBの場合は回復を試みる
      if (error.code === 'SQLITE_NOTADB' || error.message.includes('not a database')) {
        console.warn('⚠️  Corrupted database detected, attempting recovery...');
        
        // 既存の接続を閉じる
        if (this.db) {
          try {
            await this.close();
          } catch (closeError) {
            // エラーは無視（既に壊れているため）
          }
        }
        
        // 破損したDBをバックアップ
        const backupPath = `${this.dbPath}.corrupted.${Date.now()}`;
        try {
          fs.renameSync(this.dbPath, backupPath);
          console.log(`📦 Backed up corrupted database to: ${path.basename(backupPath)}`);
        } catch (backupError) {
          console.error('Failed to backup corrupted database:', backupError);
        }
        
        // 新しいDBで再試行
        await this.connect();
        await this.createTables();
        await this.insertInitialData();
        
        this.isInitialized = true;
        console.log(`✅ Database recovered: ${this.dbPath}`);
      } else {
        console.error('❌ Database initialization failed:', error);
        throw error;
      }
    }
  }

  /**
   * データベース接続
   */
  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`🔗 Connected to SQLite: ${this.dbPath}`);
          resolve();
        }
      });
    });
  }

  /**
   * テーブル作成
   */
  async createTables() {
    const tables = Object.keys(schema);
    
    for (const tableName of tables) {
      await this.run(schema[tableName]);
      console.log(`📋 Table created: ${tableName}`);
    }
  }

  /**
   * 初期データ挿入
   */
  async insertInitialData() {
    try {
      // event_types テーブルが空の場合のみ初期データを挿入
      const count = await this.get('SELECT COUNT(*) as count FROM event_types');
      
      if (count.count === 0) {
        for (const eventType of initialData.event_types) {
          await this.run(
            'INSERT INTO event_types (code, name, description) VALUES (?, ?, ?)',
            [eventType.code, eventType.name, eventType.description]
          );
        }
        console.log('📝 Initial event types inserted');
      }
    } catch (error) {
      console.error('Failed to insert initial data:', error);
      throw error;
    }
  }

  /**
   * SQL実行（変更系）
   */
  async run(sql, params = []) {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  /**
   * SQL実行（取得系・単一行）
   */
  async get(sql, params = []) {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * SQL実行（取得系・複数行）
   */
  async all(sql, params = []) {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  /**
   * データベース接続終了
   */
  async close() {
    if (this.db) {
      return new Promise((resolve, reject) => {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('📪 Database connection closed');
            this.db = null;
            this.isInitialized = false;
            resolve();
          }
        });
      });
    }
  }

  /**
   * データベース状態確認
   */
  isConnected() {
    return this.db !== null && this.isInitialized;
  }

  /**
   * データベースパス取得
   */
  getPath() {
    return this.dbPath;
  }

  /**
   * データベースインスタンス取得（.database プロパティ用getter）
   */
  get database() {
    return this.db;
  }

  /**
   * イベントタイプIDを取得
   */
  async getEventTypeId(eventTypeCode) {
    const row = await this.get(
      'SELECT id FROM event_types WHERE code = ?',
      [eventTypeCode]
    );
    return row ? row.id : null;
  }

  /**
   * オブジェクトIDを取得または作成
   */
  async getOrCreateObjectId(inode, filePath = null) {
    let objectId;
    
    if (inode) {
      // inodeが利用可能な場合
      const row = await this.get(
        'SELECT id FROM object_fingerprint WHERE inode = ?',
        [inode]
      );
      
      if (row) {
        objectId = row.id;
      } else {
        const result = await this.run(
          'INSERT INTO object_fingerprint (inode) VALUES (?)',
          [inode]
        );
        objectId = result.lastID;
      }
    } else {
      // inodeが利用できない場合（一意性は保証されない）
      const result = await this.run(
        'INSERT INTO object_fingerprint (inode) VALUES (NULL)'
      );
      objectId = result.lastID;
    }
    
    return objectId;
  }

  /**
   * イベントを記録
   */
  async insertEvent(eventData) {
    const result = await this.run(`
      INSERT INTO events (
        timestamp, event_type_id, object_id, file_path, file_name,
        directory, is_directory, previous_event_id, source_path, file_size,
        line_count, block_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      eventData.timestamp,
      eventData.event_type_id,
      eventData.object_id,
      eventData.file_path,
      eventData.file_name,
      eventData.directory,
      eventData.is_directory,
      eventData.previous_event_id,
      eventData.source_path,
      eventData.file_size,
      eventData.line_count,
      eventData.block_count
    ]);

    return {
      id: result.lastID,
      ...eventData
    };
  }

  /**
   * オブジェクト統計を更新
   */
  async updateObjectStatistics(objectId, stats) {
    // まずレコードが存在するかチェック
    const existing = await this.get(
      'SELECT object_id FROM object_statistics WHERE object_id = ?',
      [objectId]
    );

    if (existing) {
      // 更新
      await this.run(`
        UPDATE object_statistics 
        SET current_file_size = ?, current_line_count = ?, 
            current_block_count = ?, last_updated = ?
        WHERE object_id = ?
      `, [
        stats.current_file_size,
        stats.current_line_count, 
        stats.current_block_count,
        stats.last_updated,
        objectId
      ]);
    } else {
      // 新規作成
      await this.run(`
        INSERT INTO object_statistics (
          object_id, current_file_size, current_line_count,
          current_block_count, last_updated
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        objectId,
        stats.current_file_size,
        stats.current_line_count,
        stats.current_block_count,
        stats.last_updated
      ]);
    }
  }

  /**
   * 最新のイベント一覧を取得
   */
  async getRecentEvents(limit = 50) {
    return await this.all(`
      SELECT 
        e.id,
        e.timestamp,
        et.code as event_type,
        et.name as event_name,
        e.file_path,
        e.file_name,
        e.directory,
        e.file_size,
        e.line_count,
        e.block_count,
        e.object_id,
        e.is_directory,
        of.inode
      FROM events e
      JOIN event_types et ON e.event_type_id = et.id
      LEFT JOIN object_fingerprint of ON e.object_id = of.id
      ORDER BY e.timestamp DESC
      LIMIT ?
    `, [limit]);
  }
}

module.exports = DatabaseManager;