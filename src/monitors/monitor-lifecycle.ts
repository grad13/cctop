/**
 * Monitor Lifecycle Manager
 * Handles start, stop, restart operations
 */

import type { MonitorComponents, MonitorLifecycle, MonitorProcessStatus } from './monitor.types';

const FileMonitor = require('./file-monitor');

export class MonitorLifecycleManager implements MonitorLifecycle {
  private _isRunning: boolean = false;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private components: MonitorComponents | null = null;

  /**
   * Start monitor
   */
  async start(components: MonitorComponents): Promise<void> {
    this.components = components;
    this._isRunning = true;
    
    // Start file monitoring
    components.fileMonitor.start();
    
    // Keep process alive
    this.startKeepAlive();
    
    await components.processManager.log('info', 
      `Monitor process started successfully (PID: ${process.pid})`);
  }

  /**
   * Stop monitor
   */
  async stop(): Promise<void> {
    if (!this._isRunning || !this.components) {
      return;
    }

    try {
      console.log('[Monitor] Stopping monitor process...');
      this._isRunning = false;

      // Stop keep alive
      this.stopKeepAlive();

      // Stop file monitor
      if (this.components.fileMonitor) {
        await this.components.fileMonitor.stop();
      }

      // Close database
      if (this.components.databaseManager) {
        await this.components.databaseManager.close();
      }

      if (this.components.processManager) {
        await this.components.processManager.log('info', 'Monitor process stopped gracefully');
      }

      console.log('[Monitor] Monitor process stopped');
    } catch (error: any) {
      console.error('[Monitor] Error during shutdown:', error);
      if (this.components?.processManager) {
        await this.components.processManager.log('error', 
          `Error during shutdown: ${error.message}`);
      }
    }
  }

  /**
   * Restart file monitor after error
   */
  async restart(): Promise<void> {
    if (!this.components || !this._isRunning) {
      return;
    }

    try {
      await this.components.processManager.log('info', 'Restarting file monitor...');
      
      if (this.components.fileMonitor) {
        await this.components.fileMonitor.stop();
      }
      
      // Wait a bit before restarting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      this.components.fileMonitor = new FileMonitor(this.components.config.monitoring);
      this.components.fileMonitor.start();
      
      await this.components.processManager.log('info', 'File monitor restarted successfully');
    } catch (error: any) {
      await this.components.processManager.log('error', 
        `Failed to restart file monitor: ${error.message}`);
    }
  }

  /**
   * Check if monitor is running
   */
  isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * Get monitor status
   */
  getStatus(): MonitorProcessStatus {
    return {
      isRunning: this._isRunning,
      pid: process.pid,
      fileMonitorStats: this.components?.fileMonitor ? 
        this.components.fileMonitor.getStats() : null,
      uptime: process.uptime()
    };
  }

  /**
   * Start keep alive mechanism
   */
  private startKeepAlive(): void {
    this.keepAliveInterval = setInterval(() => {
      if (!this._isRunning) {
        this.stopKeepAlive();
      }
    }, 1000);
  }

  /**
   * Stop keep alive mechanism
   */
  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }
}