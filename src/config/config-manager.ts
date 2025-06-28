/**
 * Configuration Manager (Simplified Version)
 * Feature 3: Basic configuration system management
 * 
 * Loading priority order:
 * 1. Command line arguments (--config)
 * 2. ./.cctop/config.json (local directory only)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  ConfigManagerOptions,
  CLIArgs,
  FullConfig,
  InotifyConfig,
  CLIInterface,
  FilterState
} from '../types/common';

const CLIInterfaceClass = require('../interfaces/cli-interface');

// PLAN compliant: No configuration values defined in JS code (except constants)
// All settings are loaded from ./.cctop/config.json (FUNC-105 local-only)

class ConfigManager {
  private config: FullConfig | null = null;
  private configPath: string | null = null;
  private interactive: boolean;
  private cliInterface: CLIInterface;
  private promptHandler: (dirPath: string) => Promise<boolean>;

  constructor({ 
    interactive = true, 
    cliInterface = null, 
    promptHandler = null 
  }: ConfigManagerOptions = {}) {
    this.interactive = interactive;
    this.cliInterface = cliInterface || new CLIInterfaceClass();
    this.promptHandler = promptHandler || this.defaultPromptHandler.bind(this);
  }

  /**
   * Initialize configuration
   */
  async initialize(cliArgs: CLIArgs = {}): Promise<FullConfig> {
    try {
      // 1. Determine config file path (according to priority order)
      this.configPath = this.determineConfigPath(cliArgs);
      
      // 2. Check config file existence (FUNC-105 compliant - auto-creation support)
      if (!fs.existsSync(this.configPath)) {
        // Auto-creation on first run
        await this.createDefaultConfigFile();
        
        // Configuration created
      }
      
      // 3. Load configuration file (PLAN compliant error handling)
      const fileConfig = this.loadConfigFile(this.configPath);
      if (!fileConfig || Object.keys(fileConfig).length === 0) {
        if (this.interactive || process.env.CCTOP_VERBOSE) {
          console.error(`\nError: Failed to load configuration file: ${this.configPath}`);
          console.error('Please check if the file exists and is valid JSON.\n');
        }
        if (this.interactive) {
          process.exit(1);
        } else {
          throw new Error('Configuration file load failed');
        }
      }
      
      this.config = fileConfig;
      // Config loaded
      
      // 4. Override with CLI arguments
      this.applyCLIOverrides(cliArgs);
      
      // 5. Validate configuration values (required field check)
      this.validate();
      
      // 6. Auto-add monitoring target feature (PLAN compliant)
      await this.checkAndAddCurrentDirectory(cliArgs);
      
      // Configuration initialized
      return this.config;
      
    } catch (error) {
      console.error('Configuration initialization failed:', error);
      throw error;
    }
  }

  /**
   * Determine configuration file path (FUNC-105 compliant - local only)
   */
  private determineConfigPath(cliArgs: CLIArgs): string {
    // 1. Command line argument (--config) - optional override
    if (cliArgs.config) {
      return path.resolve(cliArgs.config);
    }
    
    // 2. Default: Always use ./.cctop/config.json in current directory
    const localConfigPath = path.join(process.cwd(), '.cctop', 'config.json');
    // Using local config path
    return localConfigPath;
  }

  /**
   * Load configuration file (PLAN compliant strict error handling)
   */
  private loadConfigFile(configPath: string): FullConfig | null {
    try {
      const content = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(content) as FullConfig;
      
      // FUNC-105: Force local database path (no global paths)
      if (config.database && config.database.path) {
        // Override to always use current directory .cctop/
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
   * Merge configuration (deep merge)
   */
  private mergeConfig(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.mergeConfig(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * Apply CLI arguments
   */
  private applyCLIOverrides(cliArgs: CLIArgs): void {
    if (!this.config) return;

    // Specify watch paths (override with CLI arguments)
    if (cliArgs.watchPath) {
      // Create monitoring structure if it doesn't exist
      if (!this.config.monitoring) {
        this.config.monitoring = {} as any;
      }
      this.config.monitoring.watchPaths = Array.isArray(cliArgs.watchPath) 
        ? cliArgs.watchPath 
        : [cliArgs.watchPath];
    }
    
    // Specify database path
    if (cliArgs.dbPath) {
      this.config.database.path = path.resolve(cliArgs.dbPath);
    }
    
    // Specify display line count
    if (cliArgs.maxLines) {
      const maxLines = typeof cliArgs.maxLines === 'string' 
        ? parseInt(cliArgs.maxLines, 10) 
        : cliArgs.maxLines;
      this.config.display.maxEvents = maxLines;
    }
  }

  /**
   * Create default configuration file (PLAN compliant)
   */
  private async createDefaultConfigFile(): Promise<void> {
    try {
      if (!this.configPath) {
        throw new Error('Config path not set');
      }

      // Create .cctop directory if it doesn't exist
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      // Default configuration specified in PLAN (updated version)
      const defaultConfig: FullConfig = {
        "version": "0.1.0",
        "monitoring": {
          "watchPaths": [process.cwd()],
          "excludePatterns": [
            "**/node_modules/**",
            "**/.git/**",
            "**/.*",
            "**/.cctop/**"
          ],
          "debounceMs": 100,
          "maxDepth": 10,
          "eventFilters": {
            "find": true,
            "create": true,
            "modify": true,
            "delete": true,
            "move": true,
            "restore": true
          } as FilterState,
          "inotify": {
            "requiredMaxUserWatches": 524288,
            "checkOnStartup": true,
            "warnIfInsufficient": true,
            "recommendedValue": 524288
          },
          "backgroundMonitor": {
            "enabled": true,
            "logLevel": "info",
            "heartbeatInterval": 30000
          }
        },
        "database": {
          "path": "./.cctop/activity.db",
          "mode": "WAL"
        },
        "display": {
          "maxEvents": 20,
          "refreshRateMs": 100,
          "statusArea": {
            "maxLines": 3,
            "enabled": true,
            "scrollSpeed": 200,
            "updateInterval": 5000
          }
        }
      };
      
      // Always use local configuration path
      if (defaultConfig.database && defaultConfig.database.path) {
        // Local config: use relative path
        defaultConfig.database.path = path.join(process.cwd(), '.cctop', 'activity.db');
      }
      
      // Save default configuration as config.json
      const configContent = JSON.stringify(defaultConfig, null, 2);
      fs.writeFileSync(this.configPath, configContent, 'utf8');
      
      // Also create .gitignore (FUNC-010 compliant)
      const gitignorePath = path.join(configDir, '.gitignore');
      if (!fs.existsSync(gitignorePath)) {
        const gitignoreContent = `# cctop monitoring data
activity.db
activity.db-*
cache/
logs/
`;
        fs.writeFileSync(gitignorePath, gitignoreContent, 'utf8');
      }
      
    } catch (error: any) {
      if (this.interactive || process.env.CCTOP_VERBOSE) {
        console.error(`\nFailed to create configuration file: ${error.message}`);
        console.error('Please run the following command manually:');
        console.error(`mkdir -p ${this.configPath ? path.dirname(this.configPath) : ''}`);
        console.error(`Then create configuration file at ${this.configPath}.\n`);
      }
      throw error;
    }
  }

  /**
   * Wait for user confirmation
   */
  async waitForUserConfirmation(): Promise<boolean> {
    return this.cliInterface.waitForUserConfirmation();
  }

  /**
   * Default prompt handler (using CLIInterface)
   */
  private async defaultPromptHandler(dirPath: string): Promise<boolean> {
    // Automatically false in non-interactive mode
    if (!this.interactive) {
      return false;
    }
    
    return this.cliInterface.promptAddDirectory(dirPath, 30000);
  }

  /**
   * Check and auto-add current directory to monitoring targets (PLAN compliant, updated version)
   */
  private async checkAndAddCurrentDirectory(cliArgs: CLIArgs = {}): Promise<void> {
    if (!this.config) return;

    // Determine target directory for monitoring
    const targetDir = Array.isArray(cliArgs.watchPath) ? cliArgs.watchPath[0] : (cliArgs.watchPath || process.cwd());
    const absoluteTargetDir = path.resolve(targetDir);
    
    // Defensive check of configuration structure
    if (!this.config.monitoring) {
      this.config.monitoring = {} as any;
    }
    if (!Array.isArray(this.config.monitoring.watchPaths)) {
      this.config.monitoring.watchPaths = [];
    }
    
    // Normalize existing paths to absolute paths (PLAN compliant: unified to absolute paths)
    this.config.monitoring.watchPaths = this.config.monitoring.watchPaths.map(watchPath => {
      return path.resolve(watchPath);
    });
    
    const watchPaths = this.config.monitoring.watchPaths;
    
    // Check if already included in monitoring targets (unified comparison with absolute paths)
    const isAlreadyWatched = watchPaths.includes(absoluteTargetDir);
    
    if (!isAlreadyWatched) {
      const shouldAdd = await this.promptHandler(absoluteTargetDir);
      if (shouldAdd) {
        // Add with absolute path (PLAN compliant)
        this.config.monitoring.watchPaths.push(absoluteTargetDir);
        await this.save();
        this.cliInterface.success(`Added to monitor: ${absoluteTargetDir}`);
      } else {
        this.cliInterface.info('Monitoring with current config only');
      }
    }
  }

  /**
   * Get configuration value
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
   * Get all configuration
   */
  getAll(): FullConfig {
    if (!this.config) {
      throw new Error('Configuration not initialized');
    }
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Get all configuration (alias for getAll())
   */
  getConfig(): FullConfig {
    return this.getAll();
  }

  /**
   * Validate configuration (PLAN compliant required field check)
   */
  private validate(): boolean {
    if (!this.config) {
      throw new Error('Configuration not initialized');
    }

    // Required fields specified in PLAN
    const requiredFields = [
      'database.path',
      'display.maxEvents',    
      'monitoring.watchPaths'
    ];

    const missing: string[] = [];
    requiredFields.forEach(field => {
      const value = this.getNestedValue(this.config!, field);
      if (value === null || value === undefined || value === '') {
        missing.push(field);
      }
    });
    
    if (missing.length > 0) {
      const errorMsg = `Required fields are missing in configuration file:\n${missing.map(f => `  - ${f}`).join('\n')}\n\nPlease check ./.cctop/config.json and add missing fields.\nRefer to default configuration.`;
      
      if (this.interactive) {
        console.error(`Error: ${errorMsg}`);
        process.exit(1);
      } else {
        if (process.env.CCTOP_VERBOSE) {
          console.error(`Error: ${errorMsg}`);
        }
        throw new Error(`Required fields missing: ${missing.join(', ')}`);
      }
    }

    // Type check
    if (!Array.isArray(this.get('monitoring.watchPaths'))) {
      const errorMsg = 'monitoring.watchPaths must be an array';
      if (this.interactive) {
        console.error(`Error: monitoring.watchPaths must be an array`);
        process.exit(1);
      } else {
        if (process.env.CCTOP_VERBOSE) {
          console.error(`Error: monitoring.watchPaths must be an array`);
        }
        throw new Error(errorMsg);
      }
    }

    if (this.get('display.maxEvents') <= 0) {
      const errorMsg = 'display.maxEvents must be positive';
      if (this.interactive) {
        console.error(`Error: display.maxEvents must be a positive number`);
        process.exit(1);
      } else {
        if (process.env.CCTOP_VERBOSE) {
          console.error(`Error: display.maxEvents must be a positive number`);
        }
        throw new Error(errorMsg);
      }
    }

    return true;
  }

  /**
   * ネストされた値の取得
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  /**
   * 設定ファイルの保存（./.cctop/config.jsonに保存）
   */
  async save(): Promise<void> {
    try {
      const configDir = path.dirname(this.configPath || path.join(process.cwd(), '.cctop', 'config.json'));
      
      // .cctopディレクトリが存在しない場合は作成
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      const savePath = this.configPath || path.join(configDir, 'config.json');
      fs.writeFileSync(savePath, JSON.stringify(this.config, null, 2));
      console.log(`💾 Configuration saved to: ${savePath}`);
      
    } catch (error: any) {
      console.error('Failed to save configuration:', error);
      throw error;
    }
  }

  /**
   * inotify設定の取得
   */
  getInotifyConfig(): InotifyConfig {
    const defaultConfig: InotifyConfig = {
      requiredMaxUserWatches: 524288,
      checkOnStartup: true,
      warnIfInsufficient: true,
      recommendedValue: 524288
    };
    
    const inotifyConfig = this.get('monitoring.inotify', {});
    
    // デフォルト値とマージ
    return {
      ...defaultConfig,
      ...inotifyConfig
    };
  }

  /**
   * テスト用ConfigManagerファクトリー
   */
  static createForTesting(options: ConfigManagerOptions = {}): ConfigManager {
    return new ConfigManager({
      interactive: false,
      ...options
    });
  }

  /**
   * 本番用ConfigManagerファクトリー
   */
  static createForProduction(options: ConfigManagerOptions = {}): ConfigManager {
    return new ConfigManager({
      interactive: true,
      ...options
    });
  }
}

export = ConfigManager;