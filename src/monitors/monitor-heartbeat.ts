/**
 * Monitor Heartbeat Manager
 * Handles periodic status reporting
 */

import type { MonitorComponents, HeartbeatConfig } from './monitor.types';
import type { FileMonitorStats } from '../types';

export class MonitorHeartbeat {
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private components: MonitorComponents;
  private config: HeartbeatConfig;

  constructor(components: MonitorComponents) {
    this.components = components;
    this.config = {
      interval: components.config?.monitor?.heartbeatInterval || 30000, // 30 seconds default
      onHeartbeat: this.performHeartbeat.bind(this)
    };
  }

  /**
   * Start heartbeat
   */
  start(): void {
    this.heartbeatInterval = setInterval(async () => {
      await this.config.onHeartbeat();
    }, this.config.interval);
  }

  /**
   * Stop heartbeat
   */
  stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Perform heartbeat action
   */
  private async performHeartbeat(): Promise<void> {
    const { fileMonitor, processManager } = this.components;
    
    if (!fileMonitor || !processManager) {
      return;
    }
    
    try {
      const stats: FileMonitorStats = fileMonitor.getStats();
      await processManager.log('info', 
        `Heartbeat: monitoring ${stats.watchedPaths.length} paths, ` +
        `${stats.ignored.length} ignore patterns`);
    } catch (error: any) {
      // Silently ignore heartbeat errors to avoid log spam
      console.error('[Monitor] Heartbeat error:', error.message);
    }
  }

  /**
   * Get heartbeat status
   */
  getStatus(): {
    isRunning: boolean;
    interval: number;
    lastHeartbeat?: Date;
  } {
    return {
      isRunning: this.heartbeatInterval !== null,
      interval: this.config.interval
    };
  }
}