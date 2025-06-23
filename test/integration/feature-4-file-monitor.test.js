/**
 * Feature 4 Test: File Monitor
 * 機能4の動作確認テスト（chokidar統合、vis005準拠）
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const FileMonitor = require('../../src/monitors/file-monitor');

describe('Feature 4: File Monitor (chokidar統合)', () => {
  let testDir;
  let fileMonitor;

  beforeEach(() => {
    // テスト用の一時ディレクトリ
    testDir = path.join(os.tmpdir(), `test-file-monitor-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(async () => {
    if (fileMonitor) {
      await fileMonitor.stop();
      fileMonitor = null;
    }
    
    // テストディレクトリのクリーンアップ
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('Should initialize with vis005準拠 configuration', () => {
    const config = {
      watchPaths: [testDir],
      ignored: ['**/node_modules/**'],
      depth: 10
    };

    fileMonitor = new FileMonitor(config);
    
    expect(fileMonitor.isActive()).toBe(false);
    expect(fileMonitor.isInitialScanComplete()).toBe(false);
    expect(fileMonitor.getWatchedPaths()).toEqual([testDir]);
  });

  test('Should perform initial scan and emit scan events', async () => {
    // 事前にファイル作成
    const testFiles = [
      path.join(testDir, 'file1.txt'),
      path.join(testDir, 'file2.txt')
    ];
    
    testFiles.forEach((file, i) => {
      fs.writeFileSync(file, `Content ${i + 1}`);
    });

    const config = {
      watchPaths: [testDir],
      ignored: [],
      depth: 10
    };

    fileMonitor = new FileMonitor(config);
    
    const scanEvents = [];
    fileMonitor.on('fileEvent', (event) => {
      if (event.type === 'scan') {
        scanEvents.push(event);
      }
    });

    fileMonitor.start();
    
    // 初期スキャン完了を待機
    await new Promise((resolve) => {
      fileMonitor.once('ready', resolve);
    });

    expect(fileMonitor.isActive()).toBe(true);
    expect(fileMonitor.isInitialScanComplete()).toBe(true);
    expect(scanEvents.length).toBeGreaterThanOrEqual(2);
    
    // scanイベントのファイルパスを確認
    const scannedPaths = scanEvents.map(e => e.path);
    testFiles.forEach(testFile => {
      expect(scannedPaths).toContain(path.resolve(testFile));
    });
  });

  test('Should detect create events after initial scan', async () => {
    const config = {
      watchPaths: [testDir],
      ignored: [],
      depth: 10
    };

    fileMonitor = new FileMonitor(config);
    
    const createEvents = [];
    fileMonitor.on('fileEvent', (event) => {
      if (event.type === 'create') {
        createEvents.push(event);
      }
    });

    fileMonitor.start();
    
    // 初期スキャン完了を待機
    await new Promise((resolve) => {
      fileMonitor.once('ready', resolve);
    });

    // 初期スキャン後にファイル作成
    const newFile = path.join(testDir, 'new-file.txt');
    fs.writeFileSync(newFile, 'New content');

    // createイベントを待機
    await new Promise((resolve) => {
      const handler = (event) => {
        if (event.type === 'create' && event.path === path.resolve(newFile)) {
          fileMonitor.off('fileEvent', handler);
          resolve();
        }
      };
      fileMonitor.on('fileEvent', handler);
    });

    expect(createEvents.length).toBe(1);
    expect(createEvents[0].path).toBe(path.resolve(newFile));
    expect(createEvents[0].stats).toBeDefined();
  });

  test('Should detect modify events', async () => {
    // 事前にファイル作成
    const testFile = path.join(testDir, 'modify-test.txt');
    fs.writeFileSync(testFile, 'Initial content');

    const config = {
      watchPaths: [testDir],
      ignored: [],
      depth: 10
    };

    fileMonitor = new FileMonitor(config);
    
    const modifyEvents = [];
    fileMonitor.on('fileEvent', (event) => {
      if (event.type === 'modify') {
        modifyEvents.push(event);
      }
    });

    fileMonitor.start();
    
    // 初期スキャン完了を待機
    await new Promise((resolve) => {
      fileMonitor.once('ready', resolve);
    });

    // ファイル変更
    fs.writeFileSync(testFile, 'Modified content');

    // modifyイベントを待機
    await new Promise((resolve) => {
      const handler = (event) => {
        if (event.type === 'modify' && event.path === path.resolve(testFile)) {
          fileMonitor.off('fileEvent', handler);
          resolve();
        }
      };
      fileMonitor.on('fileEvent', handler);
    });

    expect(modifyEvents.length).toBe(1);
    expect(modifyEvents[0].path).toBe(path.resolve(testFile));
  });

  test('Should detect delete events', async () => {
    // 事前にファイル作成
    const testFile = path.join(testDir, 'delete-test.txt');
    fs.writeFileSync(testFile, 'Content to be deleted');

    const config = {
      watchPaths: [testDir],
      ignored: [],
      depth: 10
    };

    fileMonitor = new FileMonitor(config);
    
    const deleteEvents = [];
    fileMonitor.on('fileEvent', (event) => {
      if (event.type === 'delete') {
        deleteEvents.push(event);
      }
    });

    fileMonitor.start();
    
    // 初期スキャン完了を待機
    await new Promise((resolve) => {
      fileMonitor.once('ready', resolve);
    });

    // ファイル削除
    fs.unlinkSync(testFile);

    // deleteイベントを待機
    await new Promise((resolve) => {
      const handler = (event) => {
        if (event.type === 'delete' && event.path === path.resolve(testFile)) {
          fileMonitor.off('fileEvent', handler);
          resolve();
        }
      };
      fileMonitor.on('fileEvent', handler);
    });

    expect(deleteEvents.length).toBe(1);
    expect(deleteEvents[0].path).toBe(path.resolve(testFile));
    expect(deleteEvents[0].stats).toBeNull();
  });

  test('Should respect ignored patterns', async () => {
    // 無視対象ディレクトリとファイルを作成
    const nodeModulesDir = path.join(testDir, 'node_modules');
    fs.mkdirSync(nodeModulesDir);
    fs.writeFileSync(path.join(nodeModulesDir, 'package.json'), '{}');
    
    const normalFile = path.join(testDir, 'normal.txt');
    fs.writeFileSync(normalFile, 'Normal content');

    const config = {
      watchPaths: [testDir],
      ignored: ['**/node_modules/**'],
      depth: 10
    };

    fileMonitor = new FileMonitor(config);
    
    const events = [];
    fileMonitor.on('fileEvent', (event) => {
      events.push(event);
    });

    fileMonitor.start();
    
    // 初期スキャン完了を待機
    await new Promise((resolve) => {
      fileMonitor.once('ready', resolve);
    });

    // node_modules配下のファイルが無視されていることを確認
    const eventPaths = events.map(e => e.path);
    expect(eventPaths).toContain(path.resolve(normalFile));
    expect(eventPaths.some(p => p.includes('node_modules'))).toBe(false);
  });

  test('Should stop monitoring correctly', async () => {
    const config = {
      watchPaths: [testDir],
      ignored: [],
      depth: 10
    };

    fileMonitor = new FileMonitor(config);
    fileMonitor.start();
    
    // 初期スキャン完了を待機
    await new Promise((resolve) => {
      fileMonitor.once('ready', resolve);
    });

    expect(fileMonitor.isActive()).toBe(true);
    
    await fileMonitor.stop();
    
    expect(fileMonitor.isActive()).toBe(false);
    expect(fileMonitor.isInitialScanComplete()).toBe(false);
  });

  test('Should provide correct stats', async () => {
    const config = {
      watchPaths: [testDir, '/another/path'],
      ignored: ['**/test/**'],
      depth: 5
    };

    fileMonitor = new FileMonitor(config);
    
    const stats = fileMonitor.getStats();
    expect(stats.isRunning).toBe(false);
    expect(stats.isReady).toBe(false);
    expect(stats.watchedPaths).toEqual([testDir, '/another/path']);
    expect(stats.ignored).toEqual(['**/test/**']);
  });

  test('Should detect complete file lifecycle (create→modify→delete)', async () => {
    const config = {
      watchPaths: [testDir],
      ignored: [],
      depth: 10
    };

    fileMonitor = new FileMonitor(config);
    
    const allEvents = [];
    fileMonitor.on('fileEvent', (event) => {
      allEvents.push({
        type: event.type,
        filename: path.basename(event.path),
        timestamp: event.timestamp
      });
    });

    fileMonitor.start();
    
    // 初期スキャン完了を待機
    await new Promise((resolve) => {
      fileMonitor.once('ready', resolve);
    });

    const testFile = path.join(testDir, 'lifecycle-test.txt');
    
    // 1. ファイル作成
    fs.writeFileSync(testFile, 'Initial content');
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // 2. ファイル変更
    fs.writeFileSync(testFile, 'Modified content');
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // 3. ファイル削除
    fs.unlinkSync(testFile);
    await new Promise(resolve => setTimeout(resolve, 200));

    // 全イベントが検出されていることを確認
    console.log('All events detected:', allEvents);
    const lifecycleEvents = allEvents.filter(e => e.filename === 'lifecycle-test.txt');
    console.log('Lifecycle events for lifecycle-test.txt:', lifecycleEvents);
    expect(lifecycleEvents.length).toBe(3);
    
    expect(lifecycleEvents[0].type).toBe('create');
    expect(lifecycleEvents[1].type).toBe('modify');
    expect(lifecycleEvents[2].type).toBe('delete');
    
    // 時系列順序の確認
    expect(lifecycleEvents[0].timestamp).toBeLessThanOrEqual(lifecycleEvents[1].timestamp);
    expect(lifecycleEvents[1].timestamp).toBeLessThanOrEqual(lifecycleEvents[2].timestamp);
  });

  test('Should distinguish between scan and create events correctly', async () => {
    // 既存ファイルを作成
    const existingFile = path.join(testDir, 'existing.txt');
    fs.writeFileSync(existingFile, 'Existing content');
    
    const config = {
      watchPaths: [testDir],
      ignored: [],
      depth: 10
    };

    fileMonitor = new FileMonitor(config);
    
    const events = [];
    fileMonitor.on('fileEvent', (event) => {
      events.push({
        type: event.type,
        filename: path.basename(event.path)
      });
    });

    fileMonitor.start();
    
    // 初期スキャン完了を待機
    await new Promise((resolve) => {
      fileMonitor.once('ready', resolve);
    });

    // 新規ファイル作成
    const newFile = path.join(testDir, 'new.txt');
    fs.writeFileSync(newFile, 'New content');
    
    await new Promise(resolve => setTimeout(resolve, 300));

    // 既存ファイルはscanイベント、新規ファイルはcreateイベント
    console.log('All scan/create events:', events);
    const existingEvent = events.find(e => e.filename === 'existing.txt');
    const newEvent = events.find(e => e.filename === 'new.txt');
    
    console.log('Existing event:', existingEvent);
    console.log('New event:', newEvent);
    
    expect(existingEvent).toBeDefined();
    expect(existingEvent.type).toBe('scan');
    expect(newEvent).toBeDefined();
    expect(newEvent.type).toBe('create');
  });
});