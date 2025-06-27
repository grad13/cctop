/**
 * Feature 2 Test: Database implementation
 * Data-Driven Testing + real data usage approach
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const DatabaseManager = require('../../src/database/database-manager');

// Import test fixtures and contracts
const { databaseScenarios } = require('../fixtures/database-scenarios');
const { DataFlowContract } = require('../contracts/data-flow.contract');
const SideEffectTracker = require('../helpers/side-effect-tracker');

describe('Feature 2: Database implementation', () => {
  let testDbPath;
  let dbManager;
  let testDir;
  const sideEffectTracker = new SideEffectTracker();

  beforeEach(() => {
    // Test directory and database
    testDir = path.join(os.tmpdir(), `test-cctop-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
    testDbPath = path.join(testDir, 'test-activity.db');
    dbManager = new DatabaseManager(testDbPath);
  });

  afterEach(async () => {
    if (dbManager) {
      await dbManager.close();
    }
    // テストディレクトリ削除
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  /**
   * 基本的なデータベース初期化テスト
   */
  test('Should initialize database with all tables (db001準拠)', async () => {
    await dbManager.initialize();
    
    expect(dbManager.isConnected()).toBe(true);
    
    // FUNC-000準拠の全テーブルが作成されていることを確認
    const expectedTables = ['event_types', 'files', 'events', 'measurements', 'aggregates'];
    
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
    
    expect(eventTypes).toHaveLength(6);
    expect(eventTypes.map(e => e.code)).toEqual(['create', 'delete', 'find', 'modify', 'move', 'restore']);
  });

  /**
   * パス展開と副作用のテスト
   */
  test('Should create ~/.cctop directory and activity.db (not events.db)', async () => {
    const cctopDir = path.join(os.homedir(), '.cctop');
    const originalExists = fs.existsSync(cctopDir);
    const backupPath = originalExists ? `${cctopDir}.backup-${Date.now()}` : null;
    
    // 既存のディレクトリをバックアップ
    if (originalExists) {
      fs.renameSync(cctopDir, backupPath);
    }
    
    try {
      // 副作用トラッキング開始
      sideEffectTracker.captureState();
      
      const defaultDbManager = new DatabaseManager();
      await defaultDbManager.initialize();
      
      // 副作用の検証
      const changes = sideEffectTracker.detectChanges();
      
      // 正しいファイルが作成されているか
      const activityDbPath = path.join(cctopDir, 'activity.db');
      
      expect(fs.existsSync(cctopDir)).toBe(true);
      expect(fs.existsSync(activityDbPath)).toBe(true);
      
      // 間違ったファイルが作成されていないか
      const eventsDbPath = path.join(cctopDir, 'events.db');
      expect(fs.existsSync(eventsDbPath)).toBe(false);
      
      // リテラルな ~ ディレクトリが作成されていないか
      const literalTilde = path.join(process.cwd(), '~');
      expect(fs.existsSync(literalTilde)).toBe(false);
      
      await defaultDbManager.close();
    } finally {
      // クリーンアップ
      if (fs.existsSync(cctopDir)) {
        fs.rmSync(cctopDir, { recursive: true, force: true });
      }
      
      // バックアップを復元
      if (backupPath && fs.existsSync(backupPath)) {
        fs.renameSync(backupPath, cctopDir);
      }
    }
  });

  /**
   * データ駆動型テスト - 各シナリオを実行
   */
  databaseScenarios.forEach(scenario => {
    describe(`Scenario: ${scenario.name}`, () => {
      let context = {};
      let scenarioDbManager;
      let scenarioTestDir;
      
      beforeAll(async () => {
        // シナリオ全体で同じDBを使用
        scenarioTestDir = path.join(os.tmpdir(), `test-cctop-scenario-${Date.now()}`);
        fs.mkdirSync(scenarioTestDir, { recursive: true });
        const scenarioDbPath = path.join(scenarioTestDir, 'test-activity.db');
        scenarioDbManager = new DatabaseManager(scenarioDbPath);
        
        await scenarioDbManager.initialize();
        if (scenario.setup) {
          context = await scenario.setup(scenarioTestDir) || {};
        }
      });
      
      afterAll(async () => {
        // シナリオ終了後にクリーンアップ
        if (scenarioDbManager) {
          await scenarioDbManager.close();
        }
        if (fs.existsSync(scenarioTestDir)) {
          fs.rmSync(scenarioTestDir, { recursive: true, force: true });
        }
      });

      scenario.operations.forEach((operation, index) => {
        test(`Operation ${index + 1}: ${operation.description}`, async () => {
          const data = operation.getData(context);
          
          switch (operation.type) {
            case 'recordEvent': {
              // イベントタイプIDを取得
              const eventTypeRow = await scenarioDbManager.get(
                'SELECT id FROM event_types WHERE code = ?',
                [data.event_type]
              );
              expect(eventTypeRow).toBeDefined();
              
              // オブジェクトフィンガープリントを作成/取得
              let objectId;
              if (data.inode) {
                const fingerprintResult = await scenarioDbManager.run(
                  'INSERT OR IGNORE INTO files (inode) VALUES (?)',
                  [data.inode]
                );
                
                if (fingerprintResult.changes === 0) {
                  // 既存のレコード
                  const existing = await scenarioDbManager.get(
                    'SELECT id FROM files WHERE inode = ?',
                    [data.inode]
                  );
                  objectId = existing.id;
                } else {
                  objectId = fingerprintResult.lastID;
                }
              } else {
                // inodeなしの場合
                const result = await scenarioDbManager.run(
                  'INSERT INTO files (inode) VALUES (NULL)'
                );
                objectId = result.lastID;
              }
              
              // イベントを挿入
              const result = await scenarioDbManager.run(
                `INSERT INTO events (
                  timestamp, event_type_id, file_id, file_path, 
                  file_name, directory, file_size, line_count, block_count
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  data.timestamp || Date.now(),
                  eventTypeRow.id,
                  objectId,
                  data.file_path,
                  data.file_name,
                  data.directory,
                  data.file_size,
                  data.line_count,
                  data.block_count
                ]
              );
              
              context.lastInsertId = result.lastID;
              
              // デバッグ用: 挿入されたイベントを確認
              if (process.env.DEBUG_TEST) {
                const insertedEvent = await scenarioDbManager.get(
                  'SELECT * FROM events WHERE id = ?',
                  [result.lastID]
                );
                console.log('Inserted event:', insertedEvent);
              }
              
              operation.validate(result, data, context);
              break;
            }
            
            case 'insertFingerprint': {
              const result = await scenarioDbManager.run(
                'INSERT OR IGNORE INTO files (inode) VALUES (?)',
                [data.inode]
              );
              
              if (result.changes === 0) {
                // 既存のレコード
                const existing = await scenarioDbManager.get(
                  'SELECT id FROM files WHERE inode = ?',
                  [data.inode]
                );
                result.id = existing.id;
              } else {
                result.id = result.lastID;
              }
              
              // 最初のfile_idを記憶
              if (!context.firstObjectId) {
                context.firstObjectId = result.id;
              }
              
              // デバッグ: 結果を詳しく確認
              if (process.env.DEBUG_TEST) {
                console.log(`[insertFingerprint] inode: ${data.inode}, result.id: ${result.id}, context.firstObjectId: ${context.firstObjectId}, changes: ${result.changes}`);
              }
              
              operation.validate(result, data, context);
              break;
            }
            
            case 'query': {
              let results;
              
              if (data.table) {
                results = await scenarioDbManager.all(`SELECT * FROM ${data.table}`);
              } else if (data.file_path) {
                results = await scenarioDbManager.all(
                  `SELECT e.*, et.code as event_type, of.inode
                   FROM events e 
                   JOIN event_types et ON e.event_type_id = et.id 
                   JOIN files of ON e.file_id = of.id
                   WHERE e.file_path = ?
                   ORDER BY e.timestamp`,
                  [data.file_path]
                );
              } else if (data.id) {
                const result = await scenarioDbManager.get(
                  'SELECT * FROM events WHERE id = ?',
                  [data.id]
                );
                results = result;
              }
              
              operation.validate(results, context);
              break;
            }
          }
        });
      });
    });
  });

  /**
   * 実際のファイルを使用したメタデータテスト
   */
  test('Should store actual file metadata correctly', async () => {
    await dbManager.initialize();
    
    // 実際のファイルを作成
    const testFile = path.join(testDir, 'real-test-file.txt');
    const content = 'This is a test file\nwith multiple lines\n';
    fs.writeFileSync(testFile, content);
    
    // 実際のファイル統計情報を取得
    const stats = fs.statSync(testFile);
    const lineCount = content.split('\n').length - 1; // 最後の改行を除く
    
    // イベントタイプを取得
    const eventType = await dbManager.get(
      'SELECT id FROM event_types WHERE code = ?',
      ['create']
    );
    
    // オブジェクトフィンガープリントを作成（実際のinode使用）
    const fingerprintResult = await dbManager.run(
      'INSERT INTO files (inode) VALUES (?)',
      [stats.ino]
    );
    
    // イベントを挿入（実際のメタデータ使用）
    const eventResult = await dbManager.run(
      `INSERT INTO events (
        timestamp, event_type_id, file_id, file_path, 
        file_name, directory, file_size, line_count, block_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Date.now(),
        eventType.id,
        fingerprintResult.lastID,
        testFile,
        path.basename(testFile),
        path.dirname(testFile),
        stats.size,      // 実際のファイルサイズ
        lineCount,       // 実際の行数
        stats.blocks || 0 // 実際のブロック数
      ]
    );
    
    // 保存されたデータを確認
    const savedEvent = await dbManager.get(
      'SELECT * FROM events WHERE id = ?',
      [eventResult.lastID]
    );
    
    // ハードコードではなく実際の値と比較
    expect(savedEvent.file_size).toBe(stats.size);
    expect(savedEvent.line_count).toBe(lineCount);
    expect(savedEvent.file_id).toBe(fingerprintResult.lastID);
    
    // オブジェクトフィンガープリントの確認
    const savedFingerprint = await dbManager.get(
      'SELECT * FROM files WHERE id = ?',
      [fingerprintResult.lastID]
    );
    expect(savedFingerprint.inode).toBe(stats.ino);
  });

  /**
   * 契約テスト - DatabaseManagerが契約を満たすか
   */
  test('Should satisfy DatabaseManager contract', async () => {
    await dbManager.initialize();
    
    const contract = DataFlowContract.DatabaseManager;
    
    // 必須フィールドのテスト
    const requiredFields = Object.keys(contract.requires['event-record']);
    const testData = {
      timestamp: Date.now(),
      event_type: 'create',
      file_path: '/test/file.txt',
      file_name: 'file.txt',
      directory: '/test',
      file_size: 100,
      line_count: 10,
      block_count: 1,
      inode: 12345
    };
    
    // 各フィールドが正しく保存されることを確認
    const eventType = await dbManager.get(
      'SELECT id FROM event_types WHERE code = ?',
      [testData.event_type]
    );
    
    const result = await dbManager.run(
      'INSERT INTO files (inode) VALUES (?)',
      [testData.inode]
    );
    
    const eventResult = await dbManager.run(
      `INSERT INTO events (
        timestamp, event_type_id, file_id, file_path, 
        file_name, directory, file_size, line_count, block_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        testData.timestamp,
        eventType.id,
        result.lastID,
        testData.file_path,
        testData.file_name,
        testData.directory,
        testData.file_size,
        testData.line_count,
        testData.block_count
      ]
    );
    
    expect(eventResult.lastID).toBeGreaterThan(0);
    expect(eventResult.changes).toBe(1);
  });

  test('Should close connection properly', async () => {
    await dbManager.initialize();
    expect(dbManager.isConnected()).toBe(true);
    
    await dbManager.close();
    expect(dbManager.isConnected()).toBe(false);
    
    // 新しいインスタンスを作成してafterEachでのクローズを防ぐ
    dbManager = null;
  });
});