/**
 * Monitor Process Initializer
 * Handles initialization of all monitor components
 */

import type { MonitorComponents, MonitorProcessConfig } from './monitor.types';

const DatabaseManagerLegacy = require('../database/database-manager');
const ConfigManagerLegacy = require('../config/config-manager');
const ProcessManagerLegacy = require('./process-manager');
const FileMonitor = require('./file-monitor');
const EventProcessor = require('./event-processor');

export class MonitorInitializer {
  /**
   * Initialize all monitor components
   */
  async initializeComponents(): Promise<MonitorComponents> {
    console.log('[Monitor] Starting background monitor process...');
    
    // Load configuration
    const configManager = new ConfigManagerLegacy();
    const config: MonitorProcessConfig = await configManager.initialize();
    
    // Initialize process manager for logging
    const processManager = new ProcessManagerLegacy(config);
    await processManager.log('info', 'Monitor process starting...');
    
    // Initialize database
    const databaseManager = await this.initializeDatabase(config, processManager);
    
    // Initialize event processor
    const eventProcessor = new EventProcessor(databaseManager, config);
    
    // Initialize file monitor
    await processManager.log('debug', `Config monitoring: ${JSON.stringify(config.monitoring)}`);
    const fileMonitor = new FileMonitor(config.monitoring);
    
    await processManager.log('info', `Monitor process initialized (PID: ${process.pid})`);
    
    return {
      fileMonitor,
      eventProcessor,
      databaseManager,
      processManager,
      config
    };
  }

  /**
   * Initialize database with WAL mode
   */
  private async initializeDatabase(config: MonitorProcessConfig, processManager: any): Promise<any> {
    const dbPath = config.database?.path;
    await processManager.log('info', `Database path from config: ${dbPath}`);
    
    const databaseManager = new DatabaseManagerLegacy(dbPath);
    await databaseManager.initialize();
    await databaseManager.enableWALMode();
    await processManager.log('info', 'Database initialized with WAL mode');
    
    return databaseManager;
  }

  /**
   * Reload configuration
   */
  async reloadConfig(processManager: any): Promise<MonitorProcessConfig> {
    console.log('[Monitor] Reloading configuration...');
    const configManager = new ConfigManagerLegacy();
    const config = await configManager.initialize();
    
    if (processManager) {
      await processManager.log('info', 'Configuration reloaded');
    }
    
    return config;
  }

  /**
   * Cleanup components
   */
  async cleanup(components: Partial<MonitorComponents>): Promise<void> {
    const { fileMonitor, databaseManager, processManager } = components;
    
    // Stop file monitor
    if (fileMonitor) {
      await fileMonitor.stop();
    }

    // Close database
    if (databaseManager) {
      await databaseManager.close();
    }

    if (processManager) {
      await processManager.log('info', 'Monitor components cleaned up');
    }
  }
}