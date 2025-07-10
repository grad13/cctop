/**
 * UI Configuration and Initialization Manager
 * Handles configuration loading, daemon monitoring, and initialization
 */

import * as path from 'path';
import { DatabaseAdapterFunc000 } from '../database/database-adapter-func000';
import { CLIConfig } from '../config/cli-config';
import { ConfigLoader } from '../config/config-loader';
import { LocalSetupInitializer } from '../config/local-setup-initializer';
import { DaemonStatusMonitor } from '../utils/daemon-status-monitor';
import { UIState } from './UIState';

export interface UIFramelessConfigSimple {
  refreshInterval?: number;
  maxRows?: number;
  displayMode?: 'all' | 'unique';
  config?: CLIConfig;
}

export class UIConfigManager {
  private db: DatabaseAdapterFunc000;
  private uiState: UIState;
  private daemonStatusMonitor: DaemonStatusMonitor;
  private cliConfig!: CLIConfig;

  constructor(db: DatabaseAdapterFunc000, uiState: UIState) {
    this.db = db;
    this.uiState = uiState;
    this.daemonStatusMonitor = new DaemonStatusMonitor();
  }

  async initializeConfig(config: UIFramelessConfigSimple): Promise<CLIConfig> {
    if (config.config) {
      this.cliConfig = config.config;
    } else {
      // Check if local configuration exists, if not create it
      const initializer = new LocalSetupInitializer();
      if (!initializer.isInitialized()) {
        const result = await initializer.initialize();
      }
      
      const configLoader = new ConfigLoader();
      const mergedConfig = await configLoader.loadConfiguration();
      this.cliConfig = mergedConfig.cli;
    }
    
    return this.cliConfig;
  }

  initializeDaemonMonitor(): void {
    // Set up daemon monitor to use the same .cctop directory as the database
    // We'll update this after we have access to the actual database path
    const dbPath = (this.db as any).dbPath;
    
    if (dbPath) {
      // Extract .cctop directory from database path
      // e.g., "/path/to/.cctop/data/activity.db" -> "/path/to/.cctop"
      const cctopDir = path.dirname(path.dirname(dbPath));
      this.daemonStatusMonitor = new DaemonStatusMonitor(cctopDir);
    }
  }

  async updateDaemonStatus(): Promise<void> {
    try {
      const status = await this.daemonStatusMonitor.checkStatus();
      
      switch (status.status) {
        case 'running':
          this.uiState.setDaemonStatus(`{green-fg}Daemon: ●RUNNING{/green-fg} (PID: ${status.pid})`);
          break;
        case 'stopped':
          this.uiState.setDaemonStatus('{red-fg}Daemon: ●STOPPED{/red-fg}');
          break;
        case 'unknown':
        default:
          this.uiState.setDaemonStatus('{yellow-fg}Daemon: ●UNKNOWN{/yellow-fg}');
          break;
      }
    } catch (error) {
      this.uiState.setDaemonStatus('{red-fg}Daemon: ●ERROR{/red-fg}');
    }
  }

  getCLIConfig(): CLIConfig {
    return this.cliConfig;
  }
}