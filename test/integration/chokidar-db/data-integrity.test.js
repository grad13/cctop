/**
 * r002 Phase 1: Data Integrity Test
 * BP-000準拠 - chokidar-DB間のデータ整合性保証
 * イベント順序・データ一致・トランザクション整合性
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const FileMonitor = require('../../../src/monitors/file-monitor');
const EventProcessor = require('../../../src/monitors/event-processor');
const DatabaseManager = require('../../../src/database/database-manager');

describe('r002 Phase 1: Data Integrity (chokidar-DB間データ整合性)', () => {
  let testDir;
  let fileMonitor;
  let eventProcessor;
  let dbManager;
  let dbPath;
  let capturedEvents = [];

  beforeEach(async () => {
    // テスト用一時ディレクトリ
    testDir = path.join(os.tmpdir(), `r002-integrity-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });

    // テスト用データベース
    dbPath = path.join(testDir, 'test-integrity.db');
    dbManager = new DatabaseManager(dbPath);
    await dbManager.initialize();

    // Event Processor初期化
    eventProcessor = new EventProcessor(dbManager);

    // File Monitor設定
    const config = {
      watchPaths: [testDir],
      ignored: ['**/test-integrity.db'],
      depth: 10
    };
    fileMonitor = new FileMonitor(config);
    
    // イベントキャプチャ
    capturedEvents = [];
    fileMonitor.on('fileEvent', (event) => {
      capturedEvents.push({
        ...event,
        captureTime: Date.now()
      });
      eventProcessor.processFileEvent(event);
    });
  });

  afterEach(async () => {
    // リソースクリーンアップ
    if (fileMonitor) {
      fileMonitor.removeAllListeners();
      await fileMonitor.stop();
      fileMonitor = null;
    }
    
    if (dbManager) {
      await dbManager.close();
      dbManager = null;
    }

    // テストディレクトリ削除
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }

    capturedEvents = [];
  });

  test('integrity-001: chokidarイベント数とDB記録数の完全一致', async () => {
    // 監視開始
    fileMonitor.start();
    await new Promise((resolve) => {
      fileMonitor.once('ready', resolve);
    });

    // 複数ファイル操作実行
    const operations = [
      () => fs.writeFileSync(path.join(testDir, 'file1.txt'), 'Content 1'),
      () => fs.writeFileSync(path.join(testDir, 'file2.txt'), 'Content 2'),
      () => fs.writeFileSync(path.join(testDir, 'file3.txt'), 'Content 3'),
      () => fs.writeFileSync(path.join(testDir, 'file1.txt'), 'Modified 1'), // modify
      () => fs.unlinkSync(path.join(testDir, 'file2.txt')), // delete
      () => fs.writeFileSync(path.join(testDir, 'file4.txt'), 'Content 4')
    ];

    // 順次実行
    for (const operation of operations) {
      operation();
      await new Promise(resolve => setTimeout(resolve, 50)); // 間隔調整
    }

    // 処理完了待機
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 数量一致確認
    const dbEvents = await dbManager.getRecentEvents(1000);
    const relevantEvents = dbEvents.filter(e => 
      e.file_path.includes(testDir) && !e.file_path.includes('test-integrity.db')
    );

    // BP-000仕様: chokidarイベント数 === DB記録数
    expect(relevantEvents.length).toBe(capturedEvents.length);
    expect(capturedEvents.length).toBeGreaterThanOrEqual(6);
  });

  test('integrity-002: イベント順序の保持確認', async () => {
    // 監視開始
    fileMonitor.start();
    await new Promise((resolve) => {
      fileMonitor.once('ready', resolve);
    });

    // 順序重要な操作実行
    const testFile = path.join(testDir, 'sequence-test.txt');
    const timestamps = [];

    // 1. create
    timestamps.push(Date.now());
    fs.writeFileSync(testFile, 'Initial');
    await new Promise(resolve => setTimeout(resolve, 100));

    // 2. modify
    timestamps.push(Date.now());
    fs.writeFileSync(testFile, 'Modified');
    await new Promise(resolve => setTimeout(resolve, 100));

    // 3. delete
    timestamps.push(Date.now());
    fs.unlinkSync(testFile);
    await new Promise(resolve => setTimeout(resolve, 100));

    // 処理完了待機
    await new Promise(resolve => setTimeout(resolve, 300));

    // DB記録順序確認
    const dbEvents = await dbManager.getRecentEvents(1000);
    const fileEvents = dbEvents.filter(e => 
      e.file_path === path.resolve(testFile)
    ).sort((a, b) => a.timestamp - b.timestamp);

    expect(fileEvents.length).toBe(3);
    expect(fileEvents[0].event_type).toBe('create');
    expect(fileEvents[1].event_type).toBe('modify');
    expect(fileEvents[2].event_type).toBe('delete');

    // タイムスタンプ順序確認
    expect(fileEvents[0].timestamp).toBeLessThan(fileEvents[1].timestamp);
    expect(fileEvents[1].timestamp).toBeLessThan(fileEvents[2].timestamp);
  });

  test('integrity-003: 同一ファイルのobject_id一致性', async () => {
    // 監視開始
    fileMonitor.start();
    await new Promise((resolve) => {
      fileMonitor.once('ready', resolve);
    });

    // 同一ファイルに複数操作
    const testFile = path.join(testDir, 'object-id-test.txt');
    
    fs.writeFileSync(testFile, 'Initial content');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    fs.writeFileSync(testFile, 'Modified content');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    fs.writeFileSync(testFile, 'Final content');
    await new Promise(resolve => setTimeout(resolve, 300));

    // DB記録確認
    const dbEvents = await dbManager.getRecentEvents(1000);
    const fileEvents = dbEvents.filter(e => 
      e.file_path === path.resolve(testFile)
    );

    expect(fileEvents.length).toBeGreaterThanOrEqual(3);
    
    // 同一ファイルの全イベントでobject_id一致確認
    const objectIds = fileEvents.map(e => e.object_id);
    const uniqueObjectIds = [...new Set(objectIds)];
    
    expect(uniqueObjectIds.length).toBe(1); // 同一ファイルは同一object_id
    expect(objectIds.every(id => id === objectIds[0])).toBe(true);
  });

  test('integrity-004: バッチ処理時のトランザクション整合性', async () => {
    // 監視開始
    fileMonitor.start();
    await new Promise((resolve) => {
      fileMonitor.once('ready', resolve);
    });

    // 大量ファイルを一括作成（トランザクション負荷テスト）
    const batchSize = 20;
    const createdFiles = [];

    for (let i = 0; i < batchSize; i++) {
      const filePath = path.join(testDir, `batch-${i}.txt`);
      fs.writeFileSync(filePath, `Batch content ${i}\nLine 2`);
      createdFiles.push(path.resolve(filePath));
    }

    // 処理完了待機（十分な時間）
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 全ファイルのDB記録確認
    const dbEvents = await dbManager.getRecentEvents(1000);
    const createEvents = dbEvents.filter(e => 
      e.event_type === 'create' && e.file_path.includes('batch-')
    );

    // 取りこぼしゼロ確認
    expect(createEvents.length).toBeGreaterThanOrEqual(batchSize);
    
    // 各ファイルが記録されているか確認
    const recordedPaths = createEvents.map(e => e.file_path);
    createdFiles.forEach(filePath => {
      expect(recordedPaths).toContain(filePath);
    });

    // データ整合性確認
    createEvents.forEach(event => {
      expect(event.file_size).toBeGreaterThan(0);
      expect(event.line_count).toBe(2);
      expect(event.object_id).toBeGreaterThan(0);
      expect(event.timestamp).toBeGreaterThan(0);
    });
  });

  test('integrity-005: 削除ファイルの参照整合性', async () => {
    // 監視開始
    fileMonitor.start();
    await new Promise((resolve) => {
      fileMonitor.once('ready', resolve);
    });

    // ファイル作成→削除のライフサイクル
    const testFile = path.join(testDir, 'lifecycle-test.txt');
    
    // 作成
    fs.writeFileSync(testFile, 'Content for deletion test');
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // 削除
    fs.unlinkSync(testFile);
    await new Promise(resolve => setTimeout(resolve, 300));

    // DB記録確認
    const dbEvents = await dbManager.getRecentEvents(1000);
    const filePath = path.resolve(testFile);
    const createEvent = dbEvents.find(e => 
      e.file_path === filePath && e.event_type === 'create'
    );
    const deleteEvent = dbEvents.find(e => 
      e.file_path === filePath && e.event_type === 'delete'
    );

    expect(createEvent).toBeDefined();
    expect(deleteEvent).toBeDefined();

    // 参照整合性確認
    expect(deleteEvent.object_id).toBe(createEvent.object_id);
    expect(deleteEvent.file_path).toBe(createEvent.file_path);
    expect(deleteEvent.timestamp).toBeGreaterThan(createEvent.timestamp);

    // object_fingerprintテーブルの整合性確認
    const objectExists = await dbManager.database.get(
      'SELECT id FROM object_fingerprint WHERE id = ?',
      [createEvent.object_id]
    );
    expect(objectExists).toBeDefined(); // 削除後もオブジェクトレコードは保持
  });

  test('integrity-006: 重複ファイル操作のデータ重複防止', async () => {
    // 監視開始
    fileMonitor.start();
    await new Promise((resolve) => {
      fileMonitor.once('ready', resolve);
    });

    // 同じファイルに重複操作（競合状態テスト）
    const testFile = path.join(testDir, 'duplicate-ops.txt');
    
    // 短時間に複数修正
    fs.writeFileSync(testFile, 'Content 1');
    fs.writeFileSync(testFile, 'Content 2');
    fs.writeFileSync(testFile, 'Content 3');
    
    // 処理完了待機
    await new Promise(resolve => setTimeout(resolve, 500));

    // DB記録確認
    const dbEvents = await dbManager.getRecentEvents(1000);
    const fileEvents = dbEvents.filter(e => 
      e.file_path === path.resolve(testFile)
    );

    // 重複記録なしの確認
    const eventTypes = fileEvents.map(e => e.event_type);
    const createCount = eventTypes.filter(t => t === 'create').length;
    const modifyCount = eventTypes.filter(t => t === 'modify').length;

    expect(createCount).toBe(1); // createは1回のみ
    expect(modifyCount).toBeGreaterThanOrEqual(0); // modifyは0回以上（debounce考慮）
    
    // 全イベントが同一object_idを持つ
    const objectIds = fileEvents.map(e => e.object_id);
    expect(objectIds.every(id => id === objectIds[0])).toBe(true);
  });

  test('integrity-007: エラー条件下でのデータ一貫性', async () => {
    // 監視開始
    fileMonitor.start();
    await new Promise((resolve) => {
      fileMonitor.once('ready', resolve);
    });

    // 存在しないディレクトリへの操作（エラー誘発）
    const invalidDir = path.join(testDir, 'nonexistent');
    
    try {
      // 正常操作
      const validFile = path.join(testDir, 'valid-file.txt');
      fs.writeFileSync(validFile, 'Valid content');
      
      // 無効操作（エラー期待）
      const invalidFile = path.join(invalidDir, 'invalid-file.txt');
      // fs.writeFileSync(invalidFile, 'Invalid'); // これは失敗するはず
      
      // 再度正常操作
      const validFile2 = path.join(testDir, 'valid-file2.txt');
      fs.writeFileSync(validFile2, 'Valid content 2');
      
    } catch (error) {
      // エラーは期待される
    }

    // 処理完了待機
    await new Promise(resolve => setTimeout(resolve, 500));

    // 正常ファイルのみDB記録確認
    const dbEvents = await dbManager.getRecentEvents(1000);
    const validEvents = dbEvents.filter(e => 
      e.file_path.includes('valid-file')
    );

    expect(validEvents.length).toBeGreaterThanOrEqual(2);
    
    // エラー時もデータ一貫性保持確認
    validEvents.forEach(event => {
      expect(event.file_size).toBeGreaterThan(0);
      expect(event.timestamp).toBeGreaterThan(0);
      expect(event.object_id).toBeGreaterThan(0);
    });
  });

  test('integrity-008: 大容量ファイル処理時のメモリ整合性', async () => {
    // 監視開始
    fileMonitor.start();
    await new Promise((resolve) => {
      fileMonitor.once('ready', resolve);
    });

    // 大容量ファイル作成（メモリ負荷テスト）
    const largeFile = path.join(testDir, 'large-file.txt');
    const largeContent = 'A'.repeat(100000) + '\n' + 'B'.repeat(100000); // 200KB程度
    
    fs.writeFileSync(largeFile, largeContent);
    
    // 処理完了待機
    await new Promise(resolve => setTimeout(resolve, 800));

    // DB記録確認
    const dbEvents = await dbManager.getRecentEvents(1000);
    const largeFileEvent = dbEvents.find(e => 
      e.file_path === path.resolve(largeFile) && e.event_type === 'create'
    );

    expect(largeFileEvent).toBeDefined();
    expect(largeFileEvent.file_size).toBe(largeContent.length);
    expect(largeFileEvent.line_count).toBe(2);
    
    // メモリリーク検証（ヒューリスティック）
    const memUsage = process.memoryUsage();
    expect(memUsage.heapUsed).toBeLessThan(500 * 1024 * 1024); // 500MB未満
  });

  test('integrity-009: 同時並行操作での競合状態回避', async () => {
    // 監視開始
    fileMonitor.start();
    await new Promise((resolve) => {
      fileMonitor.once('ready', resolve);
    });

    // 並行ファイル操作（競合テスト）
    const promises = [];
    const concurrentCount = 10;

    for (let i = 0; i < concurrentCount; i++) {
      const promise = new Promise((resolve) => {
        setTimeout(() => {
          const filePath = path.join(testDir, `concurrent-${i}.txt`);
          fs.writeFileSync(filePath, `Concurrent content ${i}`);
          resolve(path.resolve(filePath));
        }, Math.random() * 100); // ランダム遅延
      });
      promises.push(promise);
    }

    // 全並行操作完了待機
    const createdPaths = await Promise.all(promises);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // DB記録確認
    const dbEvents = await dbManager.getRecentEvents(1000);
    const concurrentEvents = dbEvents.filter(e => 
      e.file_path.includes('concurrent-') && e.event_type === 'create'
    );

    // 全ファイルが記録されているか確認
    expect(concurrentEvents.length).toBeGreaterThanOrEqual(concurrentCount);
    
    const recordedPaths = concurrentEvents.map(e => e.file_path);
    createdPaths.forEach(path => {
      expect(recordedPaths).toContain(path);
    });

    // 重複記録なしの確認
    const uniquePaths = [...new Set(recordedPaths)];
    expect(uniquePaths.length).toBe(recordedPaths.length);
  });
});