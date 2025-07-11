/**
 * cctop Daemon - File monitoring service
 * Refactored modular architecture with single responsibility principle
 */

import chokidar from 'chokidar';
import { FileEventRecorder } from './database/FileEventRecorder';
import { DaemonConfigManager } from './config/DaemonConfig';
import { LogManager } from './logging/LogManager';
import { FileEventHandler } from './events/FileEventHandler';
import { SignalHandler } from './system/SignalHandler';
import { PidManager } from './system/PidManager';

class DaemonManager {
  private db: FileEventRecorder;
  private watcher: chokidar.FSWatcher | null = null;
  private configManager: DaemonConfigManager;
  private logger: LogManager;
  private fileEventHandler: FileEventHandler;
  private signalHandler: SignalHandler;
  private pidManager: PidManager;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;
  constructor() {
    this.configManager = new DaemonConfigManager();
    
    const config = this.configManager.getConfig();
    this.logger = new LogManager(config.daemon.logFile);
    this.pidManager = new PidManager(config.daemon.pidFile, this.logger, this.configManager);
    
    // TODO: Load database path from shared-config.json (FUNC-101)
    // For now, use default path
    const dbPath = '.cctop/data/activity.db';
    this.db = new FileEventRecorder(dbPath);
    this.fileEventHandler = new FileEventHandler(this.db, this.logger, config.monitoring.moveThresholdMs);
    
    this.signalHandler = new SignalHandler(
      this.logger,
      this.shutdown.bind(this)
    );
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
      
      // Get recent events with full information including file_id
      const sql = `
        SELECT 
          e.id,
          e.timestamp,
          e.event_type_id,
          e.file_id,
          e.file_path,
          e.file_name,
          e.directory,
          et.code as event_type,
          f.inode
        FROM events e
        JOIN event_types et ON e.event_type_id = et.id
        JOIN files f ON e.file_id = f.id
        ORDER BY e.timestamp DESC
        LIMIT 1000
      `;
      
      const dbConnection = this.db.getConnection();
      if (!dbConnection) {
        throw new Error('Database connection not available');
      }
      
      const recentEvents = await new Promise<any[]>((resolve, reject) => {
        dbConnection.all(sql, [], (err: any, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
      
      // Group events by file path and find the last event for each file
      const fileLastEvent = new Map<string, any>();
      for (const event of recentEvents.reverse()) {
        fileLastEvent.set(event.file_path, event);
      }
      
      let deletedCount = 0;
      for (const [filePath, lastEvent] of fileLastEvent) {
        // Skip if the last event for this file was already a delete
        this.logger.debugLog(`Checking file ${filePath}, last event: ${lastEvent.event_type}`);
        if (lastEvent.event_type === 'delete') {
          this.logger.debugLog(`Skipping ${filePath} - already has delete event`);
          continue;
        }
        
        try {
          const fs = require('fs');
          if (!fs.existsSync(filePath)) {
            // Use inode from the files table
            const inode = lastEvent.inode;
            this.logger.debugLog(`Delete detection: ${filePath} inode=${inode}`);
            if (!inode) {
              this.logger.log('error', `No inode found for ${filePath}, skipping delete detection`);
              continue;
            }
            await this.fileEventHandler.handleFileEvent('delete', filePath, inode);
            deletedCount++;
          }
        } catch (error: unknown) {
          // File access error, treat as deleted
          const inode = lastEvent.inode;
          this.logger.debugLog(`Delete detection error: ${filePath} inode=${inode}`);
          if (!inode) {
            this.logger.log('error', `No inode found for ${filePath}, skipping delete detection`);
            continue;
          }
          await this.fileEventHandler.handleFileEvent('delete', filePath, inode);
          deletedCount++;
        }
      }
      
      this.logger.log('info', `Startup delete detection completed. Detected ${deletedCount} deleted files.`);
    } catch (error: unknown) {
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
      
      // Check for existing daemon
      const existingDaemon = await this.pidManager.checkExistingDaemon();
      if (existingDaemon.exists) {
        this.logger.log('error', existingDaemon.message!);
        throw new Error(existingDaemon.message);
      }
      
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
      const initialScanQueue: string[] = [];
      let isProcessingQueue = false;

      // Process initial scan queue sequentially with batch processing
      const processInitialScanQueue = async () => {
        if (isProcessingQueue || initialScanQueue.length === 0) return;
        
        isProcessingQueue = true;
        const batchSize = 10; // Process in smaller batches to avoid transaction conflicts
        
        while (initialScanQueue.length > 0) {
          const batch = initialScanQueue.splice(0, batchSize);
          
          for (const filePath of batch) {
            try {
              await this.fileEventHandler.handleFileEvent('find', filePath);
              // Small delay between operations to prevent transaction conflicts
              await new Promise(resolve => setTimeout(resolve, 1));
            } catch (error) {
              this.logger.log('warn', `Failed to handle find event for ${filePath}: ${error}`);
            }
          }
          
          // Pause between batches to allow other operations
          if (initialScanQueue.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
        isProcessingQueue = false;
      };

      // Handle file events with move detection
      this.watcher
        .on('add', (filePath) => {
          this.logger.debugLog(`CHOKIDAR EVENT: add`, { filePath, timestamp: Date.now(), isInitialScan });
          if (isInitialScan) {
            initialScanQueue.push(filePath);
            processInitialScanQueue();
          } else {
            this.fileEventHandler.handleAddEvent(filePath);
          }
        })
        .on('ready', async () => {
          isInitialScan = false;
          
          // Wait for queue to finish processing
          while (isProcessingQueue || initialScanQueue.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
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

      this.logger.log('info', `Daemon started successfully (PID: ${process.pid})`);
      
    } catch (error) {
      this.logger.log('error', `Failed to start daemon: ${error}`);
      throw error;
    }
  }
}

// Main execution
async function main() {
  const daemon = new DaemonManager();
  
  try {
    await daemon.start();
  } catch (error) {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}