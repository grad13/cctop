/**
 * r002 Phase 1: Metadata Integrity Test
 * BP-000準拠 - 6項目メタデータ完全性保証
 * file_size, line_count, timestamp, file_path, inode, is_directory
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const FileMonitor = require('../../../src/monitors/file-monitor');
const EventProcessor = require('../../../src/monitors/event-processor');
const DatabaseManager = require('../../../src/database/database-manager');

describe('r002 Phase 1: Metadata Integrity (6項目メタデータ完全性)', () => {
  let testDir;
  let fileMonitor;
  let eventProcessor;
  let dbManager;
  let dbPath;

  beforeEach(async () => {
    // テスト用一時ディレクトリ
    testDir = path.join(os.tmpdir(), `r002-metadata-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });

    // テスト用データベース
    dbPath = path.join(testDir, 'test-metadata.db');
    dbManager = new DatabaseManager(dbPath);
    await dbManager.initialize();

    // Event Processor初期化
    eventProcessor = new EventProcessor(dbManager);

    // File Monitor設定
    const config = {
      watchPaths: [testDir],
      ignored: ['**/test-metadata.db'],
      depth: 10
    };
    fileMonitor = new FileMonitor(config);
    
    // イベント連携
    fileMonitor.on('fileEvent', (event) => {
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
  });

  test('meta-001: file_size正確性 - 0バイト～大容量ファイル', async () => {
    // 監視開始
    fileMonitor.start();
    await new Promise((resolve) => {
      fileMonitor.once('ready', resolve);
    });

    // 様々なサイズのファイル作成
    const testFiles = [
      { name: 'empty.txt', content: '', expectedSize: 0 },
      { name: 'small.txt', content: 'A', expectedSize: 1 },
      { name: 'medium.txt', content: 'A'.repeat(1024), expectedSize: 1024 },
      { name: 'large.txt', content: 'B'.repeat(10240), expectedSize: 10240 }
    ];

    for (const file of testFiles) {
      const filePath = path.join(testDir, file.name);
      fs.writeFileSync(filePath, file.content);
    }

    // 処理完了待機
    await new Promise(resolve => setTimeout(resolve, 500));

    // DB記録確認
    const allEvents = await dbManager.getRecentEvents(1000);
    
    for (const file of testFiles) {
      const filePath = path.resolve(path.join(testDir, file.name));
      const event = allEvents.find(e => 
        e.file_path === filePath && e.event_type === 'create'
      );
      
      expect(event).toBeDefined();
      expect(event.file_size).toBe(file.expectedSize);
    }
  });

  test('meta-002: line_count正確性 - 各種改行パターン', async () => {
    // 監視開始
    fileMonitor.start();
    await new Promise((resolve) => {
      fileMonitor.once('ready', resolve);
    });

    // 様々な行数のファイル作成
    const testFiles = [
      { name: 'nolines.txt', content: '', expectedLines: 0 },
      { name: 'oneline.txt', content: 'Single line', expectedLines: 1 },
      { name: 'twolines.txt', content: 'Line 1\nLine 2', expectedLines: 2 },
      { name: 'multilines.txt', content: 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5', expectedLines: 5 },
      { name: 'trailing-newline.txt', content: 'Line 1\nLine 2\n', expectedLines: 2 },
      { name: 'empty-lines.txt', content: 'Line 1\n\nLine 3\n\nLine 5', expectedLines: 5 }
    ];

    for (const file of testFiles) {
      const filePath = path.join(testDir, file.name);
      fs.writeFileSync(filePath, file.content);
    }

    // 処理完了待機
    await new Promise(resolve => setTimeout(resolve, 500));

    // DB記録確認
    const allEvents = await dbManager.getRecentEvents(1000);
    
    for (const file of testFiles) {
      const filePath = path.resolve(path.join(testDir, file.name));
      const event = allEvents.find(e => 
        e.file_path === filePath && e.event_type === 'create'
      );
      
      expect(event).toBeDefined();
      expect(event.line_count).toBe(file.expectedLines);
    }
  });

  test('meta-003: timestamp精度とタイミング検証', async () => {
    // 監視開始
    fileMonitor.start();
    await new Promise((resolve) => {
      fileMonitor.once('ready', resolve);
    });

    // タイムスタンプ記録しながらファイル操作
    const operations = [];
    
    // 1. create
    const beforeCreate = Date.now();
    const testFile = path.join(testDir, 'timestamp-test.txt');
    fs.writeFileSync(testFile, 'Initial content');
    const afterCreate = Date.now();
    operations.push({ type: 'create', before: beforeCreate, after: afterCreate });

    await new Promise(resolve => setTimeout(resolve, 100));

    // 2. modify
    const beforeModify = Date.now();
    fs.writeFileSync(testFile, 'Modified content');
    const afterModify = Date.now();
    operations.push({ type: 'modify', before: beforeModify, after: afterModify });

    await new Promise(resolve => setTimeout(resolve, 100));

    // 3. delete
    const beforeDelete = Date.now();
    fs.unlinkSync(testFile);
    const afterDelete = Date.now();
    operations.push({ type: 'delete', before: beforeDelete, after: afterDelete });

    // 処理完了待機
    await new Promise(resolve => setTimeout(resolve, 500));

    // DB記録確認
    const allEvents = await dbManager.getRecentEvents(1000);
    const testEvents = allEvents.filter(e => 
      e.file_path === path.resolve(testFile)
    );

    expect(testEvents.length).toBeGreaterThanOrEqual(3);

    // 各操作のタイムスタンプ精度確認（BP-000仕様: ±50ms以内）
    for (const operation of operations) {
      const event = testEvents.find(e => e.event_type === operation.type);
      expect(event).toBeDefined();
      expect(event.timestamp).toBeGreaterThanOrEqual(operation.before - 50);
      expect(event.timestamp).toBeLessThanOrEqual(operation.after + 50);
    }

    // タイムスタンプの時系列順序確認
    const sortedEvents = testEvents.sort((a, b) => a.timestamp - b.timestamp);
    expect(sortedEvents[0].event_type).toBe('create');
    expect(sortedEvents[1].event_type).toBe('modify');
    expect(sortedEvents[2].event_type).toBe('delete');
  });

  test('meta-004: file_path絶対パス正規化検証', async () => {
    // 監視開始
    fileMonitor.start();
    await new Promise((resolve) => {
      fileMonitor.once('ready', resolve);
    });

    // 様々なパス形式でファイル作成
    const baseDir = path.join(testDir, 'subdir');
    fs.mkdirSync(baseDir, { recursive: true });

    const testFiles = [
      path.join(testDir, 'root-file.txt'),
      path.join(baseDir, 'sub-file.txt'),
      path.join(baseDir, 'deep', 'nested-file.txt')  // ディープネスト
    ];

    // ディープネスト用ディレクトリ作成
    fs.mkdirSync(path.dirname(testFiles[2]), { recursive: true });

    for (const filePath of testFiles) {
      fs.writeFileSync(filePath, 'Test content');
    }

    // 処理完了待機
    await new Promise(resolve => setTimeout(resolve, 500));

    // DB記録確認
    const allEvents = await dbManager.getRecentEvents(1000);
    
    for (const originalPath of testFiles) {
      const expectedPath = path.resolve(originalPath);
      const event = allEvents.find(e => 
        e.file_path === expectedPath && e.event_type === 'create'
      );
      
      expect(event).toBeDefined();
      expect(event.file_path).toBe(expectedPath);
      expect(path.isAbsolute(event.file_path)).toBe(true);
    }
  });

  test('meta-005: inode一意性とオブジェクト識別', async () => {
    // 監視開始
    fileMonitor.start();
    await new Promise((resolve) => {
      fileMonitor.once('ready', resolve);
    });

    // ファイル作成
    const testFile = path.join(testDir, 'inode-test.txt');
    fs.writeFileSync(testFile, 'Inode test content');

    // 処理完了待機
    await new Promise(resolve => setTimeout(resolve, 300));

    // ファイルシステムからinode取得
    const stats = fs.statSync(testFile);
    const expectedInode = stats.ino;

    // DB記録確認
    const allEvents = await dbManager.getRecentEvents(1000);
    const createEvent = allEvents.find(e => 
      e.file_path === path.resolve(testFile) && e.event_type === 'create'
    );

    expect(createEvent).toBeDefined();
    
    // inode一致確認
    if (expectedInode) { // プラットフォーム依存のため条件付き
      expect(createEvent.object_id).toBeDefined();
      
      // object_fingerprintテーブルでinode確認
      const objectData = await dbManager.database.get(
        'SELECT inode FROM object_fingerprint WHERE id = ?',
        [createEvent.object_id]
      );
      expect(objectData?.inode).toBe(expectedInode);
    }
  });

  test('meta-006: is_directory正確な判定', async () => {
    // 監視開始
    fileMonitor.start();
    await new Promise((resolve) => {
      fileMonitor.once('ready', resolve);
    });

    // ファイルとディレクトリ作成
    const testFile = path.join(testDir, 'regular-file.txt');
    const testDirectory = path.join(testDir, 'test-directory');

    fs.writeFileSync(testFile, 'Regular file content');
    fs.mkdirSync(testDirectory);

    // ディレクトリ内にファイル作成（ディレクトリイベント確認）
    const nestedFile = path.join(testDirectory, 'nested.txt');
    fs.writeFileSync(nestedFile, 'Nested file');

    // 処理完了待機
    await new Promise(resolve => setTimeout(resolve, 500));

    // DB記録確認
    const allEvents = await dbManager.getRecentEvents(1000);
    
    // ファイルイベント確認
    const fileEvent = allEvents.find(e => 
      e.file_path === path.resolve(testFile) && e.event_type === 'create'
    );
    expect(fileEvent).toBeDefined();
    expect(fileEvent.is_directory).toBe(0); // ファイル

    // ディレクトリイベント確認
    const dirEvent = allEvents.find(e => 
      e.file_path === path.resolve(testDirectory) && e.event_type === 'create'
    );
    if (dirEvent) { // ディレクトリイベントが記録される場合
      expect(dirEvent.is_directory).toBe(1); // ディレクトリ
    }

    // ネストファイルイベント確認
    const nestedEvent = allEvents.find(e => 
      e.file_path === path.resolve(nestedFile) && e.event_type === 'create'
    );
    expect(nestedEvent).toBeDefined();
    expect(nestedEvent.is_directory).toBe(0); // ファイル
  });

  test('meta-007: 必須メタデータ6項目すべての存在確認', async () => {
    // 監視開始
    fileMonitor.start();
    await new Promise((resolve) => {
      fileMonitor.once('ready', resolve);
    });

    // テストファイル作成
    const testFile = path.join(testDir, 'complete-metadata.txt');
    const content = 'Line 1\nLine 2\nLine 3';
    fs.writeFileSync(testFile, content);

    // 処理完了待機
    await new Promise(resolve => setTimeout(resolve, 300));

    // DB記録確認
    const allEvents = await dbManager.getRecentEvents(1000);
    const createEvent = allEvents.find(e => 
      e.file_path === path.resolve(testFile) && e.event_type === 'create'
    );

    expect(createEvent).toBeDefined();

    // 必須メタデータ6項目確認（BP-000仕様）
    expect(createEvent.file_size).toBeDefined();
    expect(createEvent.file_size).toBe(content.length);
    
    expect(createEvent.line_count).toBeDefined();
    expect(createEvent.line_count).toBe(3);
    
    expect(createEvent.timestamp).toBeDefined();
    expect(createEvent.timestamp).toBeGreaterThan(0);
    
    expect(createEvent.file_path).toBeDefined();
    expect(createEvent.file_path).toBe(path.resolve(testFile));
    
    expect(createEvent.object_id).toBeDefined(); // inode関連
    expect(createEvent.object_id).toBeGreaterThan(0);
    
    expect(createEvent.is_directory).toBeDefined();
    expect(createEvent.is_directory).toBe(0);

    // 追加の完全性確認
    expect(createEvent.file_name).toBe('complete-metadata.txt');
    expect(createEvent.directory).toBeDefined();
    expect(createEvent.event_type).toBe('create');
  });

  test('meta-008: ファイル変更時のメタデータ更新正確性', async () => {
    // 監視開始
    fileMonitor.start();
    await new Promise((resolve) => {
      fileMonitor.once('ready', resolve);
    });

    // 初期ファイル作成
    const testFile = path.join(testDir, 'update-metadata.txt');
    const initialContent = 'Initial line';
    fs.writeFileSync(testFile, initialContent);

    await new Promise(resolve => setTimeout(resolve, 200));

    // ファイル変更（サイズ・行数変更）
    const modifiedContent = 'Modified line 1\nModified line 2\nModified line 3\nModified line 4';
    fs.writeFileSync(testFile, modifiedContent);

    // 処理完了待機
    await new Promise(resolve => setTimeout(resolve, 300));

    // DB記録確認
    const allEvents = await dbManager.getRecentEvents(1000);
    const filePath = path.resolve(testFile);
    
    const createEvent = allEvents.find(e => 
      e.file_path === filePath && e.event_type === 'create'
    );
    const modifyEvent = allEvents.find(e => 
      e.file_path === filePath && e.event_type === 'modify'
    );

    expect(createEvent).toBeDefined();
    expect(modifyEvent).toBeDefined();

    // create時のメタデータ
    expect(createEvent.file_size).toBe(initialContent.length);
    expect(createEvent.line_count).toBe(1);

    // modify時のメタデータ更新確認
    expect(modifyEvent.file_size).toBe(modifiedContent.length);
    expect(modifyEvent.line_count).toBe(4);
    expect(modifyEvent.timestamp).toBeGreaterThan(createEvent.timestamp);
    
    // 同じファイルのobject_id一致確認
    expect(modifyEvent.object_id).toBe(createEvent.object_id);
  });
});