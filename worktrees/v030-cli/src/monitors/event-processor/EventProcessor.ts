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
  EventProcessorStats,
  DatabaseManager,
  FilterState,
  EventType
} from './EventTypes';
import { EventQueue } from './EventQueue';
import { EventAggregator } from './EventAggregator';
import { MoveDetector } from './MoveDetector';

class EventProcessor extends EventEmitter {
  private db: DatabaseManager;
  private config: EventProcessorConfig;
  private isInitialScanMode: boolean = true;
  private dbInitWarningShown: boolean = false;
  
  // Sub-components
  private eventQueue: EventQueue;
  private eventAggregator: EventAggregator;
  private moveDetector: MoveDetector;

  constructor(databaseManager: DatabaseManager, config: EventProcessorConfig = {}) {
    super();
    this.setMaxListeners(20); // Memory leak countermeasure
    this.db = databaseManager;
    this.config = config;
    
    // Initialize sub-components
    this.eventQueue = new EventQueue();
    this.eventAggregator = new EventAggregator(this.initializeEventFilters());
    this.moveDetector = new MoveDetector(databaseManager);
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
    this.eventQueue.enqueue(event);
    
    // Start queue processing if not already processing
    if (!this.eventQueue.isProcessing()) {
      this.eventQueue.setProcessing(true);
      await this.processEventQueue();
      this.eventQueue.setProcessing(false);
    }
    
    return null; // Do not return result immediately due to queueing
  }

  /**
   * Sequential processing of event queue
   */
  private async processEventQueue(): Promise<void> {
    while (this.eventQueue.hasEvents()) {
      const event = this.eventQueue.dequeue()!;
      
      try {
        await this.processEventInternal(event);
      } catch (error) {
        console.error('Event processing failed:', error);
        const errorResult: EventProcessingError = { event, error: error as Error };
        setImmediate(() => {
          if (!this.eventQueue.isDestroyed()) {
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
      // Enhanced database readiness check
      if (!await this.isDatabaseReady()) {
        // Show warning only once
        if (!this.dbInitWarningShown) {
          console.warn('[EventProcessor] Database not initialized, queueing events...');
          this.dbInitWarningShown = true;
        }
        
        this.eventQueue.retryEvent(event);
        return null;
      }
      
      // Event type mapping
      const eventType = this.eventAggregator.mapEventType(event.type);
      if (!eventType) {
        return null;
      }
      
      // Event filtering check
      if (this.eventAggregator.shouldFilterEvent(eventType)) {
        return null;
      }

      // Collect metadata
      const metadata = await this.eventAggregator.collectMetadata(event.path, event.stats, eventType);
      
      // Skip if metadata is null (directory case)
      if (!metadata) {
        return null;
      }
      
      // For delete events, save to move cache
      if (eventType === 'delete') {
        await this.moveDetector.trackDelete(event.path);
      }
      
      // Move detection (on create/find events)
      if ((eventType === 'find' || eventType === 'create') && metadata.inode) {
        // Check for move events
        const moveCheck = await this.moveDetector.checkForMove(metadata);
        if (moveCheck.isMove) {
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
            if (!this.eventQueue.isDestroyed()) {
              this.emit('eventProcessed', result);
            }
          });
          
          return result;
        }
        
        // Restore detection
        if (await this.moveDetector.checkForRestore(metadata)) {
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
            if (!this.eventQueue.isDestroyed()) {
              this.emit('eventProcessed', result);
            }
          });
          
          return result;
        }
        
        // Duplicate find event prevention
        if (eventType === 'find' && await this.moveDetector.checkDuplicateFind(metadata)) {
          return null;
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
        if (!this.eventQueue.isDestroyed()) {
          this.emit('eventProcessed', result);
        }
      });
      
      return result;
      
    } catch (error) {
      console.error('Event processing failed:', error);
      const errorResult: EventProcessingError = { event, error: error as Error };
      setImmediate(() => {
        if (!this.eventQueue.isDestroyed()) {
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
    this.emit('findComplete');
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
      return false;
    }
  }

  /**
   * Cleanup processing
   */
  cleanup(): void {
    this.eventQueue.cleanup();
    this.moveDetector.clear();
    this.removeAllListeners();
  }
}

export = EventProcessor;