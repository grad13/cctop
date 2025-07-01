/**
 * Event Processor (FUNC-001/002 v0.2.0.0 compliant)
 * Complete file lifecycle tracking with chokidar integration
 */

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class EventProcessor extends EventEmitter {
  constructor(databaseManager, config = {}) {
    super();
    this.setMaxListeners(20); // Memory leak countermeasure
    this.db = databaseManager;
    this.config = config;
    this.isInitialScanMode = true;
    this.destroyed = false;
    this.dbInitWarningShown = false; // Add flag to limit warning messages
    
    // Event filtering settings (FUNC-023 compliant)
    this.eventFilters = this.initializeEventFilters();
    
    // Cache for move event detection
    this.recentDeletes = new Map(); // filePath -> {inode, timestamp}
    this.moveDetectionWindow = 1000; // Detect delete->create within 1 second as move
    
    // Event queueing (transaction conflict avoidance)
    this.eventQueue = [];
    this.processing = false;
    
    console.log('⚡ EventProcessor initialized');
  }

  /**
   * Initialize event filtering settings
   */
  initializeEventFilters() {
    const defaultFilters = {
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
  async processFileEvent(event) {
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
  async processEventQueue() {
    while (this.eventQueue.length > 0 && !this.destroyed) {
      const event = this.eventQueue.shift();
      
      try {
        await this.processEventInternal(event);
      } catch (error) {
        console.error('Event processing failed:', error);
        const errorResult = { event, error };
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
  async processEventInternal(event) {
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
        console.log(`⏭️ Skipping event: ${event.type} for ${path.basename(event.path)}`);
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
            
            const result = {
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
            
            const result = {
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
            console.log(`[EventProcessor] Skipping duplicate find for inode ${metadata.inode}: ${path.basename(metadata.file_path)}`);
            return null;
          } else {
            console.log(`[EventProcessor] Processing find for new inode ${metadata.inode}: ${path.basename(metadata.file_path)}`);
          }
        }
      }
      
      // Record normal event
      const eventId = await this.db.recordEvent({
        ...metadata,
        event_type: eventType
      });
      
      // Processing result object
      const result = {
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
      const errorResult = { event, error };
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
  onInitialScanComplete() {
    this.isInitialScanMode = false;
    if (process.env.NODE_ENV === 'test' || process.env.CCTOP_VERBOSE) {
      console.log('Initial scan complete - switching to real-time mode');
    }
    this.emit('findComplete');
  }

  /**
   * Event type mapping
   */
  mapEventType(chokidarEvent) {
    const eventMapping = {
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
  async collectMetadata(filePath, stats, eventType) {
    const metadata = {
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
        try {
          metadata.line_count = await this.countLines(filePath);
          if (process.env.NODE_ENV === 'test' || process.env.CCTOP_VERBOSE) {
            console.log(`[EventProcessor] Line count for ${path.basename(filePath)}: ${metadata.line_count}`);
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'test' || process.env.CCTOP_VERBOSE) {
            console.log(`[EventProcessor] Line count failed for ${path.basename(filePath)}: ${error.message}`);
          }
          metadata.line_count = null;
        }
      } else {
        metadata.line_count = null;
      }
      
      // Block count (if available)
      metadata.block_count = stats.blocks || null;
    } else {
      // For deleted files
      metadata.file_size = null;
      metadata.line_count = null;
      metadata.block_count = null;
      metadata.inode = null;
    }

    return metadata;
  }

  /**
   * Determine if text file
   */
  isTextFile(filePath) {
    const textExtensions = [
      '.txt', '.md', '.js', '.json', '.html', '.css', '.scss', '.sass',
      '.ts', '.tsx', '.jsx', '.vue', '.php', '.py', '.rb', '.go',
      '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.swift', '.kt',
      '.rs', '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd',
      '.xml', '.yml', '.yaml', '.toml', '.ini', '.cfg', '.conf',
      '.log', '.sql', '.r', '.R', '.m', '.tex', '.bib'
    ];
    
    const ext = path.extname(filePath).toLowerCase();
    return textExtensions.includes(ext);
  }

  /**
   * Count lines in file
   */
  async countLines(filePath) {
    return new Promise((resolve, reject) => {
      let lineCount = 0;
      let lastChunkEndsWithNewline = false;
      
      const stream = fs.createReadStream(filePath, { 
        encoding: 'utf8',
        highWaterMark: 16 * 1024 // 16KB chunks
      });
      
      stream.on('data', (chunk) => {
        // Count newlines in this chunk
        const newlines = chunk.split('\n').length - 1;
        lineCount += newlines;
        
        // Track if chunk ends with newline
        lastChunkEndsWithNewline = chunk.endsWith('\n');
      });
      
      stream.on('end', () => {
        // If file is empty, return 0
        if (lineCount === 0 && !lastChunkEndsWithNewline) {
          resolve(0);
        } else {
          // If file doesn't end with newline, add 1 for the last line
          const finalLineCount = lastChunkEndsWithNewline ? lineCount : lineCount + 1;
          resolve(finalLineCount);
        }
      });
      
      stream.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Clean up move cache
   */
  cleanupMoveCache() {
    const now = Date.now();
    for (const [path, info] of this.recentDeletes.entries()) {
      if (now - info.timestamp > this.moveDetectionWindow) {
        this.recentDeletes.delete(path);
      }
    }
  }
  
  /**
   * Scan for missing files (files in DB but no longer exist on disk)
   * FUNC-001 compliant: delete event detection on startup
   */
  async scanForMissingFiles() {
    try {
      // Check database connection before scanning
      if (!this.db || !this.db.isInitialized) {
        console.warn('[EventProcessor] Database not initialized, skipping missing file scan');
        return;
      }
      
      if (process.env.NODE_ENV === 'test' || process.env.CCTOP_VERBOSE) {
        console.log('[EventProcessor] Starting missing file scan...');
      }
      
      // Get all live files from database
      const liveFiles = await this.db.getLiveFiles();
      
      if (!liveFiles || liveFiles.length === 0) {
        if (process.env.NODE_ENV === 'test' || process.env.CCTOP_VERBOSE) {
          console.log('[EventProcessor] No live files found in database');
        }
        return;
      }
      
      let deletedCount = 0;
      
      // Check each file's existence
      for (const file of liveFiles) {
        if (this.destroyed) {
          break; // Stop if processor is destroyed
        }
        
        try {
          const exists = fs.existsSync(file.file_path);
          
          if (!exists) {
            // File is missing - record delete event
            const metadata = {
              file_path: file.file_path,
              file_name: file.file_name,
              directory: file.directory,
              timestamp: Date.now(),
              file_size: null,
              line_count: null,
              block_count: null,
              inode: file.inode
            };
            
            // Record delete event (FUNC-001 compliant)
            const eventId = await this.db.recordEvent({
              ...metadata,
              event_type: 'delete'
            });
            
            // Create result object
            const result = {
              original: { type: 'delete', path: file.file_path },
              recorded: {
                id: eventId,
                ...metadata,
                event_type: 'delete'
              },
              eventType: 'delete'
            };
            
            // Emit event
            setImmediate(() => {
              if (!this.destroyed) {
                this.emit('eventProcessed', result);
              }
            });
            
            deletedCount++;
            
            if (process.env.NODE_ENV === 'test' || process.env.CCTOP_VERBOSE) {
              console.log(`[EventProcessor] Missing file detected as deleted: ${file.file_name}`);
            }
          }
        } catch (error) {
          console.error(`Error checking file existence: ${file.file_path}`, error);
        }
      }
      
      if (process.env.NODE_ENV === 'test' || process.env.CCTOP_VERBOSE) {
        console.log(`[EventProcessor] Missing file scan complete. Found ${deletedCount} deleted files`);
      }
      
    } catch (error) {
      console.error('Missing file scan failed:', error);
      
      const errorResult = { 
        event: { type: 'scanForMissingFiles' }, 
        error 
      };
      
      setImmediate(() => {
        if (!this.destroyed) {
          this.emit('processingError', errorResult);
        }
      });
      
      throw error;
    }
  }

  /**
   * Legacy alias for scanForMissingFiles (backward compatibility)
   * @deprecated Use scanForMissingFiles instead
   */
  async scanForLostFiles() {
    return await this.scanForMissingFiles();
  }

  /**
   * Get current processing statistics
   */
  getStats() {
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
  async isDatabaseReady() {
    if (!this.db || !this.db.isInitialized) {
      return false;
    }
    
    // Actual connection test (critical improvement)
    try {
      await new Promise((resolve, reject) => {
        this.db.db.get('SELECT 1', (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
      return true;
    } catch (error) {
      if (process.env.CCTOP_VERBOSE === 'true') {
        console.warn('[EventProcessor] Database connection test failed:', error.message);
      }
      return false;
    }
  }

  /**
   * Cleanup processing
   */
  cleanup() {
    this.destroyed = true;
    this.eventQueue = []; // Clear queue
    this.processing = false;
    this.removeAllListeners();
    console.log('EventProcessor cleaned up');
  }
}

module.exports = EventProcessor;