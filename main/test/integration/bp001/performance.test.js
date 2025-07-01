/**
 * BP-001 Performance Test
 * 1000ファイル同時監視でのパフォーマンス検証
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const FileMonitor = require('../../../src/monitors/file-monitor');
const EventProcessor = require('../../../src/monitors/event-processor');
const DatabaseManager = require('../../../src/database/database-manager');

// パフォーマンスメトリクス収集
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      startTime: null,
      endTime: null,
      peakMemory: 0,
      eventCount: 0,
      errorCount: 0,
      avgResponseTime: []
    };
    this.memoryInterval = null;
  }
  
  start() {
    this.metrics.startTime = Date.now();
    this.metrics.initialMemory = process.memoryUsage().heapUsed;
    
    // メモリ使用量を定期的に記録
    this.memoryInterval = setInterval(() => {
      const current = process.memoryUsage().heapUsed;
      if (current > this.metrics.peakMemory) {
        this.metrics.peakMemory = current;
      }
    }, 100);
  }
  
  stop() {
    this.metrics.endTime = Date.now();
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
    }
  }
  
  recordEvent(responseTime) {
    this.metrics.eventCount++;
    this.metrics.avgResponseTime.push(responseTime);
  }
  
  recordError() {
    this.metrics.errorCount++;
  }
  
  getReport() {
    const duration = this.metrics.endTime - this.metrics.startTime;
    const avgResponse = this.metrics.avgResponseTime.length > 0
      ? this.metrics.avgResponseTime.reduce((a, b) => a + b, 0) / this.metrics.avgResponseTime.length
      : 0;
    
    return {
      duration: duration,
      totalEvents: this.metrics.eventCount,
      eventsPerSecond: (this.metrics.eventCount / (duration / 1000)).toFixed(2),
      peakMemoryMB: (this.metrics.peakMemory / 1024 / 1024).toFixed(2),
      memoryIncreaseMB: ((this.metrics.peakMemory - this.metrics.initialMemory) / 1024 / 1024).toFixed(2),
      avgResponseMs: avgResponse.toFixed(2),
      errorCount: this.metrics.errorCount
    };
  }
}

describe('BP-001: Performance Test (1000 files)', () => {
  let testDir;
  let fileMonitor;
  let eventProcessor;
  let dbManager;
  let perfMonitor;
  let dbPath;
  
  // テストタイムアウトを延長（パフォーマンステストは時間がかかる）
  // Note: VitestではconfigでtestTimeout: 300000を設定済み

  beforeEach(async () => {
    perfMonitor = new PerformanceMonitor();
    
    // テスト用一時ディレクトリ
    testDir = path.join(os.tmpdir(), `bp001-perf-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });

    // テスト用データベース
    dbPath = path.join(testDir, 'test-activity.db');
    dbManager = new DatabaseManager(dbPath);
    await dbManager.initialize();

    // Event Processor初期化
    eventProcessor = new EventProcessor(dbManager);
    
    // イベント処理時間を計測
    const originalProcess = eventProcessor.processFileEvent.bind(eventProcessor);
    eventProcessor.processFileEvent = (event) => {
      const startTime = Date.now();
      try {
        const result = originalProcess(event);
        perfMonitor.recordEvent(Date.now() - startTime);
        return result;
      } catch (error) {
        perfMonitor.recordError();
        throw error;
      }
    };

    // File Monitor設定
    const config = {
      watchPaths: [testDir],
      ignored: ['**/test-activity.db'],
      depth: 10,
      awaitWriteFinish: {
        stabilityThreshold: 50,
        pollInterval: 10
      }
    };
    fileMonitor = new FileMonitor(config);
    
    // イベント連携
    fileMonitor.on('fileEvent', (event) => {
      eventProcessor.processFileEvent(event);
    });
  });

  afterEach(async () => {
    perfMonitor.stop();
    
    if (fileMonitor) {
      await fileMonitor.stop();
    }
    if (dbManager) {
      dbManager.close();
    }
    
    // クリーンアップ（大量ファイルのため時間がかかる可能性）
    try {
      fs.rmSync(testDir, { recursive: true, force: true, maxRetries: 3 });
    } catch (error) {
      console.warn('Cleanup failed:', error.message);
    }
  });

  test('should handle 1000 files initial scan efficiently', async () => {
    // 1000ファイルを事前に作成
    const fileCount = 1000;
    const subdirs = 10;
    
    for (let i = 0; i < subdirs; i++) {
      const subdir = path.join(testDir, `subdir-${i}`);
      fs.mkdirSync(subdir, { recursive: true });
      
      for (let j = 0; j < fileCount / subdirs; j++) {
        const filePath = path.join(subdir, `file-${j}.txt`);
        fs.writeFileSync(filePath, `Content ${i}-${j}`);
      }
    }
    
    // パフォーマンス計測開始
    perfMonitor.start();
    
    // 監視開始（初期スキャン）
    await fileMonitor.start();
    
    // 初期スキャン完了待ち
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    perfMonitor.stop();
    const report = perfMonitor.getReport();
    
    // パフォーマンス基準確認
    expect(report.totalEvents).toBeGreaterThanOrEqual(fileCount);
    expect(parseFloat(report.peakMemoryMB)).toBeLessThan(200); // < 200MB
    expect(parseFloat(report.avgResponseMs)).toBeLessThan(100); // < 100ms
    expect(report.errorCount).toBe(0);
  });

  test('should handle rapid file changes on many files', async () => {
    // 100ファイルを作成
    const fileCount = 100;
    const files = [];
    
    for (let i = 0; i < fileCount; i++) {
      const filePath = path.join(testDir, `rapid-${i}.txt`);
      fs.writeFileSync(filePath, 'initial');
      files.push(filePath);
    }
    
    await fileMonitor.start();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    perfMonitor.start();
    
    // 全ファイルを高速に変更
    for (let round = 0; round < 5; round++) {
      for (const file of files) {
        fs.writeFileSync(file, `round ${round}`);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 処理完了待ち
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    perfMonitor.stop();
    const report = perfMonitor.getReport();
    
    // 高負荷でもエラーなし
    expect(report.errorCount).toBe(0);
    expect(parseFloat(report.avgResponseMs)).toBeLessThan(50);
  });

  test('should maintain low CPU usage during idle monitoring', async () => {
    // 500ファイルを作成
    for (let i = 0; i < 500; i++) {
      fs.writeFileSync(path.join(testDir, `idle-${i}.txt`), 'content');
    }
    
    await fileMonitor.start();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // CPU使用率測定（簡易的）
    const startCpu = process.cpuUsage();
    
    // 5秒間アイドル状態
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const cpuDiff = process.cpuUsage(startCpu);
    const totalCpuMs = (cpuDiff.user + cpuDiff.system) / 1000;
    const cpuPercent = (totalCpuMs / 5000) * 100;
    
    // アイドル時のCPU使用率 < 5%
    expect(cpuPercent).toBeLessThan(5);
  });

  test('should handle deep directory structures efficiently', async () => {
    // 深いディレクトリ構造を作成
    let currentPath = testDir;
    const depth = 10;
    const filesPerLevel = 10;
    
    perfMonitor.start();
    
    for (let level = 0; level < depth; level++) {
      currentPath = path.join(currentPath, `level-${level}`);
      fs.mkdirSync(currentPath, { recursive: true });
      
      for (let i = 0; i < filesPerLevel; i++) {
        fs.writeFileSync(path.join(currentPath, `file-${i}.txt`), `level ${level}`);
      }
    }
    
    await fileMonitor.start();
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    perfMonitor.stop();
    const report = perfMonitor.getReport();
    
    // 深い構造でも効率的に処理
    expect(report.totalEvents).toBeGreaterThanOrEqual(depth * filesPerLevel);
    expect(parseFloat(report.avgResponseMs)).toBeLessThan(100);
  });

  test('should not have memory leaks during long operations', async () => {
    // メモリリークテスト用の軽量セットアップ
    for (let i = 0; i < 50; i++) {
      fs.writeFileSync(path.join(testDir, `leak-test-${i}.txt`), 'content');
    }
    
    await fileMonitor.start();
    
    // 初期メモリ使用量
    global.gc && global.gc(); // 可能ならGC実行
    const initialMemory = process.memoryUsage().heapUsed;
    
    // 10ラウンドのファイル変更
    for (let round = 0; round < 10; round++) {
      for (let i = 0; i < 50; i++) {
        fs.writeFileSync(path.join(testDir, `leak-test-${i}.txt`), `round ${round}`);
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // 最終メモリ使用量
    global.gc && global.gc(); // 可能ならGC実行
    await new Promise(resolve => setTimeout(resolve, 1000));
    const finalMemory = process.memoryUsage().heapUsed;
    
    // メモリ増加が妥当な範囲内（50MB以下）
    const memoryIncreaseMB = (finalMemory - initialMemory) / 1024 / 1024;
    expect(memoryIncreaseMB).toBeLessThan(50);
  });

  test('should provide accurate performance metrics', async () => {
    // メトリクス精度テスト
    const testFiles = 20;
    
    for (let i = 0; i < testFiles; i++) {
      fs.writeFileSync(path.join(testDir, `metric-${i}.txt`), 'test');
    }
    
    perfMonitor.start();
    await fileMonitor.start();
    
    // 一定時間待機
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    perfMonitor.stop();
    const report = perfMonitor.getReport();
    
    // メトリクスの妥当性確認
    expect(report.duration).toBeGreaterThan(2000);
    expect(report.duration).toBeLessThan(3000);
    expect(report.totalEvents).toBeGreaterThanOrEqual(testFiles);
    expect(parseFloat(report.eventsPerSecond)).toBeGreaterThan(0);
    expect(parseFloat(report.peakMemoryMB)).toBeGreaterThan(0);
    expect(report.errorCount).toBe(0);
  });
});