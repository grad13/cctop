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
  private basePath: string;

  constructor(basePath?: string) {
    this.basePath = basePath || process.cwd();
    this.config = this.getDefaultConfig();
  }

  private getDefaultConfig(): DaemonConfig {
    return {
      version: '0.3.0.0',
      monitoring: {
        watchPaths: ['.'],
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
      const configPath = path.join(this.basePath, '.cctop/config/shared-config.json');
      const configContent = await fs.readFile(configPath, 'utf8');
      return JSON.parse(configContent);
    } catch (error) {
      console.warn('Shared config not found, using defaults');
      return {};
    }
  }

  private async loadDaemonConfig(): Promise<Partial<DaemonConfig>> {
    try {
      const configPath = path.join(this.basePath, '.cctop/config/daemon-config.json');
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
      path.join(this.basePath, '.cctop/config'),
      path.join(this.basePath, '.cctop/themes'),
      path.join(this.basePath, '.cctop/data'),
      path.join(this.basePath, '.cctop/logs'),
      path.join(this.basePath, '.cctop/runtime'),
      path.join(this.basePath, '.cctop/temp'),
      path.join(this.basePath, path.dirname(this.config.database.path!)),
      path.join(this.basePath, path.dirname(this.config.daemon.pidFile)),
      path.join(this.basePath, path.dirname(this.config.daemon.logFile))
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }
    }

    // Initialize default config files if they don't exist
    await this.initializeDefaultConfigs();
  }

  private async initializeDefaultConfigs(): Promise<void> {
    // Check if config directory exists and has no config files
    const configDir = path.join(this.basePath, '.cctop/config');
    const sharedConfigPath = path.join(configDir, 'shared-config.json');
    const daemonConfigPath = path.join(configDir, 'daemon-config.json');

    // Create shared-config.json if not exists
    try {
      await fs.access(sharedConfigPath);
    } catch {
      const sharedConfig = {
        version: '0.3.0.0',
        project: {
          name: 'cctop',
          description: 'Real-time file monitoring and code structure analysis tool'
        },
        database: {
          path: '.cctop/data/activity.db',
          maxSize: 104857600
        },
        directories: {
          config: '.cctop/config',
          logs: '.cctop/logs',
          temp: '.cctop/temp',
          runtime: '.cctop/runtime',
          data: '.cctop/data',
          themes: '.cctop/themes'
        },
        logging: {
          maxFileSize: 10485760,
          maxFiles: 5,
          datePattern: 'YYYY-MM-DD',
          level: 'info'
        }
      };
      await fs.writeFile(sharedConfigPath, JSON.stringify(sharedConfig, null, 2));
      console.log('Created shared-config.json with default settings');
    }

    // Create daemon-config.json if not exists
    try {
      await fs.access(daemonConfigPath);
    } catch {
      const daemonConfig = {
        monitoring: {
          watchPaths: ['.'],
          excludePatterns: [
            '**/node_modules/**',
            '**/.git/**',
            '**/.*',
            '**/.cctop/**',
            '**/dist/**',
            '**/coverage/**',
            '**/build/**',
            '**/*.log',
            '**/.DS_Store'
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
        daemon: {
          pidFile: '.cctop/runtime/daemon.pid',
          logFile: '.cctop/logs/daemon.log',
          logLevel: 'info',
          heartbeatInterval: 30000,
          autoStart: true,
          maxRestarts: 3,
          restartDelay: 5000
        },
        database: {
          writeMode: 'WAL',
          syncMode: 'NORMAL',
          cacheSize: 65536,
          busyTimeout: 5000,
          checkpointInterval: 300000
        }
      };
      await fs.writeFile(daemonConfigPath, JSON.stringify(daemonConfig, null, 2));
      console.log('Created daemon-config.json with default settings');
    }

    // Create .gitignore if not exists
    const gitignorePath = path.join(this.basePath, '.cctop/.gitignore');
    try {
      await fs.access(gitignorePath);
    } catch {
      const gitignoreContent = `# cctop monitoring data
data/
logs/
runtime/
temp/

# User customizations
themes/custom/
`;
      await fs.writeFile(gitignorePath, gitignoreContent);
      console.log('Created .cctop/.gitignore');
    }
  }
}