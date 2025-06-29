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

const CLIInterfaceClass = require('../interfaces/cli-interface');

export class ConfigManager {
  private config: FullConfig | null = null;
  private configPath: string | null = null;
  private interactive: boolean;
  private cliInterface: any;
  private promptHandler: (dirPath: string) => Promise<boolean>;
  
  private configLoader: ConfigLoader | null = null;
  private configValidator: ConfigValidator;
  private configMerger: ConfigMerger;

  constructor({ 
    interactive = true, 
    cliInterface = null, 
    promptHandler = null 
  }: ConfigManagerOptions = {}) {
    this.interactive = interactive;
    this.cliInterface = cliInterface || new CLIInterfaceClass();
    this.promptHandler = promptHandler || this.defaultPromptHandler.bind(this);
    
    this.configValidator = new ConfigValidator();
    this.configMerger = new ConfigMerger();
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
    const errorMsg = `Configuration validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`;
    
    if (this.interactive) {
      console.error(`\nError: ${errorMsg}`);
      console.error('\nPlease check ./.cctop/config.json and fix the issues.\n');
      process.exit(1);
    } else {
      if (process.env.CCTOP_VERBOSE) {
        console.error(`Error: ${errorMsg}`);
      }
      throw new ConfigError(
        ConfigErrorType.VALIDATION_FAILED,
        `Validation failed: ${errors.join(', ')}`
      );
    }
  }

  /**
   * Default prompt handler
   */
  private async defaultPromptHandler(dirPath: string): Promise<boolean> {
    if (!this.interactive) {
      return false;
    }
    
    return this.cliInterface.promptAddDirectory(dirPath, 30000);
  }

  /**
   * Check and add current directory to watch paths
   */
  private async checkAndAddCurrentDirectory(cliArgs: CLIArgs = {}): Promise<void> {
    if (!this.config) return;

    const targetDir = Array.isArray(cliArgs.watchPath) 
      ? cliArgs.watchPath[0] 
      : (cliArgs.watchPath || process.cwd());
    const absoluteTargetDir = path.resolve(targetDir);
    
    // Ensure monitoring config exists
    if (!this.config.monitoring) {
      this.config.monitoring = {} as any;
    }
    if (!Array.isArray(this.config.monitoring.watchPaths)) {
      this.config.monitoring.watchPaths = [];
    }
    
    // Normalize paths to absolute
    this.config.monitoring.watchPaths = this.config.monitoring.watchPaths.map(
      watchPath => path.resolve(watchPath)
    );
    
    const isAlreadyWatched = this.config.monitoring.watchPaths.includes(absoluteTargetDir);
    
    if (!isAlreadyWatched) {
      const shouldAdd = await this.promptHandler(absoluteTargetDir);
      if (shouldAdd) {
        this.config.monitoring.watchPaths.push(absoluteTargetDir);
        await this.save();
        this.cliInterface.success(`Added to monitor: ${absoluteTargetDir}`);
      } else {
        this.cliInterface.info('Monitoring with current config only');
      }
    }
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
      const configDir = path.dirname(savePath);
      
      // Ensure directory exists
      await fs.promises.mkdir(configDir, { recursive: true });
      
      // Save config
      const content = JSON.stringify(this.config, null, 2);
      await fs.promises.writeFile(savePath, content, 'utf8');
      
      console.log(`💾 Configuration saved to: ${savePath}`);
      
    } catch (error: any) {
      console.error('Failed to save configuration:', error);
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
    // This method is called by old code, redirect to new implementation
    const loader = new ConfigLoader(configPath);
    
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
      if (error.code === 'ENOENT') {
        if (this.interactive || process.env.CCTOP_VERBOSE) {
          console.error(`File not found: ${configPath}`);
        }
        return null;
      } else if (error instanceof SyntaxError) {
        if (this.interactive || process.env.CCTOP_VERBOSE) {
          console.error(`JSON syntax error: ${configPath}`);
          console.error(`Details: ${error.message}`);
          console.error('Fix: Please correct to valid JSON format');
        }
        return null;
      } else {
        if (this.interactive || process.env.CCTOP_VERBOSE) {
          console.error(`Configuration file load error: ${error.message}`);
        }
        return null;
      }
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