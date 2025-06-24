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

// PLAN準拠: JSコード内では設定値は一切定義しない（定数除く）
// 全設定は~/.cctop/config.jsonから読み込む

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
      
      // 2. 設定ファイルの存在確認（PLAN準拠）
      if (!fs.existsSync(this.configPath)) {
        console.error(`\nエラー: 設定ファイルが見つかりません: ${this.configPath}`);
        
        // デフォルト設定ファイルを作成
        await this.createDefaultConfigFile();
        
        console.log(`設定ファイルを作成しました: ${this.configPath}`);
        console.log('設定を確認してから再度実行してください。\n');
        
        // テスト環境以外では終了
        if (process.env.NODE_ENV !== 'test') {
          // ユーザー確認待機
          await this.waitForUserConfirmation();
          process.exit(1);
        }
      }
      
      // 3. 設定ファイルを読み込む（PLAN準拠のエラーハンドリング）
      const fileConfig = this.loadConfigFile(this.configPath);
      if (!fileConfig || Object.keys(fileConfig).length === 0) {
        console.error(`\nエラー: 設定ファイルの読み込みに失敗しました: ${this.configPath}`);
        console.error('ファイルが存在し、有効なJSONかを確認してください。\n');
        if (process.env.NODE_ENV !== 'test') {
          process.exit(1);
        } else {
          throw new Error('Configuration file load failed');
        }
      }
      
      this.config = fileConfig;
      if (process.env.NODE_ENV === 'test' || process.env.CCTOP_VERBOSE) {
        console.log(`📋 Config loaded from: ${this.configPath}`);
      }
      
      // 4. CLIアrgumentsでオーバーライド
      this.applyCLIOverrides(cliArgs);
      
      // 5. 自動監視対象追加機能（PLAN準拠）
      await this.checkAndAddCurrentDirectory(cliArgs);
      
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
   * 設定ファイルの読み込み（PLAN準拠の厳格なエラーハンドリング）
   */
  loadConfigFile(configPath) {
    try {
      const content = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(content);
      
      // データベースパスの ~ を展開
      if (config.database && config.database.path) {
        config.database.path = this.expandTilde(config.database.path);
      }
      
      return config;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.error(`❌ ファイル不存在: ${configPath}`);
        return null;
      } else if (error instanceof SyntaxError) {
        console.error(`❌ JSON構文エラー: ${configPath}`);
        console.error(`詳細: ${error.message}`);
        console.error('修正方法: 有効なJSON形式に修正してください');
        return null;
      } else {
        console.error(`❌ 設定ファイル読み込みエラー: ${error.message}`);
        return null;
      }
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
    // 監視パスの指定（CLI引数で上書き）
    if (cliArgs.watchPath) {
      // monitoring構造が存在しない場合は作成
      if (!this.config.monitoring) {
        this.config.monitoring = {};
      }
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
      this.config.display.maxEvents = parseInt(cliArgs.maxLines, 10);
    }
  }

  /**
   * デフォルト設定ファイルを作成（PLAN準拠）
   */
  async createDefaultConfigFile() {
    try {
      // ~/.cctop ディレクトリが存在しない場合は作成
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      // PLAN記載のデフォルト設定（更新版）
      const defaultConfig = {
        "version": "0.1.0",
        "monitoring": {
          "watchPaths": [],
          "excludePatterns": [
            "**/node_modules/**",
            "**/.git/**",
            "**/.DS_Store",
            "**/.cctop/**",
            "**/coverage/**",
            "**/*.log"
          ],
          "debounceMs": 100,
          "maxDepth": 10
        },
        "database": {
          "path": "~/.cctop/activity.db",
          "mode": "WAL"
        },
        "display": {
          "maxEvents": 20,
          "refreshRateMs": 100
        }
      };
      
      // データベースパスの ~ を展開
      if (defaultConfig.database && defaultConfig.database.path) {
        defaultConfig.database.path = this.expandTilde(defaultConfig.database.path);
      }
      
      // デフォルト設定をconfig.jsonとして保存
      const configContent = JSON.stringify(defaultConfig, null, 2);
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
   * 監視対象ディレクトリ追加の確認プロンプト（PLAN準拠）
   */
  async promptAddDirectory(dirPath) {
    // テスト環境では自動でy応答
    if (process.env.NODE_ENV === 'test') {
      return true;
    }
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    return new Promise((resolve) => {
      rl.question(
        `📁 ${dirPath} をモニタ対象に追加しますか？ (y/n): `,
        (answer) => {
          rl.close();
          resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        }
      );
    });
  }

  /**
   * 現在ディレクトリの監視対象自動追加チェック（PLAN準拠・更新版）
   */
  async checkAndAddCurrentDirectory(cliArgs = {}) {
    // 監視対象ディレクトリの決定
    const targetDir = cliArgs.watchPath || process.cwd();
    const absoluteTargetDir = path.resolve(targetDir);
    
    // 設定構造の防御的確認
    if (!this.config.monitoring) {
      this.config.monitoring = {};
    }
    if (!Array.isArray(this.config.monitoring.watchPaths)) {
      this.config.monitoring.watchPaths = [];
    }
    
    // 既存のパスを絶対パスに正規化（PLAN準拠: 全て絶対パスで統一）
    this.config.monitoring.watchPaths = this.config.monitoring.watchPaths.map(watchPath => {
      return path.resolve(watchPath);
    });
    
    const watchPaths = this.config.monitoring.watchPaths;
    
    // 既に監視対象に含まれているかチェック（絶対パスで統一比較）
    const isAlreadyWatched = watchPaths.includes(absoluteTargetDir);
    
    if (!isAlreadyWatched) {
      const shouldAdd = await this.promptAddDirectory(absoluteTargetDir);
      if (shouldAdd) {
        // 絶対パスで追加（PLAN準拠）
        this.config.monitoring.watchPaths.push(absoluteTargetDir);
        await this.save();
        console.log(`✅ Added to monitor: ${absoluteTargetDir}`);
      } else {
        console.log(`ℹ️  Monitoring with current config only`);
      }
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
   * 設定の有効性確認（PLAN準拠の必須項目チェック）
   */
  validate() {
    // PLAN記載の必須項目
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
      const errorMsg = `設定ファイルに必須項目が不足しています:\n${missing.map(f => `  - ${f}`).join('\n')}\n\n~/.cctop/config.jsonを確認し、不足項目を追加してください。\nデフォルト設定を参考にしてください。`;
      
      if (process.env.NODE_ENV === 'test') {
        throw new Error(`Required fields missing: ${missing.join(', ')}`);
      } else {
        console.error(`エラー: ${errorMsg}`);
        process.exit(1);
      }
    }

    // 型チェック
    if (!Array.isArray(this.get('monitoring.watchPaths'))) {
      const errorMsg = 'monitoring.watchPaths must be an array';
      if (process.env.NODE_ENV === 'test') {
        throw new Error(errorMsg);
      } else {
        console.error(`エラー: monitoring.watchPathsは配列である必要があります`);
        process.exit(1);
      }
    }

    if (this.get('display.maxEvents') <= 0) {
      const errorMsg = 'display.maxEvents must be positive';
      if (process.env.NODE_ENV === 'test') {
        throw new Error(errorMsg);
      } else {
        console.error(`エラー: display.maxEventsは正の数である必要があります`);
        process.exit(1);
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

  /**
   * チルダ展開
   */
  expandTilde(filePath) {
    if (typeof filePath !== 'string') {
      return filePath;
    }
    
    if (filePath.startsWith('~/')) {
      return path.join(os.homedir(), filePath.slice(2));
    }
    
    return filePath;
  }
}

module.exports = ConfigManager;