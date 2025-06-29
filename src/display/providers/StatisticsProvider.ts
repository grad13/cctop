/**
 * Statistics Provider
 * Generates and updates database statistics messages
 */

import type { 
  StatusDisplayConfig,
  DatabaseStats,
  EventStats,
  DatabaseManager
} from '../types/MessageTypes';
import { MessageManager } from '../managers/MessageManager';

export class StatisticsProvider {
  private databaseManager: DatabaseManager | null;
  private updateInterval: number;
  private statisticsTimer: NodeJS.Timeout | null = null;
  private messageManager: MessageManager | null = null;

  constructor(
    databaseManager: DatabaseManager | null,
    config: StatusDisplayConfig = {}
  ) {
    this.databaseManager = databaseManager;
    this.updateInterval = config.updateInterval || 5000;
  }

  /**
   * Set message manager reference
   */
  setMessageManager(messageManager: MessageManager): void {
    this.messageManager = messageManager;
  }

  /**
   * Start periodic statistics updates
   */
  startPeriodicUpdates(): void {
    if (this.statisticsTimer) {
      return; // Already running
    }

    // Initial update
    this.updateStatistics();

    // Start periodic updates
    this.statisticsTimer = setInterval(() => {
      this.updateStatistics();
    }, this.updateInterval);
  }

  /**
   * Stop periodic statistics updates
   */
  stopPeriodicUpdates(): void {
    if (this.statisticsTimer) {
      clearInterval(this.statisticsTimer);
      this.statisticsTimer = null;
    }
  }

  /**
   * Generate statistics from database
   */
  async generateStatistics(): Promise<void> {
    if (!this.databaseManager || !this.databaseManager.isConnected()) {
      return;
    }
    
    if (!this.messageManager) {
      return;
    }

    try {
      // 10 minute statistics
      const tenMinStatsQuery = `
        SELECT 
          et.code as event_type,
          COUNT(*) as count,
          COUNT(DISTINCT e.file_id) as unique_files
        FROM events e
        JOIN event_types et ON e.event_type_id = et.id
        WHERE e.timestamp > ?
        GROUP BY et.code
      `;
      
      const tenMinStats: EventStats[] = await this.databaseManager.all(
        tenMinStatsQuery, 
        [Date.now() - 10 * 60 * 1000]
      );

      if (tenMinStats.length > 0) {
        const totalEvents = tenMinStats.reduce((sum, stat) => sum + stat.count, 0);
        const totalFiles = new Set(tenMinStats.map(stat => stat.unique_files)).size;
        
        // Format breakdown
        const breakdown = tenMinStats
          .map(stat => `${stat.count} ${stat.event_type}`)
          .join(', ');
        
        const message = `Last 10min: ${totalEvents} changes (${breakdown}) in ${totalFiles} files`;
        this.messageManager.updateMessage('Last 10min:', message, 'stats');
      }

      // Database size statistics
      const dbStatsQuery = `
        SELECT 
          COUNT(*) as total_events,
          (SELECT COUNT(*) FROM files WHERE is_active = TRUE) as active_files
        FROM events
      `;
      
      const dbStats: DatabaseStats | null = await this.databaseManager.get(dbStatsQuery);

      if (dbStats) {
        const message = `Database: ${dbStats.total_events} events, ${dbStats.active_files} active files`;
        this.messageManager.updateMessage('Database:', message, 'stats');
      }

    } catch (error: any) {
      // Enhanced error message with query context
      const errorContext = error.message.includes('event_type') ? '[10min stats query]' : 
                           error.message.includes('is_active') ? '[db stats query]' : '[unknown query]';
      
      if (this.messageManager) {
        this.messageManager.addMessage(`Statistics error ${errorContext}: ${error.message}`, 'error');
      }
    }
  }

  /**
   * Update statistics (called periodically)
   */
  private async updateStatistics(): Promise<void> {
    await this.generateStatistics();
  }

  /**
   * Generate statistics message string (for backward compatibility)
   */
  async generateStatisticsMessage(): Promise<string | null> {
    if (!this.databaseManager || !this.databaseManager.isConnected()) {
      return null;
    }

    try {
      const stats = await this.databaseManager.getStats();
      if (!stats) {
        return null;
      }

      const message = `Database: ${stats.totalEvents} events, ${stats.activeFiles} active files`;
      return message;
    } catch (error) {
      console.error('[StatisticsProvider] Failed to generate statistics:', error);
      return null;
    }
  }

  /**
   * Check if provider is active
   */
  isActive(): boolean {
    return this.statisticsTimer !== null;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopPeriodicUpdates();
  }

  /**
   * Get provider status for debugging
   */
  getProviderStatus(): object {
    return {
      active: this.isActive(),
      updateInterval: this.updateInterval,
      databaseConnected: this.databaseManager?.isConnected() || false,
      hasMessageManager: this.messageManager !== null
    };
  }
}