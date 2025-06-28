/**
 * Progressive Loader (FUNC-206 compliant)
 * Handles progressive data loading for instant viewer
 */

import { EventEmitter } from 'events';
import { 
  DatabaseManager, 
  DisplayManager, 
  StatusDisplay, 
  LoadProgress, 
  LoaderStats,
  ProgressiveLoaderConfig 
} from '../types/common';

class ProgressiveLoader extends EventEmitter {
  private db: DatabaseManager;
  private display: DisplayManager;
  private status: StatusDisplay;
  private loadedCount: number;
  private batchSize: number;
  private loadDelay: number;
  private lastLoadedEventId: number;

  constructor(
    databaseManager: DatabaseManager, 
    displayManager: DisplayManager, 
    statusDisplay: StatusDisplay,
    config: ProgressiveLoaderConfig = {}
  ) {
    super();
    this.db = databaseManager;
    this.display = displayManager;
    this.status = statusDisplay;
    this.loadedCount = 0;
    this.batchSize = config.batchSize || 100; // Load events in batches
    this.loadDelay = config.loadDelay || 10; // Delay between batches (ms)
    this.lastLoadedEventId = 0; // Track the last loaded event ID
  }

  /**
   * Load data progressively without blocking UI
   */
  async loadData(): Promise<void> {
    try {
      // Get total event count
      const totalCount: number = await this.db.getEventCount();
      
      if (totalCount === 0) {
        this.status.updateMessage(">> No existing events found");
        return;
      }
      
      // Create event stream for progressive loading
      await this.loadEventsProgressively(totalCount);
      
    } catch (error) {
      console.error('Progressive loading error:', error);
      throw error;
    }
  }

  /**
   * Load events in batches progressively
   */
  private async loadEventsProgressively(totalCount: number): Promise<void> {
    let offset: number = 0;
    
    while (offset < totalCount) {
      try {
        // Load batch of events
        const events: any[] = await this.db.getEventsBatch(offset, this.batchSize);
        
        if (events.length === 0) {
          break;
        }
        
        // Add events to display
        if (this.display && this.display.addEvents) {
          this.display.addEvents(events);
        }
        
        // Track the last event ID
        if (events.length > 0) {
          this.lastLoadedEventId = Math.max(...events.map((e: any) => e.id || 0));
        }
        
        // Update loaded count
        this.loadedCount += events.length;
        offset += events.length;
        
        // Update status message
        const percentage: number = Math.round((this.loadedCount / totalCount) * 100);
        this.status.updateMessage(
          `>> Loading existing events... (${this.loadedCount}/${totalCount} - ${percentage}%)`
        );
        
        // Emit progress event
        const progress: LoadProgress = {
          loaded: this.loadedCount,
          total: totalCount,
          percentage
        };
        this.emit('progress', progress);
        
        // Small delay to prevent UI blocking
        if (offset < totalCount) {
          await new Promise(resolve => setTimeout(resolve, this.loadDelay));
        }
        
      } catch (error) {
        console.error(`Error loading batch at offset ${offset}:`, error);
        // Continue with next batch
        offset += this.batchSize;
      }
    }
    
    // Loading complete
    this.status.updateMessage(`>> Loaded ${this.loadedCount} events`);
    this.emit('complete', { loaded: this.loadedCount });
  }
  
  /**
   * Get the last loaded event ID
   */
  getLastLoadedEventId(): number {
    return this.lastLoadedEventId;
  }

  /**
   * Create a stream for real-time event loading
   */
  createEventStream(): EventEmitter {
    const stream = new EventEmitter();
    
    // Simulate streaming with batched loading
    setImmediate(async () => {
      try {
        const totalCount: number = await this.db.getEventCount();
        let offset: number = 0;
        
        while (offset < totalCount) {
          const events: any[] = await this.db.getEventsBatch(offset, this.batchSize);
          
          if (events.length === 0) {
            stream.emit('end');
            break;
          }
          
          stream.emit('data', events);
          offset += events.length;
          
          // Yield to event loop
          await new Promise(resolve => setImmediate(resolve));
        }
        
      } catch (error) {
        stream.emit('error', error);
      }
    });
    
    return stream;
  }

  /**
   * Load recent events first for immediate display
   */
  async loadRecentEventsFirst(limit: number = 50): Promise<number> {
    try {
      // Get most recent events
      console.log(`[ProgressiveLoader] Loading ${limit} recent events only`);
      const recentEvents: any[] = await this.db.getRecentEvents(limit);
      
      if (recentEvents.length > 0) {
        // Display recent events immediately
        if (this.display && this.display.addEvents) {
          this.display.addEvents(recentEvents);
        }
        
        // Track the last loaded event ID - IMPORTANT!
        this.lastLoadedEventId = Math.max(...recentEvents.map((e: any) => e.id || 0));
        console.log(`[ProgressiveLoader] Set lastLoadedEventId to: ${this.lastLoadedEventId}`);
        
        this.loadedCount = recentEvents.length;
        this.status.updateMessage(
          `>> Loaded ${recentEvents.length} recent events`
        );
        
        return recentEvents.length;
      }
      
      return 0;
      
    } catch (error) {
      console.error('Error loading recent events:', error);
      return 0;
    }
  }

  /**
   * Get loading statistics
   */
  getStats(): LoaderStats {
    return {
      loadedCount: this.loadedCount,
      batchSize: this.batchSize,
      loadDelay: this.loadDelay
    };
  }
}

export = ProgressiveLoader;