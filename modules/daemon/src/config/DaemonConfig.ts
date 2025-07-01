/**
 * Daemon Configuration Management
 */

import { DaemonConfig } from '@cctop/shared';
import * as path from 'path';
import * as fs from 'fs/promises';

export class DaemonConfigManager {
  private config: DaemonConfig;

  constructor() {
    this.config = this.getDefaultConfig();
  }

  private getDefaultConfig(): DaemonConfig {
    return {
      version: '0.3.0.0',
      monitoring: {
        watchPaths: [process.cwd()],
        excludePatterns: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.*',
          '**/.cctop/**'
        ],
        moveThresholdMs: 100,
        maxDepth: 15,
        ignoreInitial: false,
        includeStats: true
      },
      database: {
        path: '.cctop/data/activity.db',
        maxEvents: 50000,
        connectionTimeout: 30000
      },
      daemon: {
        pidFile: '.cctop/daemon.pid', 
        logFile: '.cctop/logs/daemon.log',
        heartbeatIntervalMs: 5000
      }
    };
  }

  async loadConfig(configPath?: string): Promise<void> {
    const targetPath = configPath || '.cctop/daemon-config.json';
    
    try {
      const configContent = await fs.readFile(targetPath, 'utf8');
      const userConfig = JSON.parse(configContent);
      
      if (this.validateConfig(userConfig)) {
        this.config = { ...this.config, ...userConfig };
      }
    } catch (error) {
      // Use default config if file doesn't exist or is invalid
    }
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