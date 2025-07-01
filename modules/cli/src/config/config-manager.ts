/**
 * CLI Configuration Manager (FUNC-107)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { CLIConfig, SharedConfig } from '@cctop/shared';

export class ConfigManager {
  private static instance: ConfigManager;
  private cliConfig: CLIConfig | null = null;
  private sharedConfig: SharedConfig | null = null;
  private configDir: string;

  private constructor(configDir: string) {
    this.configDir = configDir;
  }

  static getInstance(configDir: string = '.cctop/config'): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager(configDir);
    }
    return ConfigManager.instance;
  }

  async loadConfigs(): Promise<void> {
    await this.loadSharedConfig();
    await this.loadCLIConfig();
  }

  private async loadSharedConfig(): Promise<void> {
    const configPath = path.join(this.configDir, 'shared-config.json');
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      this.sharedConfig = JSON.parse(content);
    } catch (error) {
      // Use default configuration if file doesn't exist
      this.sharedConfig = this.getDefaultSharedConfig();
    }
  }

  private async loadCLIConfig(): Promise<void> {
    const configPath = path.join(this.configDir, 'cli-config.json');
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      this.cliConfig = JSON.parse(content);
    } catch (error) {
      // Use default configuration if file doesn't exist
      this.cliConfig = this.getDefaultCLIConfig();
    }
  }

  getCLIConfig(): CLIConfig {
    if (!this.cliConfig) {
      throw new Error('CLI configuration not loaded');
    }
    return this.cliConfig;
  }

  getSharedConfig(): SharedConfig {
    if (!this.sharedConfig) {
      throw new Error('Shared configuration not loaded');
    }
    return this.sharedConfig;
  }

  private getDefaultSharedConfig(): SharedConfig {
    return {
      version: '0.3.0',
      project: {
        name: 'cctop',
        rootPath: process.cwd(),
        excludePaths: ['node_modules', '.git', '.cctop']
      },
      database: {
        path: '.cctop/data/activity.db',
        walMode: true,
        busyTimeout: 5000
      },
      directories: {
        config: '.cctop/config',
        themes: '.cctop/themes',
        data: '.cctop/data',
        logs: '.cctop/logs',
        runtime: '.cctop/runtime',
        temp: '.cctop/temp'
      },
      logging: {
        level: 'info',
        maxFiles: 5,
        maxSize: '10MB'
      }
    };
  }

  private getDefaultCLIConfig(): CLIConfig {
    return {
      version: '0.3.0',
      display: {
        maxEvents: 20,
        refreshRateMs: 100,
        dateFormat: 'YYYY-MM-DD HH:mm:ss',
        columns: {
          timestamp: { width: 19, visible: true },
          elapsed: { width: 9, visible: true },
          fileName: { width: 35, visible: true },
          event: { width: 8, visible: true },
          lines: { width: 6, visible: true },
          blocks: { width: 8, visible: true },
          directory: { width: 'auto', visible: true }
        }
      },
      colors: {
        find: 'cyan',
        create: 'green',
        modify: 'yellow',
        move: 'blue',
        delete: 'red',
        restore: 'magenta',
        error: 'red',
        warning: 'yellow',
        info: 'white'
      },
      statusArea: {
        maxLines: 3,
        enabled: true,
        scrollSpeed: 200,
        updateInterval: 5000
      },
      interactive: {
        keyRepeatDelay: 500,
        keyRepeatInterval: 100,
        selectionHighlight: 'inverse',
        detailViewPosition: 'bottom'
      },
      locale: {
        language: 'en',
        timezone: 'system'
      }
    };
  }

  async saveConfig(type: 'cli' | 'shared'): Promise<void> {
    const config = type === 'cli' ? this.cliConfig : this.sharedConfig;
    const filename = type === 'cli' ? 'cli-config.json' : 'shared-config.json';
    
    if (!config) {
      throw new Error(`${type} configuration not loaded`);
    }

    const configPath = path.join(this.configDir, filename);
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  }

  updateCLIConfig(updates: Partial<CLIConfig>): void {
    if (!this.cliConfig) {
      throw new Error('CLI configuration not loaded');
    }
    
    this.cliConfig = {
      ...this.cliConfig,
      ...updates,
      display: {
        ...this.cliConfig.display,
        ...updates.display
      },
      colors: {
        ...this.cliConfig.colors,
        ...updates.colors
      },
      statusArea: {
        ...this.cliConfig.statusArea,
        ...updates.statusArea
      },
      interactive: {
        ...this.cliConfig.interactive,
        ...updates.interactive
      },
      locale: {
        ...this.cliConfig.locale,
        ...updates.locale
      }
    };
  }
}