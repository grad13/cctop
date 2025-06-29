/**
 * Monitor Event Handler
 * Handles file monitoring events
 */

import type { MonitorComponents, MonitorEventHandlers } from './monitor.types';

export class MonitorEventHandler {
  private components: MonitorComponents;
  private restartCallback: () => Promise<void>;

  constructor(
    components: MonitorComponents,
    restartCallback: () => Promise<void>
  ) {
    this.components = components;
    this.restartCallback = restartCallback;
  }

  /**
   * Setup event handlers for file monitoring
   */
  setupEventHandlers(): void {
    const { fileMonitor } = this.components;
    
    // Handle file events
    fileMonitor.on('fileEvent', this.handleFileEvent.bind(this));
    
    // Handle monitor ready
    fileMonitor.on('ready', this.handleReady.bind(this));
    
    // Handle monitor errors
    fileMonitor.on('error', this.handleError.bind(this));
  }

  /**
   * Handle file events from monitor
   */
  private async handleFileEvent(event: any): Promise<void> {
    const { eventProcessor, processManager } = this.components;
    
    try {
      await eventProcessor.processFileEvent(event);
      // High-frequency events processed silently
    } catch (error: any) {
      await processManager.log('error', 
        `Failed to process event ${event.type} for ${event.path}: ${error.message}`);
    }
  }

  /**
   * Handle monitor ready event
   */
  private async handleReady(): Promise<void> {
    const { processManager } = this.components;
    await processManager.log('info', 'Initial file scan completed');
  }

  /**
   * Handle monitor errors
   */
  private async handleError(error: Error): Promise<void> {
    const { processManager } = this.components;
    await processManager.log('error', `File monitor error: ${error.message}`);
    
    // Try to restart monitor on error
    setTimeout(async () => {
      await this.restartCallback();
    }, 5000);
  }

  /**
   * Flush pending events before shutdown
   */
  async flushPendingEvents(): Promise<void> {
    const { eventProcessor } = this.components;
    
    if (!eventProcessor || !eventProcessor.eventQueue) {
      return;
    }
    
    const pendingCount = eventProcessor.eventQueue.length;
    if (pendingCount > 0) {
      console.log(`[Monitor] Flushing ${pendingCount} pending events...`);
      
      // Wait for event queue to be processed
      const maxWait = 5000; // 5 seconds max
      const startTime = Date.now();
      
      while (eventProcessor.eventQueue.length > 0 && 
             (Date.now() - startTime) < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const remaining = eventProcessor.eventQueue.length;
      if (remaining > 0) {
        console.warn(`[Monitor] Could not flush ${remaining} events within timeout`);
      }
    }
  }

  /**
   * Get event handlers for external use
   */
  getHandlers(): MonitorEventHandlers {
    return {
      onFileEvent: this.handleFileEvent.bind(this),
      onReady: this.handleReady.bind(this),
      onError: this.handleError.bind(this)
    };
  }
}