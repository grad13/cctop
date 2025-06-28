/**
 * Event Processor (FUNC-001/002 v0.2.0.0 compliant)
 * Complete file lifecycle tracking with chokidar integration
 */

import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import {
  EventProcessorConfig,
  FileEventInput,
  FileEventMetadata,
  ProcessedEventResult,
  EventProcessingError,
  MoveDetectionInfo,
  EventProcessorStats,
  DatabaseManager,
  FilterState,
  EventType
} from '../types/common';

class EventProcessor extends EventEmitter {
  private db: DatabaseManager;
  private config: EventProcessorConfig;
  private isInitialScanMode: boolean = true;
  private destroyed: boolean = false;
  private dbInitWarningShown: boolean = false;
  private eventFilters: FilterState;
  private recentDeletes: Map<string, MoveDetectionInfo> = new Map();
  private moveDetectionWindow: number = 1000;
  private eventQueue: FileEventInput[] = [];
  private processing: boolean = false;

  constructor(databaseManager: DatabaseManager, config: EventProcessorConfig = {}) {
    super();
    this.setMaxListeners(20); // Memory leak countermeasure
    this.db = databaseManager;
    this.config = config;
    
    // Event filtering settings (FUNC-023 compliant)
    this.eventFilters = this.initializeEventFilters();
  }

  /**
   * Initialize event filtering settings
   */
  private initializeEventFilters(): FilterState {
    const defaultFilters: FilterState = {
      find: true,
      create: true,
      modify: true,
      delete: true,
      move: true,
      restore: true
    };
    
    // Load filter settings from config.json
    if (this.config.monitoring && this.config.monitoring.eventFilters) {
      return { ...defaultFilters, ...this.config.monitoring.eventFilters };
    }
    
    return defaultFilters;
  }
  
  /**
   * Process events from file monitoring (with queueing support)
   */
  async processFileEvent(event: FileEventInput): Promise<ProcessedEventResult | null> {
    // Add event to queue
    this.eventQueue.push(event);
    
    // Start queue processing if not already processing
    if (!this.processing) {
      this.processing = true;
      await this.processEventQueue();
      this.processing = false;
    }
    
    return null; // Do not return result immediately due to queueing
  }

  /**
   * Sequential processing of event queue
   */
  private async processEventQueue(): Promise<void> {
    while (this.eventQueue.length > 0 && !this.destroyed) {
      const event = this.eventQueue.shift()!;
      
      try {
        await this.processEventInternal(event);
      } catch (error) {
        console.error('Event processing failed:', error);
        const errorResult: EventProcessingError = { event, error: error as Error };
        setImmediate(() => {
          if (!this.destroyed) {
            this.emit('processingError', errorResult);
          }
        });
      }
    }
  }

  /**
   * Internal event processing (original processFileEvent logic)
   */
  private async processEventInternal(event: FileEventInput): Promise<ProcessedEventResult | null> {
    try {
      // Add retry count tracking
      if (!event.retryCount) {
        event.retryCount = 0;
      }
      
      // Check max retry count
      if (event.retryCount > 10) {
        console.error('[EventProcessor] Max retries exceeded, dropping event:', event.path);
        return null;
      }
      
      // Enhanced database readiness check
      if (!await this.isDatabaseReady()) {
        // Show warning only once
        if (!this.dbInitWarningShown) {
          console.warn('[EventProcessor] Database not initialized, queueing events...');
          this.dbInitWarningShown = true;
        }
        
        event.retryCount++;
        
        // Delayed re-queueing to prevent infinite loop
        setTimeout(() => {
          if (!this.destroyed && this.eventQueue.length < 1000) { // Queue size limit
            this.eventQueue.push(event);
          }
        }, 100);
        
        return null;
      }
      
      if (process.env.NODE_ENV === 'test' || process.env.CCTOP_VERBOSE) {
        console.log('[EventProcessor] Processing event:', event.type, 'for', event.path);
      }
      
      // Event type mapping
      const eventType = this.mapEventType(event.type);
      if (!eventType) {
        return null;
      }
      
      // Event filtering check
      if (!this.eventFilters[eventType]) {
        if (process.env.NODE_ENV === 'test' || process.env.CCTOP_VERBOSE) {
          console.log(`[EventProcessor] Event filtered out: ${eventType}`);
        }
        return null;
      }

      // Collect metadata
      const metadata = await this.collectMetadata(event.path, event.stats, eventType);
      
      // Skip if metadata is null (directory case)
      if (!metadata) {
        if (process.env.NODE_ENV === 'test' || process.env.CCTOP_VERBOSE) {
          console.log(`[EventProcessor] Skipping directory: ${event.path}`);
        }
        return null;
      }
      
      // For delete events, save to move cache
      if (eventType === 'delete') {
        // Get existing file info and cache it
        const fileInfo = await this.db.findByPath(event.path);
        if (fileInfo && fileInfo.inode) {
          this.recentDeletes.set(event.path, {
            inode: fileInfo.inode,
            timestamp: Date.now()
          });
          
          // Clean up old entries
          this.cleanupMoveCache();
        }
      }
      
      // Move detection (on create/find events)
      if ((eventType === 'find' || eventType === 'create') && metadata.inode) {
        // Check for move events
        for (const [deletedPath, deleteInfo] of this.recentDeletes.entries()) {
          if (deleteInfo.inode === metadata.inode && 
              Date.now() - deleteInfo.timestamp < this.moveDetectionWindow) {
            // Record as move event
            this.recentDeletes.delete(deletedPath);
            
            const moveEventId = await this.db.recordEvent({
              ...metadata,
              event_type: 'move'
            });
            
            const result: ProcessedEventResult = {
              original: event,
              recorded: {
                id: moveEventId,
                ...metadata,
                event_type: 'move',
              },
              eventType: 'move'
            };
            
            setImmediate(() => {
              if (!this.destroyed) {
                this.emit('eventProcessed', result);
              }
            });
            
            return result;
          }
        }
        
        // Restore detection (FUNC-001 compliant: revival of deleted files within 5 minutes)
        const existing = await this.db.findByPath(metadata.file_path);
        if (existing && existing.is_active === false) {
          // Check if within 5 minutes of deletion (planned to be configurable)
          const restoreTimeLimit = 5 * 60 * 1000; // 5 minutes
          const timeSinceDeletion = Date.now() - existing.last_event_timestamp;
          
          if (timeSinceDeletion <= restoreTimeLimit) {
            // Record as restore event
            metadata.event_type = 'restore';
            const eventId = await this.db.recordEvent({
              ...metadata,
              event_type: 'restore'
            });
            
            const result: ProcessedEventResult = {
              original: event,
              recorded: {
                id: eventId,
                ...metadata,
                event_type: 'restore'
              },
              eventType: 'restore'
            };
            
            setImmediate(() => {
              if (!this.destroyed) {
                this.emit('eventProcessed', result);
              }
            });
            
            return result;
          }
        }
        
        // Duplicate find event prevention - inodeベースでチェック
        if (eventType === 'find' && metadata.inode) {
          const existingByInode = await this.db.get(`
            SELECT f.id, f.is_active 
            FROM files f 
            WHERE f.inode = ? AND f.is_active = 1
            LIMIT 1
          `, [metadata.inode]);
          
          if (existingByInode) {
            return null;
          }
        }
      }
      
      // Record normal event
      const eventId = await this.db.recordEvent({
        ...metadata,
        event_type: eventType
      });
      
      // Processing result object
      const result: ProcessedEventResult = {
        original: event,
        recorded: {
          id: eventId,
          ...metadata,
          event_type: eventType
        },
        eventType
      };
      
      // Emit processing complete event
      setImmediate(() => {
        if (!this.destroyed) {
          this.emit('eventProcessed', result);
        }
      });
      
      return result;
      
    } catch (error) {
      console.error('Event processing failed:', error);
      const errorResult: EventProcessingError = { event, error: error as Error };
      setImmediate(() => {
        if (!this.destroyed) {
          this.emit('processingError', errorResult);
        }
      });
      throw error;
    }
  }

  /**
   * Handle initial scan completion
   */
  onInitialScanComplete(): void {
    this.isInitialScanMode = false;
    if (process.env.NODE_ENV === 'test' || process.env.CCTOP_VERBOSE) {
      console.log('Initial scan complete - switching to real-time mode');
    }
    this.emit('findComplete');
  }

  /**
   * Event type mapping
   */
  private mapEventType(chokidarEvent: string): EventType | null {
    const eventMapping: Record<string, EventType> = {
      'find': 'find',     // File discovery during initial scan
      'create': 'create', // New creation during real-time monitoring
      'modify': 'modify', // File modification
      'delete': 'delete', // File deletion
      'move': 'move'      // File move (future implementation)
    };
    
    return eventMapping[chokidarEvent] || null;
  }

  /**
   * Collect metadata (FUNC-001 compliant)
   */
  private async collectMetadata(filePath: string, stats: any, eventType: EventType): Promise<FileEventMetadata | null> {
    const metadata: FileEventMetadata = {
      file_path: path.resolve(filePath),
      file_name: path.basename(filePath),
      directory: path.dirname(path.resolve(filePath)),
      // For 'find' events during initial scan, use file's actual modification time
      timestamp: (eventType === 'find' && stats && stats.mtime) 
        ? stats.mtime.getTime() 
        : Date.now()
    };

    if (stats) {
      // FUNC-001: Files only (directories excluded)
      if (stats.isDirectory()) {
        return null; // Skip directories entirely
      }
      
      metadata.file_size = stats.size || 0;
      metadata.inode = stats.ino || null;
      
      // Line count (text files only)
      if (this.isTextFile(filePath)) {
        metadata.line_count = await this.countLines(filePath);
      } else {
        metadata.line_count = null;
      }
      
      // Block count calculation
      metadata.block_count = this.calculateBlockCount(metadata.file_size);
    } else {
      // For delete events, stats are not available
      metadata.file_size = 0;
      metadata.inode = null;
      metadata.line_count = null;
      metadata.block_count = 0;
    }

    return metadata;
  }

  /**
   * Check if file is text file (for line counting)
   */
  private isTextFile(filePath: string): boolean {
    const textExtensions = [
      '.txt', '.js', '.ts', '.jsx', '.tsx', '.json', '.md', '.py', '.java', '.c', '.cpp', '.h',
      '.css', '.html', '.xml', '.yaml', '.yml', '.ini', '.cfg', '.conf', '.log',
      '.sql', '.sh', '.bash', '.zsh', '.fish', '.ps1', '.rb', '.php', '.go', '.rs', '.swift'
    ];
    
    const ext = path.extname(filePath).toLowerCase();
    return textExtensions.includes(ext);
  }

  /**
   * Count lines in text file
   */
  private async countLines(filePath: string): Promise<number> {
    try {
      const data = await fs.promises.readFile(filePath, 'utf8');
      const lines = data.split('\n').length;
      return lines > 0 ? lines : 1; // At least 1 line for non-empty files
    } catch (error) {
      // If unable to read file (permission, etc.), return 0
      return 0;
    }
  }

  /**
   * Calculate block count (512 byte blocks)
   */
  private calculateBlockCount(fileSize: number): number {
    const blockSize = 512;
    return Math.ceil(fileSize / blockSize);
  }

  /**
   * Clean up old entries from move detection cache
   */
  private cleanupMoveCache(): void {
    const now = Date.now();
    for (const [path, info] of this.recentDeletes.entries()) {
      if (now - info.timestamp > this.moveDetectionWindow) {
        this.recentDeletes.delete(path);
      }
    }
  }

  /**
   * Scan for missing files (FUNC-002 compliant)
   */
  async scanForMissingFiles(): Promise<number> {
    try {
      // Get all active files from database
      const activeFiles = await this.db.get(`
        SELECT f.id, f.file_path, f.inode
        FROM files f 
        WHERE f.is_active = 1
      `);
      
      if (!activeFiles || activeFiles.length === 0) {
        return 0;
      }
      
      let missingCount = 0;
      
      for (const file of activeFiles) {
        try {
          // Check if file still exists
          const stats = await fs.promises.stat(file.file_path);
          
          // Additional check: compare inode to detect moves
          if (file.inode && stats.ino !== file.inode) {
            // Record as delete event for old file
            await this.db.recordEvent({
              file_path: file.file_path,
              file_name: path.basename(file.file_path),
              directory: path.dirname(file.file_path),
              timestamp: Date.now(),
              event_type: 'delete',
              file_size: 0,
              inode: file.inode,
              line_count: null,
              block_count: 0
            });
            
            missingCount++;
          }
        } catch (error: any) {
          if (error.code === 'ENOENT') {
            // Record as delete event
            await this.db.recordEvent({
              file_path: file.file_path,
              file_name: path.basename(file.file_path),
              directory: path.dirname(file.file_path),
              timestamp: Date.now(),
              event_type: 'delete',
              file_size: 0,
              inode: file.inode,
              line_count: null,
              block_count: 0
            });
            
            missingCount++;
          } else {
            console.warn(`Warning: Cannot access file ${file.file_path}: ${error.message}`);
          }
        }
      }
      
      return missingCount;
    } catch (error) {
      console.error('Missing file scan failed:', error);
      return 0;
    }
  }

  /**
   * Legacy alias for scanForMissingFiles (backward compatibility)
   * @deprecated Use scanForMissingFiles instead
   */
  async scanForLostFiles(): Promise<number> {
    return await this.scanForMissingFiles();
  }

  /**
   * Get current processing statistics
   */
  getStats(): EventProcessorStats {
    return {
      isInitialScanMode: this.isInitialScanMode,
      processedEvents: this.listenerCount('eventProcessed'),
      errors: this.listenerCount('processingError')
    };
  }

  /**
   * Enhanced database readiness check
   * Verifies both flag and actual connection capability
   */
  private async isDatabaseReady(): Promise<boolean> {
    if (!this.db || !this.db.isInitialized) {
      return false;
    }
    
    // Actual connection test (critical improvement)
    try {
      await new Promise<void>((resolve, reject) => {
        this.db.db.get('SELECT 1', (err: Error | null) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
      return true;
    } catch (error: any) {
      if (process.env.CCTOP_VERBOSE === 'true') {
        console.warn('[EventProcessor] Database connection test failed:', error.message);
      }
      return false;
    }
  }

  /**
   * Cleanup processing
   */
  cleanup(): void {
    this.destroyed = true;
    this.eventQueue = []; // Clear queue
    this.processing = false;
    this.removeAllListeners();
  }
}

export = EventProcessor;