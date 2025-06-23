/**
 * Feature 2 Test: データベース実装
 * 機能2の動作確認テスト
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const DatabaseManager = require('../../src/database/database-manager');

describe('Feature 2: データベース実装', () => {
  let testDbPath;
  let dbManager;

  beforeEach(() => {
    // テスト用の一時データベース
    testDbPath = path.join(os.tmpdir(), `test-cctop-${Date.now()}.db`);
    dbManager = new DatabaseManager(testDbPath);
  });

  afterEach(async () => {
    if (dbManager) {
      await dbManager.close();
    }
    // テストファイル削除
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  test('Should initialize database with all tables (db001準拠)', async () => {
    await dbManager.initialize();
    
    expect(dbManager.isConnected()).toBe(true);
    
    // db001準拠の全テーブルが作成されていることを確認
    const expectedTables = ['event_types', 'object_fingerprint', 'events', 'object_statistics'];
    
    for (const tableName of expectedTables) {
      const result = await dbManager.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        [tableName]
      );
      expect(result).toBeDefined();
      expect(result.name).toBe(tableName);
    }
  });

  test('Should insert initial event types', async () => {
    await dbManager.initialize();
    
    const eventTypes = await dbManager.all('SELECT * FROM event_types ORDER BY code');
    
    expect(eventTypes).toHaveLength(5);
    expect(eventTypes.map(e => e.code)).toEqual(['create', 'delete', 'find', 'modify', 'move']);
  });

  test('Should create ~/.cctop directory by default', async () => {
    const defaultDbManager = new DatabaseManager();
    await defaultDbManager.initialize();
    
    const cctopDir = path.join(os.homedir(), '.cctop');
    expect(fs.existsSync(cctopDir)).toBe(true);
    
    const dbPath = path.join(cctopDir, 'activity.db');
    expect(fs.existsSync(dbPath)).toBe(true);
    
    await defaultDbManager.close();
  });

  test('Should handle basic database operations', async () => {
    await dbManager.initialize();
    
    // 挿入テスト
    const result = await dbManager.run(
      'INSERT INTO object_fingerprint (inode) VALUES (?)',
      [12345]
    );
    expect(result.lastID).toBeGreaterThan(0);
    
    // 取得テスト
    const row = await dbManager.get(
      'SELECT * FROM object_fingerprint WHERE id = ?',
      [result.lastID]
    );
    expect(row.inode).toBe(12345);
    
    // 複数行取得テスト
    const rows = await dbManager.all('SELECT * FROM object_fingerprint');
    expect(rows).toHaveLength(1);
  });

  test('Should close connection properly', async () => {
    await dbManager.initialize();
    expect(dbManager.isConnected()).toBe(true);
    
    await dbManager.close();
    expect(dbManager.isConnected()).toBe(false);
  });
});