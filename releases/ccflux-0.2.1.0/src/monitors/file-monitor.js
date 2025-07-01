/**
 * File Monitor (vis005 compliant)
 * Feature 4: File monitoring with chokidar integration
 */

const chokidar = require('chokidar');
const EventEmitter = require('events');
const path = require('path');

class FileMonitor extends EventEmitter {
  constructor(config) {
    super();
    this.setMaxListeners(20); // Memory leak countermeasure
    this.config = config;
    this.watcher = null;
    this.isReady = false;
    this.isRunning = false;
    this.verbose = process.env.NODE_ENV !== 'test' || process.env.CCTOP_VERBOSE;
    
    if (this.verbose) {
      console.log('FileMonitor initialized');
    }
  }

  /**
   * Start monitoring
   */
  start() {
    if (this.isRunning) {
      if (this.verbose) {
        console.warn('FileMonitor already running');
      }
      return;
    }

    try {
      // PLAN-20250624-001 chokidar settings (vis005 compliant)
      const chokidarOptions = {
        persistent: true,
        ignoreInitial: false,  // Enable initial scan
        ignored: this.config.excludePatterns || [],
        alwaysStat: true,      // Always provide stats object
        depth: this.config.depth || 10,
        usePolling: false,     // Use platform-specific monitoring
        interval: 100,         // Polling interval (used partially even with usePolling: false)
        binaryInterval: 300
      };
      
      // Enable atomic and awaitWriteFinish in production environment
      if (process.env.NODE_ENV !== 'test') {
        chokidarOptions.atomic = 100;  // Short delay for atomic processing
        chokidarOptions.awaitWriteFinish = {
          stabilityThreshold: 2000,   // FUNC-002 compliant
          pollInterval: 100           // FUNC-002 compliant
        };
      }
      
      // Validate watchPaths configuration
      if (!this.config.watchPaths || !Array.isArray(this.config.watchPaths)) {
        throw new Error('watchPaths must be provided as an array');
      }
      
      this.watcher = chokidar.watch(this.config.watchPaths, chokidarOptions);

      this.setupEventHandlers();
      this.isRunning = true;
      
      if (this.verbose) {
        console.log(`FileMonitor started watching: ${this.config.watchPaths ? this.config.watchPaths.join(', ') : 'No paths configured'}`);
        if (this.config.excludePatterns && this.config.excludePatterns.length > 0) {
          console.log(`🚫 Ignoring patterns: ${this.config.excludePatterns.join(', ')}`);
        }
      }
      
    } catch (error) {
      if (this.verbose) {
        console.error('FileMonitor start failed:', error);
      }
      throw error;
    }
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    // Debug: Log all events
    if (process.env.NODE_ENV === 'test' || process.env.CCTOP_VERBOSE) {
      this.watcher.on('all', (event, path) => {
        console.log(`[chokidar debug] ${event}: ${path}`);
      });
    }
    
    // Detect initial scan completion
    this.watcher.on('ready', () => {
      this.isReady = true;
      if (process.env.NODE_ENV === 'test' || process.env.CCTOP_VERBOSE) {
        console.log('Initial scan complete');
      }
      this.emit('ready');
    });

    // File addition (Create/Find)
    this.watcher.on('add', (filePath, stats) => {
      const eventType = this.isReady ? 'create' : 'find';
      console.log(`[FileMonitor] ${eventType} event for: ${filePath}`);
      this.emitFileEvent(eventType, filePath, stats);
    });

    // File modification (Modify)
    this.watcher.on('change', (filePath, stats) => {
      this.emitFileEvent('modify', filePath, stats);
    });

    // File deletion (Delete)
    this.watcher.on('unlink', (filePath) => {
      if (process.env.NODE_ENV === 'test' || process.env.CCTOP_VERBOSE) {
        if (this.verbose) {
          console.log('[FileMonitor] unlink event detected:', filePath);
        }
      }
      this.emitFileEvent('delete', filePath, null);
    });

    // Directory addition (PLAN-20250624-001 compliant)
    this.watcher.on('addDir', (dirPath, stats) => {
      const eventType = this.isReady ? 'create' : 'find';
      this.emitFileEvent(eventType, dirPath, stats);
    });

    // Directory deletion
    this.watcher.on('unlinkDir', (dirPath) => {
      this.emitFileEvent('delete', dirPath, null);
    });

    // Error handling
    this.watcher.on('error', (error) => {
      if (this.verbose) {
        console.error('FileMonitor error:', error);
      }
      this.emit('error', error);
    });
  }

  /**
   * Emit file event
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
      timestamp: Date.now() // Will be overridden for 'find' events in event-processor
    };

    // console.log(`📄 ${type}: ${path.basename(filePath)}`);
    this.emit('fileEvent', event);
  }

  /**
   * Stop monitoring
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
      
      if (this.verbose) {
        console.log('📪 FileMonitor stopped');
      }
      
    } catch (error) {
      if (this.verbose) {
        console.error('FileMonitor stop failed:', error);
      }
      throw error;
    }
  }

  /**
   * Check monitoring state
   */
  isActive() {
    return this.isRunning && this.watcher !== null;
  }

  /**
   * Check initial scan completion state
   */
  isInitialScanComplete() {
    return this.isReady;
  }

  /**
   * Get watched paths
   */
  getWatchedPaths() {
    return this.config.watchPaths;
  }

  /**
   * Get statistics
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