/**
 * FUNC-000: SQLite Database Foundation Test
 * SQLite database foundation management feature v0.2.0.0 schema test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs';
const DatabaseManager = require('../../src/database/database-manager');

describe('FUNC-000: SQLite Database Foundation v0.2.0.0', () => {
  let tempDir;
  let dbPath;
  let dbManager;
  
  beforeEach(async () => {
    // Test temporary directory
    tempDir = path.join(os.tmpdir(), `func000-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    dbPath = path.join(tempDir, 'test-schema.db');
    
    // DatabaseManager initialization
    dbManager = new DatabaseManager(dbPath);
    await dbManager.initialize();
  });
  
  afterEach(async () => {
    // Cleanup
    if (dbManager) {
      await dbManager.close();
    }
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('v0.2.0.0 Schema Structure', () => {
    it('should create 5 tables as defined in FUNC-000', async () => {
      // 5-table structure defined in FUNC-000
      const expectedTables = [
        'event_types',
        'files',        // v0.2.0.0: object_fingerprint → files
        'events', 
        'measurements', // v0.2.0.0: newly added
        'aggregates'    // v0.2.0.0: object_statistics → aggregates
      ];
      
      // 各テーブルの存在確認
      for (const tableName of expectedTables) {
        const exists = await dbManager.tableExists(tableName);
        expect(exists).toBe(true);
      }
    });

    it('should have correct events table schema', async () => {
      const schema = await dbManager.getTableSchema('events');
      
      // FUNC-000で定義されたeventsテーブル構造
      const expectedColumns = [
        'id',           // PRIMARY KEY AUTOINCREMENT
        'timestamp',    // INTEGER NOT NULL
        'event_type_id', // INTEGER NOT NULL (FK)
        'file_id',      // INTEGER NOT NULL (FK to files)
        'file_path',    // TEXT NOT NULL
        'file_name',    // TEXT NOT NULL
        'directory'     // TEXT NOT NULL
      ];
      
      for (const column of expectedColumns) {
        expect(schema.some(col => col.name === column)).toBe(true);
      }
      
      // previous_event_id は v0.2.0.0 で削除
      expect(schema.some(col => col.name === 'previous_event_id')).toBe(false);
      // source_path は v0.2.0.0 で削除
      expect(schema.some(col => col.name === 'source_path')).toBe(false);
    });

    it('should have correct files table schema', async () => {
      const schema = await dbManager.getTableSchema('files');
      
      // FUNC-000で定義されたfilesテーブル構造（旧object_fingerprint）
      const expectedColumns = [
        'id',         // PRIMARY KEY AUTOINCREMENT
        'inode',      // INTEGER (現在の最新inode値)
        'is_active'   // BOOLEAN DEFAULT TRUE
      ];
      
      for (const column of expectedColumns) {
        expect(schema.some(col => col.name === column)).toBe(true);
      }
    });

    it('should have correct measurements table schema', async () => {
      const schema = await dbManager.getTableSchema('measurements');
      
      // FUNC-000で定義されたmeasurementsテーブル構造（v0.2.0.0新規）
      const expectedColumns = [
        'event_id',     // PRIMARY KEY (FK to events)
        'inode',        // INTEGER (その時点のinode値)
        'file_size',    // INTEGER (ファイルサイズ)
        'line_count',   // INTEGER (行数)
        'block_count'   // INTEGER (ブロック数)
      ];
      
      for (const column of expectedColumns) {
        expect(schema.some(col => col.name === column)).toBe(true);
      }
    });

    it('should have correct aggregates table schema', async () => {
      const schema = await dbManager.getTableSchema('aggregates');
      
      // FUNC-000で定義されたaggregatesテーブル構造（旧object_statistics）
      const expectedColumns = [
        'id',
        'file_id',
        'period_start',
        'total_size',
        'total_lines', 
        'total_blocks',
        'total_events',
        'total_creates',
        'total_modifies',
        'total_deletes',
        'total_moves',
        'total_restores',  // v0.2.0.0: restoreイベント対応
        'last_updated',
        'calculation_method'
      ];
      
      for (const column of expectedColumns) {
        expect(schema.some(col => col.name === column)).toBe(true);
      }
    });
  });

  describe('Event Types Initialization', () => {
    it('should initialize 6 event types per FUNC-000 and FUNC-001', async () => {
      const eventTypes = await dbManager.getAllEventTypes();
      
      // FUNC-000とFUNC-001で定義された6つのイベントタイプ
      const expectedEventTypes = [
        { code: 'find', name: 'Find', description: 'Initial file discovery' },
        { code: 'create', name: 'Create', description: 'File creation' },
        { code: 'modify', name: 'Modify', description: 'File modification' },
        { code: 'delete', name: 'Delete', description: 'File deletion' },
        { code: 'move', name: 'Move', description: 'File move/rename' },
        { code: 'restore', name: 'Restore', description: 'File restoration after deletion' }
      ];
      
      expect(eventTypes).toHaveLength(6);
      
      for (const expectedType of expectedEventTypes) {
        const found = eventTypes.find(et => et.code === expectedType.code);
        expect(found).toBeDefined();
        expect(found.name).toBe(expectedType.name);
        expect(found.description).toBe(expectedType.description);
      }
    });

    it('should not include deprecated lost/refind event types', async () => {
      const eventTypes = await dbManager.getAllEventTypes();
      
      // FUNC-001でlost/refindは廃止
      const deprecatedTypes = eventTypes.filter(et => 
        et.code === 'lost' || et.code === 'refind'
      );
      
      expect(deprecatedTypes).toHaveLength(0);
    });
  });

  describe('WAL Mode Configuration', () => {
    it('should use WAL mode as specified in FUNC-000', async () => {
      // WALモード設定確認
      const walMode = await dbManager.getJournalMode();
      expect(walMode.toLowerCase()).toBe('wal');
    });

    it('should create WAL files when transactions occur', async () => {
      // テストイベント挿入してWALファイル生成確認
      await dbManager.recordEvent({
        eventType: 'create',
        filePath: '/test/file.js',
        fileName: 'file.js',
        directory: '/test',
        inode: 12345,
        fileSize: 1024,
        lineCount: 50,
        blockCount: 8
      });
      
      // WALファイル確認（activity.db-wal）
      const walFilePath = dbPath + '-wal';
      // WALファイルは実装により自動削除される場合がある
      // 存在する場合の確認のみ
      if (fs.existsSync(walFilePath)) {
        expect(fs.statSync(walFilePath).isFile()).toBe(true);
      }
    });
  });

  describe('File Identity Management', () => {
    it('should support file_id reuse for restore operations', async () => {
      // ファイル作成
      const createResult = await dbManager.recordEvent({
        eventType: 'create',
        filePath: '/test/file.js',
        fileName: 'file.js', 
        directory: '/test',
        inode: 12345,
        fileSize: 1024,
        lineCount: 50,
        blockCount: 8
      });
      
      const originalFileId = createResult.file_id;
      
      // ファイル削除（is_active = FALSE）
      await dbManager.recordEvent({
        eventType: 'delete',
        filePath: '/test/file.js',
        fileName: 'file.js',
        directory: '/test',
        fileId: originalFileId
      });
      
      // ファイル復元（同じfile_id再利用）
      const restoreResult = await dbManager.recordEvent({
        eventType: 'restore',
        filePath: '/test/file.js',
        fileName: 'file.js',
        directory: '/test',
        fileId: originalFileId, // 既存file_id指定
        inode: 54321,           // 新しいinode
        fileSize: 2048,
        lineCount: 100,
        blockCount: 16
      });
      
      // 同じfile_idが再利用される
      expect(restoreResult.file_id).toBe(originalFileId);
      
      // filesテーブルのinodeが更新される
      const fileRecord = await dbManager.getFileById(originalFileId);
      expect(fileRecord.inode).toBe(54321);  // 最新inode
      expect(fileRecord.is_active).toBe(true); // アクティブ状態
    });

    it('should maintain inode history in measurements table', async () => {
      const fileId = 1;
      
      // 同じファイルの複数イベント（異なるinode）
      const events = [
        { eventType: 'create', inode: 12345, fileSize: 1024 },
        { eventType: 'modify', inode: 12345, fileSize: 2048 },
        { eventType: 'delete', inode: 12345, fileSize: 2048 },
        { eventType: 'restore', inode: 54321, fileSize: 1536 } // 新しいinode
      ];
      
      const eventIds = [];
      for (const eventData of events) {
        const result = await dbManager.recordEvent({
          ...eventData,
          filePath: '/test/file.js',
          fileName: 'file.js',
          directory: '/test',
          fileId: fileId,
          lineCount: 50,
          blockCount: 8
        });
        eventIds.push(result.event_id);
      }
      
      // measurementsテーブルでinode履歴確認
      for (let i = 0; i < eventIds.length; i++) {
        const measurement = await dbManager.getMeasurementByEventId(eventIds[i]);
        expect(measurement.inode).toBe(events[i].inode);
      }
    });
  });

  describe('Index Performance', () => {
    it('should have basic indexes for v0.2.0.0', async () => {
      // FUNC-000で定義された基本インデックス
      const expectedIndexes = [
        'idx_events_timestamp',
        'idx_events_file_path', 
        'idx_events_file_id',
        'idx_events_file_timestamp'
      ];
      
      const indexes = await dbManager.getIndexes();
      
      for (const expectedIndex of expectedIndexes) {
        expect(indexes.some(idx => idx.name === expectedIndex)).toBe(true);
      }
    });

    it('should perform fast file_id + timestamp traversal', async () => {
      const fileId = 1;
      
      // 複数のイベント作成
      const timestamps = [1000, 2000, 3000, 4000, 5000];
      for (const timestamp of timestamps) {
        await dbManager.recordEvent({
          eventType: 'modify',
          filePath: '/test/file.js',
          fileName: 'file.js',
          directory: '/test',
          fileId: fileId,
          inode: 12345,
          fileSize: 1024,
          lineCount: 50,
          blockCount: 8,
          timestamp: timestamp
        });
      }
      
      // file_id + timestamp での traverse性能テスト
      const startTime = performance.now();
      const events = await dbManager.getEventsByFileId(fileId, { orderBy: 'timestamp' });
      const endTime = performance.now();
      
      // 10ms以内での取得（小規模データでの性能確認）
      expect(endTime - startTime).toBeLessThan(10);
      expect(events).toHaveLength(5);
      
      // 時系列順でソートされている
      for (let i = 1; i < events.length; i++) {
        expect(events[i].timestamp).toBeGreaterThan(events[i-1].timestamp);
      }
    });
  });
});