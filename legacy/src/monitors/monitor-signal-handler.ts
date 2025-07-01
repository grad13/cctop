/**
 * Monitor Signal Handler
 * Handles process signals and graceful shutdown
 */

import type { MonitorComponents } from './monitor.types';

export class MonitorSignalHandler {
  private shutdownSignalReceived: boolean = false;
  private shutdownCallback: (signal: string) => Promise<void>;
  private reloadCallback: () => Promise<void>;
  private statusCallback: () => Promise<void>;

  constructor(
    shutdownCallback: (signal: string) => Promise<void>,
    reloadCallback: () => Promise<void>,
    statusCallback: () => Promise<void>
  ) {
    this.shutdownCallback = shutdownCallback;
    this.reloadCallback = reloadCallback;
    this.statusCallback = statusCallback;
  }

  /**
   * Setup signal handlers for graceful shutdown
   */
  setupSignalHandlers(): void {
    // Normal termination signals
    process.on('SIGTERM', () => this.handleShutdown('SIGTERM'));
    process.on('SIGINT', () => this.handleShutdown('SIGINT'));
    
    // Application-defined signals
    process.on('SIGUSR1', () => this.reloadCallback());
    process.on('SIGUSR2', () => this.statusCallback());

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error: Error) => {
      console.error('[Monitor] Uncaught exception:', error);
      await this.handleShutdown('UNCAUGHT_EXCEPTION');
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason: any, promise: Promise<any>) => {
      console.error('[Monitor] Unhandled rejection at:', promise, 'reason:', reason);
      await this.handleShutdown('UNHANDLED_REJECTION');
      process.exit(1);
    });
  }

  /**
   * Handle shutdown signal
   */
  private async handleShutdown(signal: string): Promise<void> {
    if (this.shutdownSignalReceived) {
      return; // Prevent multiple shutdown attempts
    }
    this.shutdownSignalReceived = true;
    
    await this.shutdownCallback(signal);
  }

  /**
   * Graceful shutdown process
   */
  async gracefulShutdown(
    signal: string,
    components: MonitorComponents,
    flushEvents: () => Promise<void>
  ): Promise<void> {
    const { fileMonitor, eventProcessor, databaseManager, processManager } = components;
    
    console.log(`[Monitor] Received ${signal}, shutting down gracefully...`);
    if (processManager) {
      await processManager.log('info', `Received ${signal}, shutting down gracefully...`);
    }
    
    try {
      // 1. Stop accepting new events
      if (fileMonitor) {
        await fileMonitor.close();
      }
      
      // 2. Flush pending events
      if (eventProcessor) {
        await flushEvents();
      }
      
      // 3. Close database connection
      if (databaseManager) {
        await databaseManager.close();
      }
      
      // 4. Remove PID file
      if (processManager) {
        await processManager.removePidFile();
        await processManager.log('info', 'Monitor shutdown completed');
      }
      
      console.log('[Monitor] Monitor shutdown completed');
      process.exit(0);
    } catch (error: any) {
      console.error('[Monitor] Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  /**
   * Check if shutdown was requested
   */
  isShutdownRequested(): boolean {
    return this.shutdownSignalReceived;
  }
}