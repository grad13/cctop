/**
 * Configuration Manager (Simplified Version)
 * Feature 3: Basic configuration system management
 * 
 * Loading priority order:
 * 1. Command line arguments (--config)
 * 2. ./.cctop/config.json (local directory only)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const CLIInterface = require('../interfaces/cli-interface');

// PLAN compliant: No configuration values defined in JS code (except constants)
// All settings are loaded from ./.cctop/config.json (FUNC-105 local-only)

class ConfigManager {
  constructor({ 
    interactive = true, 
    cliInterface = null, 
    promptHandler = null 
  } = {}) {
    this.config = null;
    this.configPath = null;
    this.interactive = interactive;
    this.cliInterface = cliInterface || new CLIInterface();
    this.promptHandler = promptHandler || this.defaultPromptHandler.bind(this);
  }

  /**
   * Initialize configuration
   * @param {Object} cliArgs - Command line arguments
   */
  async initialize(cliArgs = {}) {
    try {
      // 1. Determine config file path (according to priority order)
      this.configPath = this.determineConfigPath(cliArgs);
      
      // 2. Check config file existence (FUNC-105 compliant - auto-creation support)
      if (!fs.existsSync(this.configPath)) {
        // Auto-creation on first run
        await this.createDefaultConfigFile();
        
        // Display message for configuration creation (FUNC-105 compliant)
        if (process.env.CCTOP_VERBOSE === 'true') {
          console.log('Created configuration in ./.cctop/');
          console.log('Edit ./.cctop/config.json to customize settings');
          console.log('Starting monitoring...');
        }
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
      if (process.env.NODE_ENV === 'test' || process.env.CCTOP_VERBOSE) {
        console.log(`Config loaded from: ${this.configPath}`);
      }
      
      // 4. Override with CLI arguments
      this.applyCLIOverrides(cliArgs);
      
      // 5. Validate configuration values (required field check)
      this.validate();
      
      // 6. Auto-add monitoring target feature (PLAN compliant)
      await this.checkAndAddCurrentDirectory(cliArgs);
      
      if (process.env.NODE_ENV === 'test' || process.env.CCTOP_VERBOSE) {
        console.log('⚙️ Configuration initialized');
      }
      return this.config;
      
    } catch (error) {
      console.error('Configuration initialization failed:', error);
      throw error;
    }
  }

  /**
   * Determine configuration file path (FUNC-105 compliant - local only)
   */
  determineConfigPath(cliArgs) {
    // 1. Command line argument (--config) - optional override
    if (cliArgs.config) {
      return path.resolve(cliArgs.config);
    }
    
    // 2. Default: Always use ./.cctop/config.json in current directory
    const localConfigPath = path.join(process.cwd(), '.cctop', 'config.json');
    console.log(`[ConfigManager] Using config path: ${localConfigPath}`);
    console.log(`[ConfigManager] Current working directory: ${process.cwd()}`);
    return localConfigPath;
  }

  /**
   * Load configuration file (PLAN compliant strict error handling)
   */
  loadConfigFile(configPath) {
    try {
      const content = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(content);
      
      // FUNC-105: Force local database path (no global paths)
      if (config.database && config.database.path) {
        // Override to always use current directory .cctop/
        config.database.path = path.join(process.cwd(), '.cctop', 'activity.db');
      }
      
      return config;
    } catch (error) {
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
  mergeConfig(target, source) {
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
  applyCLIOverrides(cliArgs) {
    // Specify watch paths (override with CLI arguments)
    if (cliArgs.watchPath) {
      // Create monitoring structure if it doesn't exist
      if (!this.config.monitoring) {
        this.config.monitoring = {};
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
      this.config.display.maxEvents = parseInt(cliArgs.maxLines, 10);
    }
  }

  /**
   * Create default configuration file (PLAN compliant)
   */
  async createDefaultConfigFile() {
    try {
      // Create .cctop directory if it doesn't exist
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      // Default configuration specified in PLAN (updated version)
      const defaultConfig = {
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
          },
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
      
    } catch (error) {
      if (this.interactive || process.env.CCTOP_VERBOSE) {
        console.error(`\nFailed to create configuration file: ${error.message}`);
        console.error('Please run the following command manually:');
        console.error(`mkdir -p ${path.dirname(this.configPath)}`);
        console.error(`Then create configuration file at ${this.configPath}.\n`);
      }
      throw error;
    }
  }

  /**
   * Wait for user confirmation
   */
  async waitForUserConfirmation() {
    return this.cliInterface.waitForUserConfirmation();
  }

  /**
   * Default prompt handler (using CLIInterface)
   * @param {string} dirPath - Directory path
   * @returns {Promise<boolean>}
   */
  async defaultPromptHandler(dirPath) {
    // Automatically false in non-interactive mode
    if (!this.interactive) {
      return false;
    }
    
    return this.cliInterface.promptAddDirectory(dirPath, 30000);
  }

  /**
   * Check and auto-add current directory to monitoring targets (PLAN compliant, updated version)
   */
  async checkAndAddCurrentDirectory(cliArgs = {}) {
    // Determine target directory for monitoring
    const targetDir = cliArgs.watchPath || process.cwd();
    const absoluteTargetDir = path.resolve(targetDir);
    
    // Defensive check of configuration structure
    if (!this.config.monitoring) {
      this.config.monitoring = {};
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
  get(keyPath, defaultValue = null) {
    if (!this.config) {
      throw new Error('Configuration not initialized');
    }

    const keys = keyPath.split('.');
    let current = this.config;

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
  getAll() {
    if (!this.config) {
      throw new Error('Configuration not initialized');
    }
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Get all configuration (alias for getAll())
   */
  getConfig() {
    return this.getAll();
  }

  /**
   * Validate configuration (PLAN compliant required field check)
   */
  validate() {
    // Required fields specified in PLAN
    const requiredFields = [
      'database.path',
      'display.maxEvents',    
      'monitoring.watchPaths'
    ];

    const missing = [];
    requiredFields.forEach(field => {
      const value = this.getNestedValue(this.config, field);
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
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  /**
   * 設定ファイルの保存（./.cctop/config.jsonに保存）
   */
  save() {
    try {
      const configDir = path.dirname(this.configPath || path.join(process.cwd(), '.cctop', 'config.json'));
      
      // .cctopディレクトリが存在しない場合は作成
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      const savePath = this.configPath || path.join(configDir, 'config.json');
      fs.writeFileSync(savePath, JSON.stringify(this.config, null, 2));
      console.log(`💾 Configuration saved to: ${savePath}`);
      
    } catch (error) {
      console.error('Failed to save configuration:', error);
      throw error;
    }
  }

  /**
   * inotify設定の取得
   */
  getInotifyConfig() {
    const defaultConfig = {
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
   * チルダ展開
   */
}

/**
 * テスト用ConfigManagerファクトリー
 * @param {Object} options - 設定オプション
 * @returns {ConfigManager} - テスト用ConfigManagerインスタンス
 */
ConfigManager.createForTesting = (options = {}) => {
  return new ConfigManager({
    interactive: false,
    ...options
  });
};

/**
 * 本番用ConfigManagerファクトリー
 * @param {Object} options - 設定オプション
 * @returns {ConfigManager} - 本番用ConfigManagerインスタンス
 */
ConfigManager.createForProduction = (options = {}) => {
  return new ConfigManager({
    interactive: true,
    ...options
  });
};

module.exports = ConfigManager;