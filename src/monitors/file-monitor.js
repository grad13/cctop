/**
 * File Monitor (vis005準拠)
 * 機能4: chokidar統合によるファイル監視
 */

const chokidar = require('chokidar');
const EventEmitter = require('events');
const path = require('path');

class FileMonitor extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.watcher = null;
    this.isReady = false;
    this.isRunning = false;
    
    console.log('📁 FileMonitor initialized');
  }

  /**
   * 監視開始
   */
  start() {
    if (this.isRunning) {
      console.warn('⚠️ FileMonitor already running');
      return;
    }

    try {
      // PLAN-20250624-001のchokidar設定（vis005準拠）
      this.watcher = chokidar.watch(this.config.watchPaths, {
        persistent: true,
        ignoreInitial: false,  // 初期スキャンを有効化
        ignored: this.config.ignored || [],
        awaitWriteFinish: {
          stabilityThreshold: 50,   // より短い安定時間
          pollInterval: 25
        },
        atomic: true,
        alwaysStat: true,      // statsオブジェクトを常に提供
        depth: this.config.depth || 10,
        usePolling: false,     // プラットフォーム固有の監視を使用
        interval: 100,         // ポーリング間隔（usePolling: falseでも一部で使用）
        binaryInterval: 300
      });

      this.setupEventHandlers();
      this.isRunning = true;
      
      console.log(`🔍 FileMonitor started watching: ${this.config.watchPaths.join(', ')}`);
      
    } catch (error) {
      console.error('❌ FileMonitor start failed:', error);
      throw error;
    }
  }

  /**
   * イベントハンドラーの設定
   */
  setupEventHandlers() {
    // 初期スキャン完了の検出
    this.watcher.on('ready', () => {
      this.isReady = true;
      console.log('✅ Initial scan complete');
      this.emit('ready');
    });

    // ファイル追加（Create/Find）
    this.watcher.on('add', (filePath, stats) => {
      const eventType = this.isReady ? 'create' : 'find';
      this.emitFileEvent(eventType, filePath, stats);
    });

    // ファイル変更（Modify）
    this.watcher.on('change', (filePath, stats) => {
      this.emitFileEvent('modify', filePath, stats);
    });

    // ファイル削除（Delete）
    this.watcher.on('unlink', (filePath) => {
      if (process.env.NODE_ENV === 'test' || process.env.CCTOP_DEBUG) {
        console.log('[FileMonitor] unlink event detected:', filePath);
      }
      this.emitFileEvent('delete', filePath, null);
    });

    // ディレクトリ追加（初期スキャン中は記録しない）
    this.watcher.on('addDir', (dirPath, stats) => {
      if (this.isReady) {
        this.emitFileEvent('create', dirPath, stats);
      }
      // 初期スキャン中はディレクトリを記録しない（計画書準拠）
    });

    // ディレクトリ削除
    this.watcher.on('unlinkDir', (dirPath) => {
      this.emitFileEvent('delete', dirPath, null);
    });

    // エラーハンドリング
    this.watcher.on('error', (error) => {
      console.error('❌ FileMonitor error:', error);
      this.emit('error', error);
    });
  }

  /**
   * ファイルイベントの発行
   */
  emitFileEvent(type, filePath, stats) {
    // Ignore events if monitor is not running
    if (!this.isRunning) {
      return;
    }
    
    const event = {
      type,
      path: path.resolve(filePath),
      stats,
      timestamp: Date.now()
    };

    // console.log(`📄 ${type}: ${path.basename(filePath)}`);
    this.emit('fileEvent', event);
  }

  /**
   * 監視停止
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    try {
      if (this.watcher) {
        // Remove all watcher event listeners first
        this.watcher.removeAllListeners();
        await this.watcher.close();
        this.watcher = null;
      }
      
      // Remove all event listeners to prevent memory leaks
      this.removeAllListeners();
      
      this.isRunning = false;
      this.isReady = false;
      
      console.log('📪 FileMonitor stopped');
      
    } catch (error) {
      console.error('❌ FileMonitor stop failed:', error);
      throw error;
    }
  }

  /**
   * 監視状態の確認
   */
  isActive() {
    return this.isRunning && this.watcher !== null;
  }

  /**
   * 初期スキャン完了状態の確認
   */
  isInitialScanComplete() {
    return this.isReady;
  }

  /**
   * 監視中パスの取得
   */
  getWatchedPaths() {
    return this.config.watchPaths;
  }

  /**
   * 統計情報の取得
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      isReady: this.isReady,
      watchedPaths: this.config.watchPaths,
      ignored: this.config.ignored || []
    };
  }
}

module.exports = FileMonitor;