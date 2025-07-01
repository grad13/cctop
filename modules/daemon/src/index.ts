/**
 * cctop Daemon - File monitoring service
 * Refactored modular architecture with single responsibility principle
 */

import chokidar from 'chokidar';
import { Database } from '@cctop/shared';
import { DaemonConfigManager } from './config/DaemonConfig';
import { LogManager } from './logging/LogManager';
import { FileEventHandler } from './events/FileEventHandler';
import { SignalHandler } from './system/SignalHandler';
import { PidManager } from './system/PidManager';

class DaemonManager {
  private db: Database;
  private watcher: chokidar.FSWatcher | null = null;
  private configManager: DaemonConfigManager;
  private logger: LogManager;
  private fileEventHandler: FileEventHandler;
  private signalHandler: SignalHandler;
  private pidManager: PidManager;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;
  private startedBy: 'cli' | 'standalone' = 'standalone';

  constructor(startedBy: 'cli' | 'standalone' = 'standalone') {
    this.startedBy = startedBy;
    this.configManager = new DaemonConfigManager();
    
    const config = this.configManager.getConfig();
    this.logger = new LogManager(config.daemon.logFile);
    this.pidManager = new PidManager(config.daemon.pidFile, this.logger, startedBy);
    
    this.db = new Database(config.database.path || '.cctop/data/activity.db');
    this.fileEventHandler = new FileEventHandler(this.db, this.logger, config.monitoring.moveThresholdMs);
    
    this.signalHandler = new SignalHandler(
      this.logger,
      this.shutdown.bind(this),
      this.handleSighup.bind(this)
    );
  }

  private async handleSighup(): Promise<void> {
    this.logger.log('info', 'Reloading configuration...');
    try {
      await this.configManager.loadConfig();
      this.logger.log('info', 'Configuration reloaded successfully');
    } catch (error) {
      this.logger.log('error', `Failed to reload configuration: ${error}`);
    }
  }

  private startHeartbeat(): void {
    const interval = this.configManager.getConfig().daemon.heartbeatInterval;
    this.heartbeatTimer = setInterval(() => {
      this.logger.debugLog('Daemon heartbeat', { pid: process.pid, uptime: process.uptime() });
    }, interval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private async performStartupDeleteDetection(): Promise<void> {
    try {
      this.logger.log('info', 'Performing startup delete detection...');
      
      const recentEvents = await this.db.getRecentEvents(1000);
      const recentFiles = new Set(recentEvents.map(e => e.filePath));
      
      let deletedCount = 0;
      for (const filePath of recentFiles) {
        try {
          const fs = require('fs');
          if (!fs.existsSync(filePath)) {
            await this.fileEventHandler.handleFileEvent('delete', filePath);
            deletedCount++;
          }
        } catch (error) {
          // File access error, treat as deleted
          await this.fileEventHandler.handleFileEvent('delete', filePath);
          deletedCount++;
        }
      }
      
      this.logger.log('info', `Startup delete detection completed. Detected ${deletedCount} deleted files.`);
    } catch (error) {
      this.logger.log('error', `Startup delete detection failed: ${error}`);
    }
  }

  private async shutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }
    
    this.isShuttingDown = true;
    this.logger.log('info', `Received ${signal}, shutting down daemon...`);

    this.stopHeartbeat();

    if (this.watcher) {
      await this.watcher.close();
      this.logger.log('info', 'File watcher closed');
    }

    if (this.db) {
      await this.db.close();
      this.logger.log('info', 'Database connection closed');
    }

    this.fileEventHandler.cleanup();
    await this.pidManager.removePidFile();
    
    this.logger.log('info', 'Daemon shutdown complete');
    process.exit(0);
  }

  async start(): Promise<void> {
    try {
      this.logger.log('info', 'Starting cctop daemon...');
      
      // Load configuration
      await this.configManager.loadConfig();
      const config = this.configManager.getConfig();
      
      // Setup environment
      await this.configManager.ensureDirectories();
      await this.pidManager.writePidFile();
      this.signalHandler.setupSignalHandlers();
      
      // Initialize database
      await this.db.connect();
      this.logger.log('info', 'Database connected');

      // Initialize file watcher with initial scan
      this.watcher = chokidar.watch(config.monitoring.watchPaths, {
        persistent: true,
        ignoreInitial: false,
        ignored: config.monitoring.excludePatterns,
        depth: config.monitoring.maxDepth
      });

      let isInitialScan = true;

      // Handle file events with move detection
      this.watcher
        .on('add', (filePath) => {
          this.logger.debugLog(`CHOKIDAR EVENT: add`, { filePath, timestamp: Date.now(), isInitialScan });
          if (isInitialScan) {
            this.fileEventHandler.handleFileEvent('find', filePath);
          } else {
            this.fileEventHandler.handleAddEvent(filePath);
          }
        })
        .on('ready', async () => {
          isInitialScan = false;
          this.logger.log('info', 'Initial file scan completed, switching to real-time monitoring');
          await this.performStartupDeleteDetection();
        })
        .on('change', (filePath) => {
          this.logger.debugLog(`CHOKIDAR EVENT: change`, { filePath, timestamp: Date.now() });
          this.fileEventHandler.handleFileEvent('modify', filePath);
        })
        .on('unlink', (filePath) => {
          this.logger.debugLog(`CHOKIDAR EVENT: unlink`, { filePath, timestamp: Date.now() });
          this.fileEventHandler.handleUnlinkEvent(filePath);
        })
        .on('addDir', (dirPath) => this.logger.log('debug', `Directory added: ${dirPath}`))
        .on('unlinkDir', (dirPath) => this.logger.log('debug', `Directory removed: ${dirPath}`))
        .on('error', (error) => this.logger.log('error', `Watcher error: ${error}`));

      // Start heartbeat
      this.startHeartbeat();

      this.logger.log('info', `Daemon started successfully (PID: ${process.pid}, started by: ${this.startedBy})`);
      
    } catch (error) {
      this.logger.log('error', `Failed to start daemon: ${error}`);
      throw error;
    }
  }
}

// Main execution
async function main() {
  const startedBy = process.argv.includes('--standalone') ? 'standalone' : 'cli';
  const daemon = new DaemonManager(startedBy);
  
  try {
    await daemon.start();
  } catch (error) {
    console.error('Daemon startup failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}