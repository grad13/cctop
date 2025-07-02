/**
 * Daemon Configuration Management - FUNC-101/106 Compliant
 * 3-Layer Configuration Architecture Implementation
 */

import { DaemonConfig } from '../../../shared/dist/types';
import * as path from 'path';
import * as fs from 'fs/promises';

interface SharedConfig {
  version: string;
  project: {
    name: string;
    description: string;
  };
  database: {
    path: string;
    maxSize: number;
  };
  directories: {
    config: string;
    logs: string;
    temp: string;
  };
  logging: {
    maxFileSize: number;
    maxFiles: number;
    datePattern: string;
  };
}

export class DaemonConfigManager {
  private config: DaemonConfig;

  constructor() {
    this.config = this.getDefaultConfig();
  }

  private getDefaultConfig(): DaemonConfig {
    return {
      version: '0.3.0.0',
      monitoring: {
        watchPaths: ['./test-data'],
        excludePatterns: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.*',
          '**/.cctop/**',
          '**/dist/**',
          '**/coverage/**'
        ],
        debounceMs: 100,
        maxDepth: 10,
        moveThresholdMs: 100,
        systemLimits: {
          requiredLimit: 524288,
          checkOnStartup: true,
          warnIfInsufficient: true
        }
      },
      database: {
        path: '.cctop/data/activity.db',
        writeMode: 'WAL',
        syncMode: 'NORMAL',
        cacheSize: 65536,
        busyTimeout: 5000
      },
      daemon: {
        pidFile: '.cctop/runtime/daemon.pid',
        logFile: '.cctop/logs/daemon.log',
        logLevel: 'info',
        heartbeatInterval: 30000,
        autoStart: true
      }
    };
  }

  async loadConfig(): Promise<void> {
    // FUNC-101/106: 3-Layer Configuration Loading
    // 1. Load shared config (FUNC-101)
    const sharedConfig = await this.loadSharedConfig();
    
    // 2. Load daemon-specific config (FUNC-106)
    const daemonConfig = await this.loadDaemonConfig();
    
    // 3. Merge configurations (shared settings take precedence for database path)
    this.config = this.mergeConfigs(this.getDefaultConfig(), sharedConfig, daemonConfig);
  }

  private async loadSharedConfig(): Promise<Partial<SharedConfig>> {
    try {
      const configPath = '.cctop/config/shared-config.json';
      const configContent = await fs.readFile(configPath, 'utf8');
      return JSON.parse(configContent);
    } catch (error) {
      console.warn('Shared config not found, using defaults');
      return {};
    }
  }

  private async loadDaemonConfig(): Promise<Partial<DaemonConfig>> {
    try {
      const configPath = '.cctop/config/daemon-config.json';
      const configContent = await fs.readFile(configPath, 'utf8');
      const daemonConfig = JSON.parse(configContent);
      
      if (this.validateConfig(daemonConfig)) {
        return daemonConfig;
      }
    } catch (error) {
      console.warn('Daemon config not found, using defaults');
    }
    return {};
  }

  private mergeConfigs(defaultConfig: DaemonConfig, sharedConfig: Partial<SharedConfig>, daemonConfig: Partial<DaemonConfig>): DaemonConfig {
    const merged = { ...defaultConfig };
    
    // Apply shared config (database path from shared-config.json)
    if (sharedConfig.database?.path) {
      merged.database.path = sharedConfig.database.path;
    }
    
    // Apply daemon-specific config
    if (daemonConfig.monitoring) {
      merged.monitoring = { ...merged.monitoring, ...daemonConfig.monitoring };
    }
    if (daemonConfig.daemon) {
      merged.daemon = { ...merged.daemon, ...daemonConfig.daemon };
    }
    if (daemonConfig.database) {
      merged.database = { ...merged.database, ...daemonConfig.database };
      // Restore shared database path if it exists
      if (sharedConfig.database?.path) {
        merged.database.path = sharedConfig.database.path;
      }
    }
    
    return merged;
  }

  private validateConfig(config: any): boolean {
    return (
      config &&
      typeof config === 'object' &&
      (!config.monitoring || (
        typeof config.monitoring === 'object' &&
        (!config.monitoring.watchPaths || Array.isArray(config.monitoring.watchPaths)) &&
        (!config.monitoring.excludePatterns || Array.isArray(config.monitoring.excludePatterns))
      ))
    );
  }

  getConfig(): DaemonConfig {
    return this.config;
  }

  async ensureDirectories(): Promise<void> {
    const directories = [
      path.dirname(this.config.database.path!),
      path.dirname(this.config.daemon.pidFile),
      path.dirname(this.config.daemon.logFile)
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }
    }
  }
}