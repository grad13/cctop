/**
 * Configuration Loader
 */

import * as fs from 'fs';
import * as path from 'path';
import { CLIConfig, defaultCLIConfig, SharedConfig, defaultSharedConfig, DaemonConfig, defaultDaemonConfig, LocalSetupInitializer } from '@cctop/shared';
import { ViewConfig } from './ViewConfig';
import { ViewConfigManager } from './ViewConfigManager';


export interface MergedConfig {
  cli: CLIConfig;
  shared: SharedConfig;
  daemon: DaemonConfig;
  view: ViewConfig;
  configPath: string;
}

export class ConfigLoader {
  private initializer = new LocalSetupInitializer();
  private readonly CONFIG_DIR = '.cctop';
  
  /**
   * Load configuration with automatic initialization if needed
   */
  async loadConfiguration(targetDirectory?: string): Promise<MergedConfig> {
    const targetDir = targetDirectory || process.cwd();
    const configPath = path.join(targetDir, this.CONFIG_DIR);
    
    try {
      // Auto-initialize if not exists
      if (!this.initializer.isInitialized(targetDir)) {
        const result = await this.initializer.initialize({ targetDirectory: targetDir });
        if (result.created) {
          console.log(result.message);
        }
      }
      
      const sharedConfig = await this.loadSharedConfig(configPath);
      const daemonConfig = await this.loadDaemonConfig(configPath);
      const cliConfig = await this.loadCLIConfig(configPath);
      const viewConfig = await this.loadViewConfig(configPath);
      
      return {
        cli: cliConfig,
        shared: sharedConfig,
        daemon: daemonConfig,
        view: viewConfig,
        configPath
      };
    } catch (error) {
      // Fallback to defaults if config loading fails
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Failed to load configuration: ${errorMessage}. Using defaults.`);
      const viewConfigManager = new ViewConfigManager(configPath);
      return {
        cli: defaultCLIConfig,
        shared: defaultSharedConfig,
        daemon: defaultDaemonConfig,
        view: viewConfigManager.getViewConfig(),
        configPath
      };
    }
  }
  
  /**
   * Load shared configuration
   */
  private async loadSharedConfig(configPath: string): Promise<SharedConfig> {
    const configFile = path.join(configPath, 'config', 'shared-config.json');
    if (!fs.existsSync(configFile)) {
      return defaultSharedConfig;
    }
    
    const content = fs.readFileSync(configFile, 'utf8');
    return JSON.parse(content);
  }
  
  /**
   * Load daemon configuration
   */
  private async loadDaemonConfig(configPath: string): Promise<DaemonConfig> {
    const configFile = path.join(configPath, 'config', 'daemon-config.json');
    if (!fs.existsSync(configFile)) {
      return defaultDaemonConfig;
    }
    
    const content = fs.readFileSync(configFile, 'utf8');
    return JSON.parse(content);
  }
  
  /**
   * Load CLI configuration
   */
  private async loadCLIConfig(configPath: string): Promise<CLIConfig> {
    const configFile = path.join(configPath, 'config', 'cli-config.json');
    if (!fs.existsSync(configFile)) {
      return defaultCLIConfig;
    }
    
    const content = fs.readFileSync(configFile, 'utf8');
    const config = JSON.parse(content);
    
    // Deep merge with defaults to ensure all required fields
    return this.deepMerge(defaultCLIConfig, config);
  }
  
  /**
   * Load view configuration
   */
  private async loadViewConfig(configPath: string): Promise<ViewConfig> {
    const viewConfigManager = new ViewConfigManager(configPath);
    return await viewConfigManager.loadViewConfig();
  }
  
  /**
   * Ensure required directories exist
   */
  async ensureDirectories(configPath: string): Promise<void> {
    const directories = [
      'data',
      'logs', 
      'runtime',
      'temp'
    ];
    
    for (const dir of directories) {
      const fullPath = path.join(configPath, dir);
      if (!fs.existsSync(fullPath)) {
        try {
          fs.mkdirSync(fullPath, { recursive: true, mode: 0o755 });
        } catch (error) {
          // For permission errors, warn but don't fail
          if (error instanceof Error && 'code' in error && error.code === 'EACCES') {
            console.warn(`Warning: Cannot create directory ${fullPath}: Permission denied`);
          } else {
            throw error;
          }
        }
      }
    }
  }
  
  /**
   * Manual initialization command
   */
  async initializeManually(options: { 
    targetDirectory?: string; 
    dryRun?: boolean; 
    force?: boolean; 
  } = {}) {
    return await this.initializer.initialize(options);
  }
  
  /**
   * Check if configuration is initialized
   */
  isInitialized(targetDirectory?: string): boolean {
    return this.initializer.isInitialized(targetDirectory);
  }
  


  /**
   * Deep merge two objects, preserving nested structures
   */
  private deepMerge<T>(target: T, source: Partial<T>): T {
    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const sourceValue = source[key];
        if (sourceValue !== null && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
          // Recursively merge objects
          result[key] = this.deepMerge(result[key] as any, sourceValue as any);
        } else {
          // For primitives, arrays, and null values, replace directly
          result[key] = sourceValue as any;
        }
      }
    }
    
    return result;
  }
}