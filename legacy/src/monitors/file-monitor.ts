/**
 * File Monitor (vis005 compliant)
 * Feature 4: File monitoring with chokidar integration
 */

import chokidar = require('chokidar');
import { EventEmitter } from 'events';
import * as path from 'path';
import { 
  FileMonitorConfig, 
  ChokidarOptions, 
  FileMonitorEvent, 
  FileMonitorStats,
  EventType 
} from '../types';

class FileMonitor extends EventEmitter {
  private config: FileMonitorConfig;
  private watcher: chokidar.FSWatcher | null = null;
  private isReady: boolean = false;
  private isRunning: boolean = false;
  private startTime?: number;

  constructor(config: FileMonitorConfig) {
    super();
    this.setMaxListeners(20); // Memory leak countermeasure
    this.config = config;
  }

  /**
   * Start monitoring
   */
  start(): void {
    if (this.isRunning) {
      console.warn('FileMonitor already running');
      return;
    }

    try {
      // PLAN-20250624-001 chokidar settings (vis005 compliant)
      const chokidarOptions: ChokidarOptions = {
        paths: this.config.watchPaths || [],
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
      this.startTime = Date.now();
      
      
    } catch (error) {
      console.error('FileMonitor start failed:', error);
      throw error;
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    if (!this.watcher) return;

    // Debug: Log all events
    if (process.env.NODE_ENV === 'test' || process.env.CCTOP_VERBOSE) {
      this.watcher.on('all', (event: string, filePath: string) => {
        console.log(`[chokidar debug] ${event}: ${filePath}`);
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
    this.watcher.on('add', (filePath: string, stats?: any) => {
      const eventType: EventType = this.isReady ? 'create' : 'find';
      console.log(`[FileMonitor] ${eventType} event for: ${filePath}`);
      this.emitFileEvent(eventType, filePath, stats);
    });

    // File modification (Modify)
    this.watcher.on('change', (filePath: string, stats?: any) => {
      this.emitFileEvent('modify', filePath, stats);
    });

    // File deletion (Delete)
    this.watcher.on('unlink', (filePath: string) => {
      this.emitFileEvent('delete', filePath, null);
    });

    // Directory addition (PLAN-20250624-001 compliant)
    this.watcher.on('addDir', (dirPath: string, stats?: any) => {
      const eventType: EventType = this.isReady ? 'create' : 'find';
      this.emitFileEvent(eventType, dirPath, stats);
    });

    // Directory deletion
    this.watcher.on('unlinkDir', (dirPath: string) => {
      this.emitFileEvent('delete', dirPath, null);
    });

    // Error handling
    this.watcher.on('error', (error: Error) => {
      console.error('FileMonitor error:', error);
      this.emit('error', error);
    });
  }

  /**
   * Emit file event
   */
  private emitFileEvent(type: EventType, filePath: string, stats: any): void {
    // Ignore events if monitor is not running
    if (!this.isRunning) {
      return;
    }
    
    const event: FileMonitorEvent = {
      type,
      path: path.resolve(filePath),
      stats,
      timestamp: Date.now() // Will be overridden for 'find' events in event-processor
    };

    this.emit('fileEvent', event);
  }

  /**
   * Stop monitoring
   */
  async stop(): Promise<void> {
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
      
      
    } catch (error) {
      console.error('FileMonitor stop failed:', error);
      throw error;
    }
  }

  /**
   * Check monitoring state
   */
  isActive(): boolean {
    return this.isRunning && this.watcher !== null;
  }

  /**
   * Check initial scan completion state
   */
  isInitialScanComplete(): boolean {
    return this.isReady;
  }

  /**
   * Get watched paths
   */
  getWatchedPaths(): string[] {
    return this.config.watchPaths;
  }

  /**
   * Get statistics
   */
  getStats(): FileMonitorStats {
    return {
      running: this.isRunning,
      paths: this.config.watchPaths || [],
      fileCount: 0,  // TODO: implement file count tracking
      eventCount: 0, // TODO: implement event count tracking
      startTime: this.startTime
    };
  }
}

export = FileMonitor;