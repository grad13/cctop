/**
 * Configuration Manager (a002準拠)
 * 機能3: 設定システムの基本管理
 * 
 * 読み込み優先順位:
 * 1. コマンドライン引数（--config）
 * 2. 環境変数（CCTOP_CONFIG_FILE）
 * 3. ~/.cctop/config.json
 * 4. デフォルト設定（defaults.js）
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const defaults = require('./defaults');

class ConfigManager {
  constructor() {
    this.config = null;
    this.configPath = null;
  }

  /**
   * 設定初期化
   * @param {Object} cliArgs - コマンドライン引数
   */
  initialize(cliArgs = {}) {
    try {
      // 1. デフォルト設定をベースとする
      this.config = JSON.parse(JSON.stringify(defaults));
      
      // 2. 設定ファイルパスの決定（優先順位に従って）
      this.configPath = this.determineConfigPath(cliArgs);
      
      // 3. 設定ファイルが存在する場合は読み込んでマージ
      if (this.configPath && fs.existsSync(this.configPath)) {
        const fileConfig = this.loadConfigFile(this.configPath);
        this.config = this.mergeConfig(this.config, fileConfig);
        console.log(`📋 Config loaded from: ${this.configPath}`);
      } else {
        // デフォルト設定でconfig.jsonを作成
        this.createDefaultConfigFile();
        console.log('📋 Using default configuration');
      }
      
      // 4. CLIアrgumentsでオーバーライド
      this.applyCLIOverrides(cliArgs);
      
      console.log('⚙️ Configuration initialized');
      return this.config;
      
    } catch (error) {
      console.error('❌ Configuration initialization failed:', error);
      throw error;
    }
  }

  /**
   * 設定ファイルパスの決定（a002準拠の優先順位）
   */
  determineConfigPath(cliArgs) {
    // 1. コマンドライン引数（--config）
    if (cliArgs.config) {
      return path.resolve(cliArgs.config);
    }
    
    // 2. 環境変数（CCTOP_CONFIG_FILE）
    if (process.env.CCTOP_CONFIG_FILE) {
      return path.resolve(process.env.CCTOP_CONFIG_FILE);
    }
    
    // 3. ~/.cctop/config.json
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
      this.config.monitoring.watchPaths = Array.isArray(cliArgs.watchPath) 
        ? cliArgs.watchPath 
        : [cliArgs.watchPath];
    }
    
    // データベースパスの指定
    if (cliArgs.dbPath) {
      this.config.database.path = path.resolve(cliArgs.dbPath);
    }
    
    // 表示行数の指定
    if (cliArgs.maxLines) {
      this.config.display.maxLines = parseInt(cliArgs.maxLines, 10);
    }
  }

  /**
   * デフォルト設定ファイルを作成
   */
  createDefaultConfigFile() {
    try {
      // ~/.cctop ディレクトリが存在しない場合は作成
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
        console.log(`📁 Created config directory: ${configDir}`);
      }
      
      // デフォルト設定をconfig.jsonとして保存
      if (!fs.existsSync(this.configPath)) {
        // this.configが設定されていない場合はdefaultsを使用
        const configToSave = this.config || require('./defaults');
        const configContent = JSON.stringify(configToSave, null, 2);
        fs.writeFileSync(this.configPath, configContent, 'utf8');
        console.log(`📝 Created default config: ${this.configPath}`);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to create config file ${this.configPath}:`, error.message);
    }
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

    if (!Array.isArray(this.get('monitoring.watchPaths'))) {
      errors.push('monitoring.watchPaths must be an array');
    }

    if (this.get('display.maxLines') <= 0) {
      errors.push('display.maxLines must be positive');
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