/**
 * Configuration Manager (簡略化版)
 * 機能3: 設定システムの基本管理
 * 
 * 読み込み優先順位:
 * 1. コマンドライン引数（--config）
 * 2. ~/.cctop/config.json
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const readline = require('readline');

// デフォルト設定（postinstall.jsと同じ内容）
const DEFAULT_CONFIG = {
  version: "0.1.0",
  watchPaths: ["./"],
  excludePatterns: [
    "**/node_modules/**",
    "**/.git/**",
    "**/dist/**",
    "**/build/**",
    "**/.next/**",
    "**/.nuxt/**",
    "**/.cache/**",
    "**/coverage/**",
    "**/.DS_Store",
    "**/*.log",
    "**/.env*",
    "**/.cctop/**"
  ],
  includePatterns: [],
  monitoring: {
    debounceMs: 100,
    maxDepth: 10,
    followSymlinks: false
  },
  display: {
    maxEvents: 50,
    refreshInterval: 100,
    showTimestamps: true,
    colorEnabled: true,
    relativeTime: false,
    mode: "all"
  },
  database: {
    path: "~/.cctop/events.db",
    maxEvents: 10000,
    cleanupInterval: 3600000,
    walMode: true
  },
  performance: {
    maxMemoryMB: 256,
    gcInterval: 60000
  }
};

class ConfigManager {
  constructor() {
    this.config = null;
    this.configPath = null;
  }

  /**
   * 設定初期化
   * @param {Object} cliArgs - コマンドライン引数
   */
  async initialize(cliArgs = {}) {
    try {
      // 1. 設定ファイルパスの決定（優先順位に従って）
      this.configPath = this.determineConfigPath(cliArgs);
      
      // 2. 設定ファイルの存在確認
      if (!fs.existsSync(this.configPath)) {
        // テスト環境では自動的に設定ファイルを作成
        if (process.env.NODE_ENV === 'test') {
          await this.createDefaultConfigFile();
          console.log(`📝 Created default config for test: ${this.configPath}`);
        } else {
          console.error(`\nエラー: 設定ファイルが見つかりません: ${this.configPath}`);
          
          // デフォルト設定ファイルを作成
          await this.createDefaultConfigFile();
          
          console.log(`\n設定ファイルを作成しました: ${this.configPath}`);
          console.log('設定を編集してから再度実行してください。\n');
          
          // ユーザー確認待機
          await this.waitForUserConfirmation();
          
          // プログラム終了
          process.exit(1);
        }
      }
      
      // 3. 設定ファイルを読み込む
      const fileConfig = this.loadConfigFile(this.configPath);
      this.config = fileConfig;
      if (process.env.NODE_ENV === 'test' || process.env.CCTOP_VERBOSE) {
        console.log(`📋 Config loaded from: ${this.configPath}`);
      }
      
      // 4. CLIアrgumentsでオーバーライド
      this.applyCLIOverrides(cliArgs);
      
      if (process.env.NODE_ENV === 'test' || process.env.CCTOP_VERBOSE) {
        console.log('⚙️ Configuration initialized');
      }
      return this.config;
      
    } catch (error) {
      console.error('❌ Configuration initialization failed:', error);
      throw error;
    }
  }

  /**
   * 設定ファイルパスの決定（CONFIG001準拠の優先順位）
   */
  determineConfigPath(cliArgs) {
    // 1. コマンドライン引数（--config）
    if (cliArgs.config) {
      return path.resolve(cliArgs.config);
    }
    
    // 2. ~/.cctop/config.json
    const defaultConfigPath = path.join(os.homedir(), '.cctop', 'config.json');
    return defaultConfigPath;
  }

  /**
   * 設定ファイルの読み込み
   */
  loadConfigFile(configPath) {
    try {
      const content = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`⚠️ Failed to load config file ${configPath}:`, error.message);
      return {};
    }
  }

  /**
   * 設定のマージ（深いマージ）
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
   * CLIアrgumentsの適用
   */
  applyCLIOverrides(cliArgs) {
    // 監視パスの指定
    if (cliArgs.watchPath) {
      this.config.watchPaths = Array.isArray(cliArgs.watchPath) 
        ? cliArgs.watchPath 
        : [cliArgs.watchPath];
    }
    
    // データベースパスの指定
    if (cliArgs.dbPath) {
      this.config.database.path = path.resolve(cliArgs.dbPath);
    }
    
    // 表示行数の指定
    if (cliArgs.maxLines) {
      this.config.display.maxEvents = parseInt(cliArgs.maxLines, 10);
    }
  }

  /**
   * デフォルト設定ファイルを作成
   */
  async createDefaultConfigFile() {
    try {
      // ~/.cctop ディレクトリが存在しない場合は作成
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      // デフォルト設定をconfig.jsonとして保存
      const configContent = JSON.stringify(DEFAULT_CONFIG, null, 2);
      fs.writeFileSync(this.configPath, configContent, 'utf8');
      
    } catch (error) {
      console.error(`\n⚠️ 設定ファイルの作成に失敗しました: ${error.message}`);
      console.error('手動で以下のコマンドを実行してください:');
      console.error(`mkdir -p ${path.dirname(this.configPath)}`);
      console.error(`次に、${this.configPath} に設定ファイルを作成してください。\n`);
      throw error;
    }
  }

  /**
   * ユーザー確認待機
   */
  async waitForUserConfirmation() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question('Enterキーを押して終了...', () => {
        rl.close();
        resolve();
      });
    });
  }

  /**
   * 設定値の取得
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
   * 全設定の取得
   */
  getAll() {
    if (!this.config) {
      throw new Error('Configuration not initialized');
    }
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * 設定の有効性確認
   */
  validate() {
    const errors = [];

    // 必須設定の確認
    if (!this.get('database.path')) {
      errors.push('Database path is required');
    }

    if (!Array.isArray(this.get('watchPaths'))) {
      errors.push('watchPaths must be an array');
    }

    if (this.get('display.maxEvents') <= 0) {
      errors.push('display.maxEvents must be positive');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }

    return true;
  }

  /**
   * 設定ファイルの保存（~/.cctop/config.jsonに保存）
   */
  save() {
    try {
      const configDir = path.dirname(this.configPath || path.join(os.homedir(), '.cctop', 'config.json'));
      
      // ~/.cctopディレクトリが存在しない場合は作成
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      const savePath = this.configPath || path.join(configDir, 'config.json');
      fs.writeFileSync(savePath, JSON.stringify(this.config, null, 2));
      console.log(`💾 Configuration saved to: ${savePath}`);
      
    } catch (error) {
      console.error('❌ Failed to save configuration:', error);
      throw error;
    }
  }
}

module.exports = ConfigManager;