/**
 * Monitor Process (FUNC-003 compliant)
 * Independent background process for file monitoring
 * Refactored to use modular components
 */

import type { MonitorComponents, MonitorProcessStatus } from './monitor.types';
import { MonitorInitializer } from './monitor-initializer';
import { MonitorEventHandler } from './monitor-event-handler';
import { MonitorSignalHandler } from './monitor-signal-handler';
import { MonitorHeartbeat } from './monitor-heartbeat';
import { MonitorLifecycleManager } from './monitor-lifecycle';

class MonitorProcess {
  private components: MonitorComponents | null = null;
  private initializer: MonitorInitializer;
  private eventHandler: MonitorEventHandler | null = null;
  private signalHandler: MonitorSignalHandler;
  private heartbeat: MonitorHeartbeat | null = null;
  private lifecycle: MonitorLifecycleManager;

  constructor() {
    this.initializer = new MonitorInitializer();
    this.lifecycle = new MonitorLifecycleManager();
    
    // Initialize signal handler with callbacks
    this.signalHandler = new MonitorSignalHandler(
      this.gracefulShutdown.bind(this),
      this.reloadConfig.bind(this),
      this.dumpStatus.bind(this)
    );
  }

  /**
   * Initialize and start monitor process
   */
  async start(): Promise<void> {
    try {
      // Initialize all components
      this.components = await this.initializer.initializeComponents();
      
      // Setup event handlers
      this.eventHandler = new MonitorEventHandler(
        this.components,
        this.restartFileMonitor.bind(this)
      );
      this.eventHandler.setupEventHandlers();
      
      // Setup signal handlers
      this.signalHandler.setupSignalHandlers();
      
      // Start heartbeat
      this.heartbeat = new MonitorHeartbeat(this.components);
      this.heartbeat.start();
      
      // Start monitor lifecycle
      await this.lifecycle.start(this.components);
      
    } catch (error: any) {
      console.error('[Monitor] Failed to start:', error);
      if (this.components?.processManager) {
        await this.components.processManager.log('error', `Failed to start: ${error.message}`);
      }
      process.exit(1);
    }
  }


  /**
   * Restart file monitor after error
   */
  private async restartFileMonitor(): Promise<void> {
    if (this.lifecycle.isRunning() && !this.signalHandler.isShutdownRequested()) {
      await this.lifecycle.restart();
      if (this.components && this.eventHandler) {
        this.eventHandler.setupEventHandlers();
      }
    }
  }

  /**
   * Stop monitor process
   */
  async stop(): Promise<void> {
    // Stop heartbeat
    if (this.heartbeat) {
      this.heartbeat.stop();
    }

    // Stop lifecycle
    await this.lifecycle.stop();
  }

  /**
   * Graceful shutdown handler
   */
  private async gracefulShutdown(signal: string): Promise<void> {
    if (!this.components || !this.eventHandler) {
      process.exit(0);
      return;
    }

    await this.signalHandler.gracefulShutdown(
      signal,
      this.components,
      () => this.eventHandler!.flushPendingEvents()
    );
  }

  /**
   * Reload configuration (SIGUSR1 handler)
   */
  private async reloadConfig(): Promise<void> {
    try {
      if (!this.components) {
        return;
      }
      
      const newConfig = await this.initializer.reloadConfig(this.components.processManager);
      this.components.config = newConfig;
      
      // Note: Would need to implement hot-reload in FileMonitor
      console.log('[Monitor] Configuration reloaded (restart required for some changes)');
    } catch (error: any) {
      console.error('[Monitor] Error reloading configuration:', error);
    }
  }

  /**
   * Dump status information (SIGUSR2 handler)
   */
  private async dumpStatus(): Promise<void> {
    try {
      const status = this.getStatus();
      console.log('[Monitor] Status dump:', JSON.stringify(status, null, 2));
      
      if (this.components?.processManager) {
        await this.components.processManager.log('info', `Status dump: ${JSON.stringify(status)}`);
      }
    } catch (error: any) {
      console.error('[Monitor] Error dumping status:', error);
    }
  }

  /**
   * Get monitor status
   */
  getStatus(): MonitorProcessStatus {
    return this.lifecycle.getStatus();
  }
}

// If this file is run directly, start the monitor process
if (require.main === module) {
  const monitor = new MonitorProcess();
  
  monitor.start().catch((error: Error) => {
    console.error('[Monitor] Failed to start monitor process:', error);
    process.exit(1);
  });
}

module.exports = MonitorProcess;