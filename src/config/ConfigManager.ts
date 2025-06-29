/**
 * Configuration Manager (Refactored)
 * Main facade maintaining backward compatibility
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  FullConfig,
  ConfigManagerOptions,
  CLIArgs,
  InotifyConfig,
  ConfigError,
  ConfigErrorType
} from './types/ConfigTypes';
import { ConfigLoader } from './loaders/ConfigLoader';
import { ConfigValidator } from './validators/ConfigValidator';
import { ConfigMerger } from './mergers/ConfigMerger';
import { ErrorHandler } from './handlers/ErrorHandler';
import { DirectoryHandler } from './handlers/DirectoryHandler';
import { ConfigSaver } from './savers/ConfigSaver';

const CLIInterfaceClass = require('../interfaces/cli-interface');

export class ConfigManager {
  private config: FullConfig | null = null;
  private configPath: string | null = null;
  private interactive: boolean;
  private cliInterface: any;
  
  private configLoader: ConfigLoader | null = null;
  private configValidator: ConfigValidator;
  private configMerger: ConfigMerger;
  private errorHandler: ErrorHandler;
  private directoryHandler: DirectoryHandler;
  private configSaver: ConfigSaver;

  constructor({ 
    interactive = true, 
    cliInterface = null, 
    promptHandler = null 
  }: ConfigManagerOptions = {}) {
    this.interactive = interactive;
    this.cliInterface = cliInterface || new CLIInterfaceClass();
    
    this.configValidator = new ConfigValidator();
    this.configMerger = new ConfigMerger();
    this.errorHandler = new ErrorHandler(interactive);
    this.directoryHandler = new DirectoryHandler(
      this.cliInterface,
      interactive,
      promptHandler
    );
    this.configSaver = new ConfigSaver();
  }

  /**
   * Initialize configuration (backward compatible API)
   */
  async initialize(cliArgs: CLIArgs = {}): Promise<FullConfig> {
    try {
      // 1. Determine config file path
      this.configPath = this.determineConfigPath(cliArgs);
      this.configLoader = new ConfigLoader(this.configPath);
      
      // 2. Check if config exists, create if needed
      if (!await this.configLoader.exists()) {
        await this.configLoader.createDefaultConfig();
      }
      
      // 3. Load configuration
      const userConfig = await this.configLoader.loadConfig();
      
      // 4. Merge with defaults
      let config = this.configMerger.mergeWithDefaults(userConfig);
      
      // 5. Apply CLI overrides
      config = this.configMerger.applyCLIOverrides(config, cliArgs);
      
      // 6. Apply environment overrides
      config = this.configMerger.applyEnvironmentOverrides(config);
      
      // 7. Validate configuration
      const validation = this.configValidator.validateConfig(config);
      if (!validation.valid) {
        this.handleValidationErrors(validation.errors);
      }
      
      // 8. Apply warnings
      if (validation.warnings.length > 0 && (this.interactive || process.env.CCTOP_VERBOSE)) {
        validation.warnings.forEach(warning => {
          console.warn(`Warning: ${warning}`);
        });
      }
      
      this.config = validation.normalizedConfig || config;
      
      // 9. Check and add current directory
      await this.checkAndAddCurrentDirectory(cliArgs);
      
      return this.config;
      
    } catch (error) {
      console.error('Configuration initialization failed:', error);
      throw error;
    }
  }

  /**
   * Determine configuration file path
   */
  private determineConfigPath(cliArgs: CLIArgs): string {
    if (cliArgs.config) {
      return path.resolve(cliArgs.config);
    }
    
    return path.join(process.cwd(), '.cctop', 'config.json');
  }

  /**
   * Handle validation errors
   */
  private handleValidationErrors(errors: string[]): void {
    this.errorHandler.handleValidationErrors(errors);
  }

  /**
   * Check and add current directory to watch paths
   */
  private async checkAndAddCurrentDirectory(cliArgs: CLIArgs = {}): Promise<void> {
    if (!this.config) return;
    
    await this.directoryHandler.checkAndAddCurrentDirectory(
      this.config,
      cliArgs,
      () => this.save()
    );
  }

  /**
   * Get configuration value (backward compatible API)
   */
  get(keyPath: string, defaultValue: any = null): any {
    if (!this.config) {
      throw new Error('Configuration not initialized');
    }

    const keys = keyPath.split('.');
    let current: any = this.config;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }

    return current;
  }

  /**
   * Get all configuration (backward compatible API)
   */
  getAll(): FullConfig {
    if (!this.config) {
      throw new Error('Configuration not initialized');
    }
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Get config (alias for getAll)
   */
  getConfig(): FullConfig {
    return this.getAll();
  }

  /**
   * Save configuration (backward compatible API)
   */
  async save(): Promise<void> {
    try {
      if (!this.config) {
        throw new Error('No configuration to save');
      }

      const savePath = this.configPath || path.join(process.cwd(), '.cctop', 'config.json');
      
      await this.configSaver.saveConfig(this.config, savePath);
      this.errorHandler.logSuccess(`Configuration saved to: ${savePath}`);
      
    } catch (error: any) {
      this.errorHandler.handleFileSystemError(error, 'save configuration');
      throw error;
    }
  }

  /**
   * Get inotify configuration (backward compatible API)
   */
  getInotifyConfig(): InotifyConfig {
    const defaultConfig: InotifyConfig = {
      requiredMaxUserWatches: 524288,
      checkOnStartup: true,
      warnIfInsufficient: true,
      recommendedValue: 524288
    };
    
    const inotifyConfig = this.get('monitoring.inotify', {});
    
    return {
      ...defaultConfig,
      ...inotifyConfig
    };
  }

  /**
   * Wait for user confirmation (backward compatible API)
   */
  async waitForUserConfirmation(): Promise<boolean> {
    return this.cliInterface.waitForUserConfirmation();
  }

  /**
   * Validate configuration (internal backward compatible)
   */
  private validate(): boolean {
    if (!this.config) {
      throw new Error('Configuration not initialized');
    }

    const validation = this.configValidator.validateConfig(this.config);
    if (!validation.valid) {
      this.handleValidationErrors(validation.errors);
    }

    return true;
  }

  /**
   * Load config file (internal backward compatible)
   */
  private loadConfigFile(configPath: string): FullConfig | null {
    try {
      // Synchronous loading for backward compatibility
      const content = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(content) as FullConfig;
      
      // Force local database path
      if (config.database && config.database.path) {
        config.database.path = path.join(process.cwd(), '.cctop', 'activity.db');
      }
      
      return config;
    } catch (error: any) {
      this.handleLoadError(error, configPath);
      return null;
    }
  }

  /**
   * Handle config load errors
   */
  private handleLoadError(error: any, configPath: string): void {
    if (error.code === 'ENOENT') {
      this.errorHandler.logInfo(`File not found: ${configPath}`);
    } else if (error instanceof SyntaxError) {
      this.errorHandler.logWarning(`JSON syntax error: ${configPath}`);
      this.errorHandler.logWarning(`Details: ${error.message}`);
      this.errorHandler.logInfo('Fix: Please correct to valid JSON format');
    } else {
      this.errorHandler.logWarning(`Configuration file load error: ${error.message}`);
    }
  }

  /**
   * Factory methods (backward compatible API)
   */
  static createForTesting(options: ConfigManagerOptions = {}): ConfigManager {
    return new ConfigManager({
      interactive: false,
      ...options
    });
  }

  static createForProduction(options: ConfigManagerOptions = {}): ConfigManager {
    return new ConfigManager({
      interactive: true,
      ...options
    });
  }
}