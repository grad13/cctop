# database-manager.ts リファクタリング詳細計画

**作成日**: 2025-06-28  
**計画番号**: PLAN-20250628-011  
**関連**: PLAN-20250628-003（TypeScript移行後リファクタリング総合計画）  
**優先度**: Medium  
**Phase**: Phase 3 - 低成功率ファイル（50%成功見込み）  
**対象ファイル**: `src/database/database-manager.ts` (1,002行)

## 📋 現状分析

### ファイル概要
- **機能**: FUNC-150 Database Management Core準拠、SQLite操作・スキーマ管理
- **責務**: DB接続、クエリ実行、トランザクション、マイグレーション、統計取得
- **依存関係**: sqlite3、複雑なSQL、スキーマバージョン管理、パフォーマンス最適化
- **TypeScript状況**: 最大規模ファイル、複雑なSQL型定義、高度な非同期処理

### 現在の責務（詳細分析済み）
1. **DB接続・初期化管理** (~200行): 接続確立、WAL設定、プラグマ設定、エラー回復
2. **スキーマ管理・マイグレーション** (~180行): バージョン管理、DDL実行、移行処理
3. **CRUD操作・クエリ実行** (~250行): SELECT/INSERT/UPDATE/DELETE、prepared statements
4. **トランザクション管理** (~150行): BEGIN/COMMIT/ROLLBACK、デッドロック対応
5. **統計・メタデータ取得** (~120行): 集計クエリ、パフォーマンス統計、DB情報
6. **バックアップ・メンテナンス** (~100行): データダンプ、VACUUM、整合性チェック

### 分解の困難さ評価
- ⚠️ **最高レベルの複雑性**: 1,002行の巨大ファイル、全責務が密結合
- ⚠️ **SQLite固有の複雑性**: WAL、プラグマ、デッドロック、パフォーマンス調整
- ⚠️ **トランザクション境界**: 複数責務にまたがるトランザクション管理
- ⚠️ **マイグレーション複雑性**: スキーマバージョン、データ移行、互換性保証

## 🎯 分解設計

### 分解後の構造（6ファイル + Facade）

```typescript
// 1. データベース型定義・基盤 (100行程度)
src/database/types/DatabaseTypes.ts
export interface DatabaseConfig {
  path: string;
  enableWAL?: boolean;
  timeout?: number;
  maxConnections?: number;
  pragma?: Record<string, string | number>;
}

export interface DatabaseStats {
  totalEvents: number;
  totalFiles: number;
  activeFiles: number;
  databaseSize: number;
  tableCount: number;
  indexCount: number;
  walSize?: number;
  pageCount?: number;
  pageSize?: number;
  lastVacuum?: number;
}

export interface FileInfo {
  id?: number;
  path: string;
  filename: string;
  directory: string;
  first_seen: number;
  last_seen: number;
  event_count: number;
  file_size: number | null;
  lines: number | null;
  inode: number | null;
  is_active: boolean;
}

export interface EventRecord {
  id?: number;
  file_id: number;
  event_type: string;
  timestamp: number;
  file_size: number | null;
  lines: number | null;
  inode: number | null;
  mtime: number | null;
  ctime: number | null;
}

export interface MigrationInfo {
  version: number;
  description: string;
  applied_at: number;
  checksum?: string;
}

export interface TransactionContext {
  id: string;
  startedAt: number;
  operations: string[];
  timeout: number;
}

export type QueryParameters = (string | number | null)[];
export type QueryResult = any[];

// Database operations
export interface IDatabaseConnection {
  run(sql: string, params?: QueryParameters): Promise<any>;
  get(sql: string, params?: QueryParameters): Promise<any>;
  all(sql: string, params?: QueryParameters): Promise<any[]>;
  close(): Promise<void>;
  isConnected(): boolean;
}

export interface ITransactionManager {
  beginTransaction(timeout?: number): Promise<string>;
  commitTransaction(transactionId: string): Promise<void>;
  rollbackTransaction(transactionId: string): Promise<void>;
  executeInTransaction<T>(operation: () => Promise<T>): Promise<T>;
}

// 2. データベース接続管理 (200行程度)
src/database/connection/DatabaseConnection.ts
export class DatabaseConnection implements IDatabaseConnection {
  private db: any = null; // sqlite3.Database
  private config: DatabaseConfig;
  private connectionPromise: Promise<any> | null = null;
  private isClosing: boolean = false;
  private debug: boolean;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.debug = process.env.CCTOP_VERBOSE === 'true';
  }

  async connect(): Promise<void> {
    if (this.db && !this.isClosing) {
      return; // Already connected
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.establishConnection();
    await this.connectionPromise;
    this.connectionPromise = null;
  }

  private async establishConnection(): Promise<void> {
    const sqlite3 = require('sqlite3').verbose();
    const path = require('path');
    const fs = require('fs').promises;

    try {
      // Ensure database directory exists
      const dbDir = path.dirname(this.config.path);
      await fs.mkdir(dbDir, { recursive: true });

      // Create database connection
      this.db = await new Promise((resolve, reject) => {
        const database = new sqlite3.Database(
          this.config.path,
          sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
          (err: any) => {
            if (err) {
              reject(new Error(`Failed to connect to database: ${err.message}`));
            } else {
              resolve(database);
            }
          }
        );
      });

      // Configure database
      await this.configureDatabase();

      if (this.debug) {
        console.log(`[DatabaseConnection] Connected to: ${this.config.path}`);
      }
    } catch (error) {
      this.db = null;
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  private async configureDatabase(): Promise<void> {
    try {
      // Enable WAL mode for better performance
      if (this.config.enableWAL !== false) {
        await this.run('PRAGMA journal_mode = WAL');
        
        if (this.debug) {
          console.log('[DatabaseConnection] WAL mode enabled');
        }
      }

      // Set timeout
      if (this.config.timeout) {
        await this.run(`PRAGMA busy_timeout = ${this.config.timeout}`);
      }

      // Apply custom pragma settings
      if (this.config.pragma) {
        for (const [key, value] of Object.entries(this.config.pragma)) {
          await this.run(`PRAGMA ${key} = ${value}`);
        }
      }

      // Performance optimizations
      await this.run('PRAGMA synchronous = NORMAL');
      await this.run('PRAGMA cache_size = 10000');
      await this.run('PRAGMA temp_store = memory');

    } catch (error) {
      throw new Error(`Database configuration failed: ${error.message}`);
    }
  }

  async run(sql: string, params: QueryParameters = []): Promise<any> {
    await this.ensureConnected();
    
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(this: any, err: any) {
        if (err) {
          reject(new Error(`SQL execution failed: ${err.message}`));
        } else {
          resolve({
            lastID: this.lastID,
            changes: this.changes
          });
        }
      });
    });
  }

  async get(sql: string, params: QueryParameters = []): Promise<any> {
    await this.ensureConnected();
    
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err: any, row: any) => {
        if (err) {
          reject(new Error(`SQL query failed: ${err.message}`));
        } else {
          resolve(row);
        }
      });
    });
  }

  async all(sql: string, params: QueryParameters = []): Promise<any[]> {
    await this.ensureConnected();
    
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err: any, rows: any[]) => {
        if (err) {
          reject(new Error(`SQL query failed: ${err.message}`));
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  async close(): Promise<void> {
    if (!this.db || this.isClosing) {
      return;
    }

    this.isClosing = true;

    try {
      await new Promise<void>((resolve, reject) => {
        this.db.close((err: any) => {
          if (err) {
            reject(new Error(`Database close failed: ${err.message}`));
          } else {
            resolve();
          }
        });
      });

      if (this.debug) {
        console.log('[DatabaseConnection] Database closed');
      }
    } finally {
      this.db = null;
      this.isClosing = false;
    }
  }

  isConnected(): boolean {
    return this.db !== null && !this.isClosing;
  }

  private async ensureConnected(): Promise<void> {
    if (!this.isConnected()) {
      await this.connect();
    }
  }

  // Connection health and recovery
  async testConnection(): Promise<boolean> {
    try {
      await this.get('SELECT 1 as test');
      return true;
    } catch (error) {
      return false;
    }
  }

  async reconnect(): Promise<void> {
    await this.close();
    await this.connect();
  }

  getConnectionInfo(): object {
    return {
      path: this.config.path,
      connected: this.isConnected(),
      isClosing: this.isClosing,
      config: this.config
    };
  }
}

// 3. スキーマ管理・マイグレーション (180行程度)
src/database/schema/SchemaManager.ts
export class SchemaManager {
  private connection: IDatabaseConnection;
  private currentVersion: number = 0;
  private debug: boolean;

  constructor(connection: IDatabaseConnection) {
    this.connection = connection;
    this.debug = process.env.CCTOP_VERBOSE === 'true';
  }

  async initializeSchema(): Promise<void> {
    try {
      // Create schema_version table if not exists
      await this.createVersionTable();

      // Get current version
      this.currentVersion = await this.getCurrentVersion();

      // Apply pending migrations
      await this.applyMigrations();

      if (this.debug) {
        console.log(`[SchemaManager] Schema initialized, version: ${this.currentVersion}`);
      }
    } catch (error) {
      throw new Error(`Schema initialization failed: ${error.message}`);
    }
  }

  private async createVersionTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        description TEXT NOT NULL,
        applied_at INTEGER NOT NULL,
        checksum TEXT
      )
    `;
    await this.connection.run(sql);
  }

  private async getCurrentVersion(): Promise<number> {
    try {
      const result = await this.connection.get(
        'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1'
      );
      return result ? result.version : 0;
    } catch (error) {
      return 0; // Schema table doesn't exist yet
    }
  }

  private async applyMigrations(): Promise<void> {
    const migrations = this.getMigrations();
    
    for (const migration of migrations) {
      if (migration.version > this.currentVersion) {
        await this.applyMigration(migration);
      }
    }
  }

  private async applyMigration(migration: MigrationInfo): Promise<void> {
    try {
      if (this.debug) {
        console.log(`[SchemaManager] Applying migration v${migration.version}: ${migration.description}`);
      }

      // Execute migration in transaction
      await this.connection.run('BEGIN TRANSACTION');

      try {
        // Get migration SQL
        const sql = this.getMigrationSQL(migration.version);
        await this.connection.run(sql);

        // Record migration
        await this.connection.run(
          'INSERT INTO schema_version (version, description, applied_at, checksum) VALUES (?, ?, ?, ?)',
          [migration.version, migration.description, Date.now(), migration.checksum]
        );

        await this.connection.run('COMMIT');
        this.currentVersion = migration.version;

        if (this.debug) {
          console.log(`[SchemaManager] Migration v${migration.version} applied successfully`);
        }
      } catch (error) {
        await this.connection.run('ROLLBACK');
        throw error;
      }
    } catch (error) {
      throw new Error(`Migration v${migration.version} failed: ${error.message}`);
    }
  }

  private getMigrations(): MigrationInfo[] {
    return [
      {
        version: 1,
        description: 'Initial schema: files and events tables',
        applied_at: 0,
        checksum: 'init-v1'
      },
      {
        version: 2,
        description: 'Add indexes for performance',
        applied_at: 0,
        checksum: 'index-v2'
      },
      {
        version: 3,
        description: 'Add file statistics columns',
        applied_at: 0,
        checksum: 'stats-v3'
      }
    ];
  }

  private getMigrationSQL(version: number): string {
    switch (version) {
      case 1:
        return `
          CREATE TABLE files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT UNIQUE NOT NULL,
            filename TEXT NOT NULL,
            directory TEXT NOT NULL,
            first_seen INTEGER NOT NULL,
            last_seen INTEGER NOT NULL,
            event_count INTEGER DEFAULT 0,
            file_size INTEGER,
            lines INTEGER,
            inode INTEGER,
            is_active BOOLEAN DEFAULT 1
          );

          CREATE TABLE events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_id INTEGER NOT NULL,
            event_type TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            file_size INTEGER,
            lines INTEGER,
            inode INTEGER,
            mtime INTEGER,
            ctime INTEGER,
            FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE
          );
        `;

      case 2:
        return `
          CREATE INDEX IF NOT EXISTS idx_files_path ON files (path);
          CREATE INDEX IF NOT EXISTS idx_files_active ON files (is_active);
          CREATE INDEX IF NOT EXISTS idx_events_file_id ON events (file_id);
          CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events (timestamp);
          CREATE INDEX IF NOT EXISTS idx_events_type ON events (event_type);
        `;

      case 3:
        return `
          ALTER TABLE files ADD COLUMN total_size INTEGER DEFAULT 0;
          ALTER TABLE files ADD COLUMN avg_size REAL DEFAULT 0;
          ALTER TABLE files ADD COLUMN last_modified INTEGER;
        `;

      default:
        throw new Error(`Unknown migration version: ${version}`);
    }
  }

  async getSchemaInfo(): Promise<object> {
    try {
      const tables = await this.connection.all(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      );

      const indexes = await this.connection.all(
        "SELECT name FROM sqlite_master WHERE type='index' ORDER BY name"
      );

      const migrations = await this.connection.all(
        'SELECT * FROM schema_version ORDER BY version'
      );

      return {
        currentVersion: this.currentVersion,
        tables: tables.map((t: any) => t.name),
        indexes: indexes.map((i: any) => i.name),
        migrations: migrations
      };
    } catch (error) {
      throw new Error(`Failed to get schema info: ${error.message}`);
    }
  }

  async validateSchema(): Promise<boolean> {
    try {
      // Check required tables exist
      const requiredTables = ['files', 'events', 'schema_version'];
      const tables = await this.connection.all(
        "SELECT name FROM sqlite_master WHERE type='table'"
      );
      const tableNames = tables.map((t: any) => t.name);

      for (const required of requiredTables) {
        if (!tableNames.includes(required)) {
          console.error(`[SchemaManager] Missing required table: ${required}`);
          return false;
        }
      }

      // Check schema version consistency
      const currentVersion = await this.getCurrentVersion();
      if (currentVersion !== this.currentVersion) {
        console.error(`[SchemaManager] Version mismatch: ${currentVersion} vs ${this.currentVersion}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`[SchemaManager] Schema validation failed:`, error);
      return false;
    }
  }
}

// 4. トランザクション管理 (150行程度)
src/database/transactions/TransactionManager.ts
export class TransactionManager implements ITransactionManager {
  private connection: IDatabaseConnection;
  private activeTransactions: Map<string, TransactionContext> = new Map();
  private transactionCounter: number = 0;
  private debug: boolean;

  constructor(connection: IDatabaseConnection) {
    this.connection = connection;
    this.debug = process.env.CCTOP_VERBOSE === 'true';
  }

  async beginTransaction(timeout: number = 30000): Promise<string> {
    const transactionId = `tx_${++this.transactionCounter}_${Date.now()}`;
    
    try {
      await this.connection.run('BEGIN TRANSACTION');
      
      const context: TransactionContext = {
        id: transactionId,
        startedAt: Date.now(),
        operations: [],
        timeout: timeout
      };

      this.activeTransactions.set(transactionId, context);

      // Set timeout for automatic rollback
      setTimeout(() => {
        if (this.activeTransactions.has(transactionId)) {
          console.warn(`[TransactionManager] Transaction ${transactionId} timed out, rolling back`);
          this.rollbackTransaction(transactionId).catch(console.error);
        }
      }, timeout);

      if (this.debug) {
        console.log(`[TransactionManager] Transaction started: ${transactionId}`);
      }

      return transactionId;
    } catch (error) {
      throw new Error(`Failed to begin transaction: ${error.message}`);
    }
  }

  async commitTransaction(transactionId: string): Promise<void> {
    const context = this.activeTransactions.get(transactionId);
    if (!context) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    try {
      await this.connection.run('COMMIT');
      this.activeTransactions.delete(transactionId);

      if (this.debug) {
        const duration = Date.now() - context.startedAt;
        console.log(`[TransactionManager] Transaction committed: ${transactionId} (${duration}ms, ${context.operations.length} ops)`);
      }
    } catch (error) {
      // Attempt rollback on commit failure
      try {
        await this.connection.run('ROLLBACK');
        this.activeTransactions.delete(transactionId);
      } catch (rollbackError) {
        console.error(`[TransactionManager] Rollback failed after commit error:`, rollbackError);
      }
      throw new Error(`Transaction commit failed: ${error.message}`);
    }
  }

  async rollbackTransaction(transactionId: string): Promise<void> {
    const context = this.activeTransactions.get(transactionId);
    if (!context) {
      // Transaction may have already been cleaned up
      return;
    }

    try {
      await this.connection.run('ROLLBACK');
      this.activeTransactions.delete(transactionId);

      if (this.debug) {
        const duration = Date.now() - context.startedAt;
        console.log(`[TransactionManager] Transaction rolled back: ${transactionId} (${duration}ms)`);
      }
    } catch (error) {
      // Force cleanup even if rollback fails
      this.activeTransactions.delete(transactionId);
      throw new Error(`Transaction rollback failed: ${error.message}`);
    }
  }

  async executeInTransaction<T>(operation: () => Promise<T>): Promise<T> {
    const transactionId = await this.beginTransaction();
    
    try {
      const result = await operation();
      await this.commitTransaction(transactionId);
      return result;
    } catch (error) {
      await this.rollbackTransaction(transactionId);
      throw error;
    }
  }

  // Batch operations with automatic transaction management
  async executeBatch(operations: (() => Promise<any>)[]): Promise<any[]> {
    return this.executeInTransaction(async () => {
      const results: any[] = [];
      for (const operation of operations) {
        const result = await operation();
        results.push(result);
      }
      return results;
    });
  }

  // Advanced transaction features
  async savepoint(name: string): Promise<void> {
    await this.connection.run(`SAVEPOINT ${name}`);
    
    if (this.debug) {
      console.log(`[TransactionManager] Savepoint created: ${name}`);
    }
  }

  async releaseSavepoint(name: string): Promise<void> {
    await this.connection.run(`RELEASE SAVEPOINT ${name}`);
    
    if (this.debug) {
      console.log(`[TransactionManager] Savepoint released: ${name}`);
    }
  }

  async rollbackToSavepoint(name: string): Promise<void> {
    await this.connection.run(`ROLLBACK TO SAVEPOINT ${name}`);
    
    if (this.debug) {
      console.log(`[TransactionManager] Rolled back to savepoint: ${name}`);
    }
  }

  getActiveTransactions(): TransactionContext[] {
    return Array.from(this.activeTransactions.values());
  }

  getTransactionStats(): object {
    const contexts = Array.from(this.activeTransactions.values());
    const now = Date.now();
    
    return {
      activeCount: contexts.length,
      oldestTransaction: contexts.length > 0 ? 
        Math.min(...contexts.map(c => c.startedAt)) : null,
      averageDuration: contexts.length > 0 ? 
        contexts.reduce((sum, c) => sum + (now - c.startedAt), 0) / contexts.length : 0,
      totalOperations: contexts.reduce((sum, c) => sum + c.operations.length, 0)
    };
  }

  cleanup(): void {
    // Force rollback all active transactions
    for (const transactionId of this.activeTransactions.keys()) {
      this.rollbackTransaction(transactionId).catch(console.error);
    }
  }
}

// 5. クエリ実行・CRUD操作 (250行程度)
src/database/queries/QueryExecutor.ts
export class QueryExecutor {
  private connection: IDatabaseConnection;
  private transactionManager: ITransactionManager;
  private preparedStatements: Map<string, any> = new Map();
  private debug: boolean;

  constructor(connection: IDatabaseConnection, transactionManager: ITransactionManager) {
    this.connection = connection;
    this.transactionManager = transactionManager;
    this.debug = process.env.CCTOP_VERBOSE === 'true';
  }

  // Files table operations
  async insertFile(fileInfo: Omit<FileInfo, 'id'>): Promise<number> {
    const sql = `
      INSERT INTO files (path, filename, directory, first_seen, last_seen, 
                        event_count, file_size, lines, inode, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      fileInfo.path, fileInfo.filename, fileInfo.directory,
      fileInfo.first_seen, fileInfo.last_seen, fileInfo.event_count,
      fileInfo.file_size, fileInfo.lines, fileInfo.inode, fileInfo.is_active
    ];

    const result = await this.connection.run(sql, params);
    
    if (this.debug) {
      console.log(`[QueryExecutor] File inserted: ${fileInfo.path} (ID: ${result.lastID})`);
    }
    
    return result.lastID;
  }

  async updateFile(id: number, updates: Partial<FileInfo>): Promise<void> {
    const setClauses: string[] = [];
    const params: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id' && value !== undefined) {
        setClauses.push(`${key} = ?`);
        params.push(value);
      }
    }

    if (setClauses.length === 0) {
      return; // Nothing to update
    }

    params.push(id);
    const sql = `UPDATE files SET ${setClauses.join(', ')} WHERE id = ?`;
    
    await this.connection.run(sql, params);
    
    if (this.debug) {
      console.log(`[QueryExecutor] File updated: ID ${id}`);
    }
  }

  async getFileByPath(path: string): Promise<FileInfo | null> {
    const sql = 'SELECT * FROM files WHERE path = ?';
    const result = await this.connection.get(sql, [path]);
    return result || null;
  }

  async getFileById(id: number): Promise<FileInfo | null> {
    const sql = 'SELECT * FROM files WHERE id = ?';
    const result = await this.connection.get(sql, [id]);
    return result || null;
  }

  async getFiles(limit: number = 100, offset: number = 0): Promise<FileInfo[]> {
    const sql = 'SELECT * FROM files ORDER BY last_seen DESC LIMIT ? OFFSET ?';
    return await this.connection.all(sql, [limit, offset]);
  }

  async getActiveFiles(): Promise<FileInfo[]> {
    const sql = 'SELECT * FROM files WHERE is_active = 1 ORDER BY last_seen DESC';
    return await this.connection.all(sql);
  }

  // Events table operations
  async insertEvent(eventRecord: Omit<EventRecord, 'id'>): Promise<number> {
    const sql = `
      INSERT INTO events (file_id, event_type, timestamp, file_size, lines, 
                         inode, mtime, ctime)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      eventRecord.file_id, eventRecord.event_type, eventRecord.timestamp,
      eventRecord.file_size, eventRecord.lines, eventRecord.inode,
      eventRecord.mtime, eventRecord.ctime
    ];

    const result = await this.connection.run(sql, params);
    
    if (this.debug) {
      console.log(`[QueryExecutor] Event inserted: ${eventRecord.event_type} for file ID ${eventRecord.file_id}`);
    }
    
    return result.lastID;
  }

  async getEventsByFileId(fileId: number, limit: number = 100): Promise<EventRecord[]> {
    const sql = `
      SELECT * FROM events 
      WHERE file_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `;
    return await this.connection.all(sql, [fileId, limit]);
  }

  async getRecentEvents(limit: number = 100): Promise<EventRecord[]> {
    const sql = `
      SELECT e.*, f.path, f.filename 
      FROM events e 
      JOIN files f ON e.file_id = f.id 
      ORDER BY e.timestamp DESC 
      LIMIT ?
    `;
    return await this.connection.all(sql, [limit]);
  }

  async getEventsByTimeRange(startTime: number, endTime: number): Promise<EventRecord[]> {
    const sql = `
      SELECT e.*, f.path, f.filename 
      FROM events e 
      JOIN files f ON e.file_id = f.id 
      WHERE e.timestamp BETWEEN ? AND ? 
      ORDER BY e.timestamp DESC
    `;
    return await this.connection.all(sql, [startTime, endTime]);
  }

  // Complex queries and aggregations
  async getFileStatistics(): Promise<DatabaseStats> {
    const queries = [
      'SELECT COUNT(*) as count FROM events',
      'SELECT COUNT(*) as count FROM files',
      'SELECT COUNT(*) as count FROM files WHERE is_active = 1',
      'SELECT COUNT(*) as count FROM sqlite_master WHERE type="table"',
      'SELECT COUNT(*) as count FROM sqlite_master WHERE type="index"'
    ];

    const [
      totalEvents, totalFiles, activeFiles, tableCount, indexCount
    ] = await Promise.all(queries.map(sql => this.connection.get(sql)));

    // Get database size
    const dbInfo = await this.connection.get('PRAGMA page_count');
    const pageSize = await this.connection.get('PRAGMA page_size');
    const databaseSize = (dbInfo?.page_count || 0) * (pageSize?.page_size || 4096);

    return {
      totalEvents: totalEvents.count,
      totalFiles: totalFiles.count,
      activeFiles: activeFiles.count,
      databaseSize,
      tableCount: tableCount.count,
      indexCount: indexCount.count,
      pageCount: dbInfo?.page_count || 0,
      pageSize: pageSize?.page_size || 4096
    };
  }

  async getTopActiveFiles(limit: number = 10): Promise<any[]> {
    const sql = `
      SELECT f.path, f.filename, f.event_count, f.last_seen,
             COUNT(e.id) as recent_events
      FROM files f
      LEFT JOIN events e ON f.id = e.file_id 
        AND e.timestamp > (strftime('%s', 'now') - 3600) * 1000
      WHERE f.is_active = 1
      GROUP BY f.id
      ORDER BY f.event_count DESC, recent_events DESC
      LIMIT ?
    `;
    return await this.connection.all(sql, [limit]);
  }

  async getEventTypeDistribution(): Promise<any[]> {
    const sql = `
      SELECT event_type, COUNT(*) as count,
             COUNT(*) * 100.0 / (SELECT COUNT(*) FROM events) as percentage
      FROM events
      GROUP BY event_type
      ORDER BY count DESC
    `;
    return await this.connection.all(sql);
  }

  // Batch operations for performance
  async insertFilesBatch(files: Omit<FileInfo, 'id'>[]): Promise<number[]> {
    return await this.transactionManager.executeInTransaction(async () => {
      const ids: number[] = [];
      for (const file of files) {
        const id = await this.insertFile(file);
        ids.push(id);
      }
      return ids;
    });
  }

  async insertEventsBatch(events: Omit<EventRecord, 'id'>[]): Promise<number[]> {
    return await this.transactionManager.executeInTransaction(async () => {
      const ids: number[] = [];
      for (const event of events) {
        const id = await this.insertEvent(event);
        ids.push(id);
      }
      return ids;
    });
  }

  // Data cleanup and maintenance
  async cleanupOldEvents(retentionDays: number = 30): Promise<number> {
    const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    const sql = 'DELETE FROM events WHERE timestamp < ?';
    
    const result = await this.connection.run(sql, [cutoffTime]);
    
    if (this.debug) {
      console.log(`[QueryExecutor] Cleaned up ${result.changes} old events`);
    }
    
    return result.changes;
  }

  async markInactiveFiles(inactivityThreshold: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    const cutoffTime = Date.now() - inactivityThreshold;
    const sql = 'UPDATE files SET is_active = 0 WHERE last_seen < ? AND is_active = 1';
    
    const result = await this.connection.run(sql, [cutoffTime]);
    
    if (this.debug) {
      console.log(`[QueryExecutor] Marked ${result.changes} files as inactive`);
    }
    
    return result.changes;
  }

  // Query performance monitoring
  private queryStats: Map<string, { count: number; totalTime: number }> = new Map();

  private async executeWithTiming<T>(operation: () => Promise<T>, queryType: string): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      const stats = this.queryStats.get(queryType) || { count: 0, totalTime: 0 };
      stats.count++;
      stats.totalTime += duration;
      this.queryStats.set(queryType, stats);
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  getQueryStats(): object {
    const stats: any = {};
    for (const [queryType, data] of this.queryStats.entries()) {
      stats[queryType] = {
        count: data.count,
        averageTime: data.count > 0 ? data.totalTime / data.count : 0,
        totalTime: data.totalTime
      };
    }
    return stats;
  }
}

// 6. 統合データベース管理 (200行程度)
src/database/DatabaseManager.ts
export class DatabaseManager {
  private connection: DatabaseConnection;
  private schemaManager: SchemaManager;
  private transactionManager: TransactionManager;
  private queryExecutor: QueryExecutor;
  private config: DatabaseConfig;
  private initPromise: Promise<void> | null = null;

  constructor(configOrPath?: DatabaseConfig | string) {
    // Handle both config object and simple path
    if (typeof configOrPath === 'string') {
      this.config = { path: configOrPath };
    } else {
      this.config = configOrPath || { path: './.cctop/events.db' };
    }

    // Initialize components
    this.connection = new DatabaseConnection(this.config);
    this.schemaManager = new SchemaManager(this.connection);
    this.transactionManager = new TransactionManager(this.connection);
    this.queryExecutor = new QueryExecutor(this.connection, this.transactionManager);
  }

  // 既存API完全互換
  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.performInitialization();
    return this.initPromise;
  }

  private async performInitialization(): Promise<void> {
    try {
      // Connect to database
      await this.connection.connect();
      
      // Initialize schema
      await this.schemaManager.initializeSchema();
      
      // Validate schema
      const isValid = await this.schemaManager.validateSchema();
      if (!isValid) {
        throw new Error('Schema validation failed');
      }

      console.log('[DatabaseManager] Database initialized successfully');
    } catch (error) {
      this.initPromise = null;
      throw new Error(`Database initialization failed: ${error.message}`);
    }
  }

  // File operations (delegate to QueryExecutor)
  async addFile(path: string, filename: string, directory: string): Promise<number> {
    await this.ensureInitialized();
    
    const existingFile = await this.queryExecutor.getFileByPath(path);
    if (existingFile) {
      return existingFile.id!;
    }

    const fileInfo: Omit<FileInfo, 'id'> = {
      path,
      filename,
      directory,
      first_seen: Date.now(),
      last_seen: Date.now(),
      event_count: 0,
      file_size: null,
      lines: null,
      inode: null,
      is_active: true
    };

    return await this.queryExecutor.insertFile(fileInfo);
  }

  async addEvent(fileId: number, eventType: string, fileSize?: number, lines?: number, inode?: number): Promise<void> {
    await this.ensureInitialized();
    
    const eventRecord: Omit<EventRecord, 'id'> = {
      file_id: fileId,
      event_type: eventType,
      timestamp: Date.now(),
      file_size: fileSize || null,
      lines: lines || null,
      inode: inode || null,
      mtime: null,
      ctime: null
    };

    await this.queryExecutor.insertEvent(eventRecord);
    
    // Update file's last_seen and event_count
    await this.queryExecutor.updateFile(fileId, {
      last_seen: Date.now(),
      event_count: 0 // Will be recalculated
    });
  }

  async getFileByPath(path: string): Promise<FileInfo | null> {
    await this.ensureInitialized();
    return await this.queryExecutor.getFileByPath(path);
  }

  async getRecentEvents(limit: number = 50): Promise<EventRecord[]> {
    await this.ensureInitialized();
    return await this.queryExecutor.getRecentEvents(limit);
  }

  async getStats(): Promise<DatabaseStats> {
    await this.ensureInitialized();
    return await this.queryExecutor.getFileStatistics();
  }

  // Transaction support
  async executeInTransaction<T>(operation: () => Promise<T>): Promise<T> {
    await this.ensureInitialized();
    return await this.transactionManager.executeInTransaction(operation);
  }

  // Database maintenance
  async vacuum(): Promise<void> {
    await this.ensureInitialized();
    await this.connection.run('VACUUM');
  }

  async cleanup(): Promise<void> {
    try {
      this.transactionManager.cleanup();
      await this.connection.close();
    } catch (error) {
      console.error('[DatabaseManager] Cleanup failed:', error);
    }
  }

  // Status and debugging
  isConnected(): boolean {
    return this.connection.isConnected();
  }

  get dbPath(): string {
    return this.config.path;
  }

  async getDatabaseInfo(): Promise<object> {
    await this.ensureInitialized();
    
    return {
      connection: this.connection.getConnectionInfo(),
      schema: await this.schemaManager.getSchemaInfo(),
      transactions: this.transactionManager.getTransactionStats(),
      queries: this.queryExecutor.getQueryStats()
    };
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initPromise) {
      await this.initialize();
    } else {
      await this.initPromise;
    }
  }

  // Legacy method support for backward compatibility
  async addRecord(filePath: string, eventType: string, metadata?: any): Promise<void> {
    const path = require('path');
    const filename = path.basename(filePath);
    const directory = path.dirname(filePath);
    
    const fileId = await this.addFile(filePath, filename, directory);
    await this.addEvent(fileId, eventType, metadata?.size, metadata?.lines, metadata?.inode);
  }

  async getRecords(limit: number = 50): Promise<any[]> {
    return await this.getRecentEvents(limit);
  }
}
```

## 📅 実装スケジュール（余裕バッファ含む）

### Week 8: database-manager.ts分解 (10-14日)

#### **Day 1-2**: 型定義・基盤整備
- DatabaseTypes.ts作成・複雑な型定義統合
- SQLite固有型・インターフェース設計
- **予期しない課題**: SQLite型マッピングの複雑化 (+1日)

#### **Day 3-4**: データベース接続管理実装
- DatabaseConnection.ts実装・接続プール検討
- WAL設定・プラグマ最適化・エラー回復
- **予期しない課題**: 接続管理の複雑化・デッドロック (+1日)

#### **Day 5-6**: スキーマ管理・マイグレーション実装
- SchemaManager.ts実装・複雑なマイグレーション処理
- バージョン管理・整合性チェック
- **予期しない課題**: データ移行の複雑化 (+1.5日)

#### **Day 7-8**: トランザクション管理実装
- TransactionManager.ts実装・デッドロック対応
- セーブポイント・バッチ処理最適化
- **予期しない課題**: トランザクション境界の複雑化 (+1.5日)

#### **Day 9-10**: クエリ実行・CRUD実装
- QueryExecutor.ts実装・複雑なSQL最適化
- バッチ処理・パフォーマンス監視
- **予期しない課題**: SQL性能問題・複雑なクエリ (+2日)

#### **Day 11-12**: 統合管理クラス実装・互換性確認
- DatabaseManager.ts実装・既存API完全互換
- 全機能統合テスト・パフォーマンス確認
- **予期しない課題**: 既存API互換性問題 (+1.5日)

#### **Day 13-14**: バッファ・品質確認
- 長時間稼働での安定性テスト
- 大量データでの性能確認
- ドキュメント更新

## ⚠️ 想定される課題と対策

### 技術的課題

#### 1. **トランザクション境界の複雑化** (発生確率: 75%)
- **課題**: 複数コンポーネントにまたがるトランザクション管理、デッドロック
- **対策**: 明確なトランザクション設計、タイムアウト設定、デッドロック検出
- **代替案**: トランザクション境界の単純化

#### 2. **SQLパフォーマンスの劣化** (発生確率: 70%)
- **課題**: 分解により最適化されたSQLの性能低下
- **対策**: インデックス最適化、クエリプランニング、バッチ処理
- **代替案**: 重要クエリの統合保持

#### 3. **SQLite固有機能の複雑性** (発生確率: 65%)
- **課題**: WAL、プラグマ、デッドロック処理の複雑化
- **対策**: SQLite専門知識の活用、段階的最適化
- **代替案**: 基本機能への簡略化

### 実装上の課題

#### 4. **既存API互換性維持** (発生確率: 60%)
- **課題**: 1,002行の既存APIとの完全互換性確保
- **対策**: 段階的移行、詳細なテスト、ファサードパターン
- **代替案**: 互換レイヤーの追加

#### 5. **マイグレーション処理の複雑化** (発生確率: 55%)
- **課題**: スキーマバージョン管理、データ移行の複雑性
- **対策**: 段階的マイグレーション、バックアップ機能
- **代替案**: マイグレーション機能の簡略化

## 🔍 品質保証計画

### TypeScript品質チェック
- `tsc --noEmit` 完全パス
- SQLite型定義の整合性確認
- 非同期・Promise型の適切な使用確認

### 機能品質チェック
- 既存テスト全パス（100%必須）
- データベースパフォーマンステスト（1M records）
- 長時間稼働での安定性テスト（48時間以上）
- トランザクション整合性テスト

### 性能品質チェック
- SQL実行時間（±25%以内）
- データベースサイズ効率（圧縮率確認）
- メモリ使用量監視
- 同時接続処理確認

## 📈 期待効果

### 開発効率向上
- **SQL修正**: 20-40%効率化（QueryExecutor独立）
- **スキーマ変更**: 30-50%効率化（SchemaManager独立）
- **トランザクション問題**: 40-60%効率化（問題箇所特定）

### 保守性向上
- **単体テスト**: 各コンポーネントの独立テスト可能
- **性能調整**: SQL最適化の影響範囲限定
- **機能追加**: データベース機能の追加容易

## ✅ 完了条件

- [ ] 6つの新クラス全てがTypeScript strict mode準拠
- [ ] 既存DatabaseManager APIの100%互換性維持
- [ ] SQLパフォーマンス要件維持（±25%以内）
- [ ] トランザクション整合性の確認
- [ ] 長時間稼働での安定性確認
- [ ] 既存テストスイート全パス
- [ ] 新規単体テスト85%カバレッジ達成

## 🔄 ロールバック計画

### ロールバック条件
- SQLパフォーマンス要件を満たせない問題が4日以上継続
- トランザクション整合性問題が解決困難
- 既存API互換性の重大な問題が継続

### ロールバック手順
1. 元の database-manager.ts に戻す
2. 新規作成ファイルの削除
3. import文の復元
4. データベース接続・SQL実行の動作確認

---

**次のステップ**: EventProcessor.ts完了後実行開始  
**所要時間**: 10-14日（バッファ含む）  
**成功確率**: 50%（最も困難、SQLite専門性と1,002行の複雑性）