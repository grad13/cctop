/**
 * cctop Daemon - File monitoring service
 * Implements BP-002 Daemon-CLI Architecture with complete FUNC-003/106 compliance
 */

import chokidar from 'chokidar';
import { Database, FileEvent, DaemonConfig, DaemonState } from '@cctop/shared';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

interface PendingUnlink {
  filePath: string;
  inode: number;
  timestamp: number;
}

interface PendingAdd {
  filePath: string;
  inode: number;
  timestamp: number;
  stats: any;
}

class DaemonManager {
  private db: Database;
  private watcher: chokidar.FSWatcher | null = null;
  private config: DaemonConfig;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;
  private startedBy: 'cli' | 'standalone' = 'standalone';
  private pendingUnlinks: Map<number, PendingUnlink> = new Map();
  private pendingAdds: Map<number, PendingAdd> = new Map();

  constructor(startedBy: 'cli' | 'standalone' = 'standalone') {
    this.startedBy = startedBy;
    this.config = this.getDefaultConfig();
    this.db = new Database(this.config.database.path || '.cctop/data/activity.db');
  }

  private getDefaultConfig(): DaemonConfig {
    return {
      version: '0.3.0.0',
      monitoring: {
        watchPaths: [process.cwd()],
        excludePatterns: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.*',
          '**/.cctop/**'
        ],
        debounceMs: 100,
        maxDepth: 10,
        moveThresholdMs: 100,
        systemLimits: {
          requiredLimit: 524288,
          checkOnStartup: true,
          warnIfInsufficient: true
        }
      },
      daemon: {
        pidFile: '.cctop/runtime/daemon.pid',
        logFile: '.cctop/logs/daemon.log',
        logLevel: 'info',
        heartbeatInterval: 30000,
        autoStart: true
      },
      database: {
        writeMode: 'WAL',
        syncMode: 'NORMAL',
        cacheSize: 65536,
        busyTimeout: 5000,
        path: '.cctop/data/activity.db'
      }
    };
  }

  private async ensureDirectories(): Promise<void> {
    const dirs = [
      '.cctop',
      '.cctop/config',
      '.cctop/themes',
      '.cctop/data',
      '.cctop/logs',
      '.cctop/runtime',
      '.cctop/temp'
    ];

    for (const dir of dirs) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
        this.log('info', `Created directory: ${dir}`);
      }
    }
  }

  private async writePidFile(): Promise<void> {
    const state: DaemonState = {
      pid: process.pid,
      started_by: this.startedBy,
      started_at: Date.now(),
      config_path: path.resolve('.cctop/daemon-config.json')
    };

    await fs.writeFile(this.config.daemon.pidFile, JSON.stringify(state, null, 2));
    this.log('info', `PID file written: ${this.config.daemon.pidFile}`);
  }

  private async removePidFile(): Promise<void> {
    try {
      await fs.unlink(this.config.daemon.pidFile);
      this.log('info', 'PID file removed');
    } catch (error) {
      this.log('warn', `Failed to remove PID file: ${error}`);
    }
  }

  private log(level: string, message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} [${level.toUpperCase()}] ${message}`;
    console.log(logEntry);
    
    // Write to log file synchronously
    this.writeToLogFileSync(logEntry);
  }

  private writeToLogFileSync(logEntry: string): void {
    try {
      const logFilePath = this.config.daemon.logFile;
      const logDir = path.dirname(logFilePath);
      
      // Ensure log directory exists
      const fsSync = require('fs');
      if (!fsSync.existsSync(logDir)) {
        fsSync.mkdirSync(logDir, { recursive: true });
      }
      
      // Append to log file with better error context
      fsSync.appendFileSync(logFilePath, logEntry + '\n', 'utf8');
    } catch (error) {
      // Don't use this.log() here to avoid infinite recursion
      // Include more context for debugging
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to write to log file ${this.config.daemon.logFile}: ${errorMessage}`);
    }
  }

  private debugLog(message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} [DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }

  private async handleUnlinkEvent(filePath: string): Promise<void> {
    try {
      this.debugLog(`handleUnlinkEvent start`, { filePath });
      
      // Try to get inode from database for deleted files
      const events = await this.db.getRecentEvents(1, filePath);
      if (events.length > 0) {
        const lastEvent = events[0];
        
        this.debugLog(`Found last event for unlinked file`, { lastEvent: { id: lastEvent.id, type: lastEvent.eventType, inode: lastEvent.inodeNumber } });
        
        const pendingUnlink: PendingUnlink = {
          filePath,
          inode: lastEvent.inodeNumber,
          timestamp: Date.now()
        };
        
        this.pendingUnlinks.set(lastEvent.inodeNumber, pendingUnlink);
        this.debugLog(`Added to pending unlinks`, { inode: lastEvent.inodeNumber, pendingUnlinksSize: this.pendingUnlinks.size });
        
        // Set timeout to convert to delete if no matching add occurs
        setTimeout(() => {
          if (this.pendingUnlinks.has(lastEvent.inodeNumber)) {
            this.pendingUnlinks.delete(lastEvent.inodeNumber);
            this.debugLog(`Pending unlink timeout - converting to delete`, { filePath, inode: lastEvent.inodeNumber });
            this.handleFileEvent('delete', filePath);
          }
        }, this.config.monitoring.moveThresholdMs);
      } else {
        // No previous record, treat as direct delete
        this.debugLog(`No previous record found - direct delete`, { filePath });
        await this.handleFileEvent('delete', filePath);
      }
    } catch (error) {
      this.log('error', `Failed to handle unlink event: ${error}`);
    }
  }

  private async handleAddEvent(filePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      const inode = stats.ino;
      
      this.debugLog(`handleAddEvent start`, { filePath, inode, pendingUnlinksSize: this.pendingUnlinks.size });
      
      // Store this add event and delay processing to detect potential moves
      const addData = { filePath, inode, stats, timestamp: Date.now() };
      
      // Wait for potential unlink events, then process
      setTimeout(async () => {
        await this.processAddEvent(addData);
      }, 50);  // 50ms delay to catch concurrent unlink events
      
    } catch (error) {
      this.log('error', `Failed to handle add event: ${error}`);
    }
  }

  private async processAddEvent(addData: { filePath: string, inode: number, stats: any, timestamp: number }): Promise<void> {
    try {
      const { filePath, inode, stats } = addData;
      
      this.debugLog(`processAddEvent start`, { filePath, inode, pendingUnlinksSize: this.pendingUnlinks.size });
      
      // Check if this is a move (matching inode from recent unlink)
      if (this.pendingUnlinks.has(inode)) {
        const pendingUnlink = this.pendingUnlinks.get(inode)!;
        const timeDiff = Date.now() - pendingUnlink.timestamp;
        
        this.debugLog(`Found pending unlink`, { pendingUnlink, timeDiff, threshold: this.config.monitoring.moveThresholdMs });
        
        if (timeDiff <= this.config.monitoring.moveThresholdMs) {
          // This is a move operation
          this.pendingUnlinks.delete(inode);
          
          const event: FileEvent = {
            eventType: 'move',
            filePath,
            directory: path.dirname(filePath),
            filename: path.basename(filePath),
            fileSize: stats.size,
            timestamp: new Date(),
            inodeNumber: inode
          };
          
          await this.db.insertEvent(event);
          this.debugLog(`Move detected (unlink→add)`, { from: pendingUnlink.filePath, to: filePath });
          return;
        } else {
          // Timeout exceeded, clean up
          this.pendingUnlinks.delete(inode);
          this.debugLog(`Pending unlink timeout exceeded`, { timeDiff, threshold: this.config.monitoring.moveThresholdMs });
        }
      }
      
      // Check for restore condition: same file path with recent delete event
      const restoreTimeLimit = 5 * 60 * 1000; // 5 minutes in milliseconds
      const recentEvents = await this.db.getRecentEvents(10, filePath);
      const recentDeleteEvent = recentEvents.find(e => 
        e.eventType === 'delete' && 
        e.filePath === filePath &&
        (Date.now() - e.timestamp.getTime()) <= restoreTimeLimit
      );
      
      if (recentDeleteEvent) {
        // This is a restore: same path file reappearing within time limit
        this.debugLog(`Restore detected`, { 
          filePath, 
          deleteTime: recentDeleteEvent.timestamp, 
          timeSinceDelete: Date.now() - recentDeleteEvent.timestamp.getTime()
        });
        
        const restoreEvent: FileEvent = {
          eventType: 'restore',
          filePath,
          directory: path.dirname(filePath),
          filename: path.basename(filePath),
          fileSize: stats.size,
          timestamp: new Date(),
          inodeNumber: inode
        };
        
        await this.db.insertEvent(restoreEvent);
        this.debugLog(`Restore event created`, { filePath, newInode: inode, originalInode: recentDeleteEvent.inodeNumber });
        return;
      }
      
      // Check for recent events with same inode - potential move operation
      const recentSameInodeEvents = recentEvents.filter(e => 
        e.inodeNumber === inode && 
        (Date.now() - e.timestamp.getTime()) <= this.config.monitoring.moveThresholdMs
      );
      
      this.debugLog(`Recent events check`, { recentEvents: recentEvents.length, sameInodeEvents: recentSameInodeEvents.length });
      
      if (recentSameInodeEvents.length > 0) {
        // Found recent events with same inode - this could be a move
        const createEvent = recentSameInodeEvents.find(e => e.eventType === 'create');
        
        if (createEvent && createEvent.filePath !== filePath) {
          // This is a move: existing create event → new add event
          const moveEvent: FileEvent = {
            eventType: 'move',
            filePath,
            directory: path.dirname(filePath),
            filename: path.basename(filePath),
            fileSize: stats.size,
            timestamp: new Date(),
            inodeNumber: inode
          };
          
          await this.db.insertEvent(moveEvent);
          this.debugLog(`Move detected (create→add)`, { from: createEvent.filePath, to: filePath });
          return;
        }
      }
      
      // Regular create event (immediate processing)
      this.debugLog(`Creating regular create event`, { filePath, inode });
      await this.handleFileEvent('create', filePath);
      
    } catch (error) {
      this.log('error', `Failed to process add event: ${error}`);
    }
  }

  private async handleFileEvent(eventType: FileEvent['eventType'], filePath: string): Promise<void> {
    try {
      let stats: any = null;
      let fileSize = 0;
      let inodeNumber = 0;

      if (eventType !== 'delete') {
        try {
          stats = await fs.stat(filePath);
          fileSize = stats.size;
          inodeNumber = stats.ino;
        } catch (error) {
          this.log('error', `Failed to get stats for ${filePath}, recording event with default values: ${error}`);
          // Continue with default values (fileSize=0, inodeNumber=0)
          // This ensures the event is still recorded despite stat failure
          fileSize = 0;
          inodeNumber = 0;
        }
      } else {
        // For delete events, try to get inode from database
        try {
          const events = await this.db.getRecentEvents(1, filePath);
          if (events.length > 0) {
            inodeNumber = events[0].inodeNumber;
            fileSize = events[0].fileSize; // Use last known size
          } else {
            this.log('warn', `No previous events found for delete event ${filePath}, using default values`);
            // File not previously tracked, use default values
            inodeNumber = 0;
            fileSize = 0;
          }
        } catch (error) {
          this.log('error', `Failed to get inode for delete event ${filePath}, using default values: ${error}`);
          // Continue with default values to ensure delete event is recorded
          inodeNumber = 0;
          fileSize = 0;
        }
      }

      const event: FileEvent = {
        eventType,
        filePath,
        directory: path.dirname(filePath),
        filename: path.basename(filePath),
        fileSize,
        timestamp: new Date(),
        inodeNumber
      };

      await this.db.insertEvent(event);
      this.log('info', `Event recorded: ${eventType} ${filePath}`);
    } catch (error) {
      this.log('error', `Failed to handle file event: ${error}`);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.log('debug', 'Daemon heartbeat');
    }, this.config.daemon.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private async performStartupDeleteDetection(): Promise<void> {
    try {
      this.log('info', 'Starting startup delete detection...');
      
      // Get all files that were previously tracked (not already deleted)
      const recentEvents = await this.db.getRecentEvents(1000); // Get large number of recent events
      
      // Find the latest event for each unique file path
      const latestEventsByPath = new Map<string, any>();
      for (const event of recentEvents) {
        const existing = latestEventsByPath.get(event.filePath);
        if (!existing || event.timestamp > existing.timestamp) {
          latestEventsByPath.set(event.filePath, event);
        }
      }
      
      // Filter to files that should still exist (not already deleted)
      const expectedFiles = Array.from(latestEventsByPath.values()).filter(event => 
        event.eventType !== 'delete'
      );
      
      this.debugLog(`Startup delete detection`, { 
        totalEvents: recentEvents.length,
        uniqueFiles: latestEventsByPath.size,
        expectedFiles: expectedFiles.length
      });
      
      // Check each expected file for existence
      const missingFiles: string[] = [];
      for (const event of expectedFiles) {
        try {
          await fs.access(event.filePath);
          // File exists, no action needed
        } catch (error) {
          // File does not exist, should be marked as deleted
          missingFiles.push(event.filePath);
          
          this.debugLog(`Missing file detected`, { 
            filePath: event.filePath,
            lastEventType: event.eventType,
            lastTimestamp: event.timestamp
          });
          
          // Create delete event for missing file
          const deleteEvent: FileEvent = {
            eventType: 'delete',
            filePath: event.filePath,
            directory: path.dirname(event.filePath),
            filename: path.basename(event.filePath),
            fileSize: event.fileSize || 0,
            timestamp: new Date(),
            inodeNumber: event.inodeNumber || 0
          };
          
          await this.db.insertEvent(deleteEvent);
          this.log('info', `Startup delete detected: ${event.filePath}`);
        }
      }
      
      this.log('info', `Startup delete detection completed. Found ${missingFiles.length} missing files.`);
      
    } catch (error) {
      this.log('error', `Failed to perform startup delete detection: ${error}`);
    }
  }

  private setupSignalHandlers(): void {
    // Graceful shutdown on SIGINT/SIGTERM
    process.on('SIGINT', () => this.shutdown('SIGINT'));
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    
    // Configuration reload on SIGHUP
    process.on('SIGHUP', () => {
      this.log('info', 'Received SIGHUP, reloading configuration...');
      this.reloadConfiguration();
    });
  }

  private async reloadConfiguration(): Promise<void> {
    const configPath = '.cctop/config/daemon.json';
    
    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      const newConfig = JSON.parse(configContent) as DaemonConfig;
      
      // Basic validation of required properties
      if (this.isValidConfig(newConfig)) {
        this.config = { ...this.getDefaultConfig(), ...newConfig };
        this.log('info', 'Configuration reloaded successfully');
      } else {
        this.log('error', 'Invalid configuration structure, continuing with current configuration');
      }
      
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        this.config = this.getDefaultConfig();
        this.log('info', 'Config file not found, using default configuration');
      } else {
        this.log('error', `Failed to reload configuration: ${error.message}`);
        this.log('info', 'Continuing with current configuration');
      }
    }
  }

  private isValidConfig(config: any): config is DaemonConfig {
    return (
      config &&
      typeof config === 'object' &&
      (!config.monitoring || (
        typeof config.monitoring === 'object' &&
        (!config.monitoring.watchPaths || Array.isArray(config.monitoring.watchPaths)) &&
        (!config.monitoring.excludePatterns || Array.isArray(config.monitoring.excludePatterns))
      ))
    );
  }

  private async shutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }
    
    this.isShuttingDown = true;
    this.log('info', `Received ${signal}, shutting down daemon...`);

    this.stopHeartbeat();

    if (this.watcher) {
      await this.watcher.close();
      this.log('info', 'File watcher closed');
    }

    if (this.db) {
      await this.db.close();
      this.log('info', 'Database connection closed');
    }

    await this.removePidFile();
    
    this.log('info', 'Daemon shutdown complete');
    process.exit(0);
  }

  async start(): Promise<void> {
    try {
      this.log('info', 'Starting cctop daemon...');
      
      // Setup environment
      await this.ensureDirectories();
      await this.writePidFile();
      this.setupSignalHandlers();
      
      // Initialize database
      await this.db.connect();
      this.log('info', 'Database connected');

      // Initialize file watcher with initial scan
      this.watcher = chokidar.watch(this.config.monitoring.watchPaths, {
        persistent: true,
        ignoreInitial: false,  // Enable initial scan for 'find' events
        ignored: this.config.monitoring.excludePatterns,
        depth: this.config.monitoring.maxDepth
      });

      let isInitialScan = true;

      // Handle file events with move detection
      this.watcher
        .on('add', (filePath) => {
          this.debugLog(`CHOKIDAR EVENT: add`, { filePath, timestamp: Date.now(), isInitialScan });
          if (isInitialScan) {
            // During initial scan, treat as 'find' event
            this.handleFileEvent('find', filePath);
          } else {
            // During real-time monitoring, handle as potential move/create
            this.handleAddEvent(filePath);
          }
        })
        .on('ready', async () => {
          // Initial scan completed, switch to real-time monitoring mode
          isInitialScan = false;
          this.log('info', 'Initial file scan completed, switching to real-time monitoring');
          
          // Perform startup delete detection
          await this.performStartupDeleteDetection();
        })
        .on('change', (filePath) => {
          this.debugLog(`CHOKIDAR EVENT: change`, { filePath, timestamp: Date.now() });
          this.handleFileEvent('modify', filePath);
        })
        .on('unlink', (filePath) => {
          this.debugLog(`CHOKIDAR EVENT: unlink`, { filePath, timestamp: Date.now() });
          this.handleUnlinkEvent(filePath);
        })
        .on('addDir', (dirPath) => this.log('debug', `Directory added: ${dirPath}`))
        .on('unlinkDir', (dirPath) => this.log('debug', `Directory removed: ${dirPath}`))
        .on('error', (error) => this.log('error', `Watcher error: ${error}`));

      // Start heartbeat
      this.startHeartbeat();

      this.log('info', `Daemon started successfully (PID: ${process.pid}, started by: ${this.startedBy})`);
      
    } catch (error) {
      this.log('error', `Failed to start daemon: ${error}`);
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
  main().catch(console.error);
}