# CG-002: Config Manager実装ガイド

**作成日**: 2025年6月26日 09:15  
**更新日**: 2025年6月27日 18:36  
**作成者**: Architect Agent  
**タイプ**: Code Guide  
**関連仕様**: FUNC-105, FUNC-101

## 📋 概要

シンプルな設定管理システムと自動初期化機能の実装ガイド。

## 🔧 実装コード

### Config Manager基本実装

```javascript
// src/config/config-manager.js

const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

class ConfigManager {
  constructor() {
    this.config = null;
    this.configPath = null;
  }

  async initialize(cliArgs = {}) {
    // 設定ファイルパスの決定
    this.configPath = this.resolveConfigPath(cliArgs);
    
    // 設定ファイルの読み込み
    await this.loadConfig();
    
    // 監視対象ディレクトリの確認
    await this.checkWatchPath(cliArgs);
    
    return this.config;
  }

  // 設定ファイルパスの解決（FUNC-105準拠）
  resolveConfigPath(cliArgs) {
    if (cliArgs.config) {
      // --config で明示的に指定
      return path.resolve(cliArgs.config);
    }
    
    // デフォルト: カレントディレクトリの.cctop/
    return path.join(process.cwd(), '.cctop', 'config.json');
  }

  // 設定ファイルの読み込み
  async loadConfig() {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(configData);
      this.validateConfig();
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.handleMissingConfig();
      } else if (error instanceof SyntaxError) {
        this.handleJsonError(error);
      } else {
        throw error;
      }
    }
  }

  // 設定ファイルが存在しない場合
  handleMissingConfig() {
    console.error(`
❌ No cctop configuration found

You are not in a cctop-enabled directory.

To get started:
  cctop --init     # Initialize this directory

Learn more: cctop --help
`);
    process.exit(1);
  }

  // JSON構文エラーの場合
  handleJsonError(error) {
    console.error(`
❌ Configuration file has JSON syntax error

File: ${this.configPath}
Error: ${error.message}

Please fix the syntax error and try again.
`);
    process.exit(1);
  }

  // 設定の検証
  validateConfig() {
    const requiredFields = [
      'database.path',
      'display.maxEvents',
      'monitoring.watchPaths'
    ];

    const missing = [];
    for (const field of requiredFields) {
      if (!this.getNestedValue(this.config, field)) {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      console.error(`
エラー: 設定ファイルに必須項目が不足しています:
${missing.map(f => `  - ${f}`).join('\n')}

${this.configPath}を確認し、不足項目を追加してください。
自動初期化でデフォルト設定を作成できます。
`);
      process.exit(1);
    }
  }

  // ネストされた値の取得
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => 
      current && current[key], obj);
  }

  // 監視対象ディレクトリの確認と追加
  async checkWatchPath(cliArgs) {
    const targetDir = cliArgs.watchPath || process.cwd();
    const absoluteTargetDir = path.resolve(targetDir);
    
    // 既に監視対象に含まれているかチェック
    const watchPaths = this.config.monitoring?.watchPaths || [];
    const isAlreadyWatched = watchPaths.some(watchPath => {
      return path.resolve(watchPath) === absoluteTargetDir;
    });
    
    if (!isAlreadyWatched && watchPaths.length === 0) {
      const shouldAdd = await this.promptAddDirectory(absoluteTargetDir);
      if (shouldAdd) {
        this.config.monitoring.watchPaths.push(absoluteTargetDir);
        await this.save();
        console.log(`✅ Added to monitor: ${absoluteTargetDir}`);
      } else {
        console.log(`ℹ️  Monitoring with current config only`);
      }
    }
  }

  // ディレクトリ追加のプロンプト
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

  // 設定の保存
  async save() {
    const configDir = path.dirname(this.configPath);
    await fs.mkdir(configDir, { recursive: true });
    
    const configData = JSON.stringify(this.config, null, 2);
    await fs.writeFile(this.configPath, configData, 'utf-8');
  }

  // 初期化機能（自動初期化）
  static async initializeNew(options = {}) {
    const configPath = path.join(process.cwd(), '.cctop');
    
    const configFile = path.join(configPath, 'config.json');
    
    // 既に存在する場合は確認
    try {
      await fs.access(configFile);
      console.error(`❌ Configuration already exists at ${configFile}`);
      process.exit(1);
    } catch (error) {
      // ファイルが存在しない場合は作成
    }

    // デフォルト設定の作成
    const defaultConfig = {
      version: "0.2.0",
      encoding: "utf-8",
      monitoring: {
        watchPaths: [],
        excludePatterns: [
          "**/node_modules/**",
          "**/.git/**",
          "**/.DS_Store",
          "**/.cctop/**",
          "**/coverage/**",
          "**/*.log"
        ],
        debounceMs: 100,
        maxDepth: 10
      },
      database: {
        path: "activity.db",
        mode: "WAL"
      },
      display: {
        maxEvents: 20,
        refreshRateMs: 100,
        mode: "all"
      }
    };

    // ディレクトリとファイルの作成
    await fs.mkdir(configPath, { recursive: true });
    await fs.writeFile(configFile, JSON.stringify(defaultConfig, null, 2));
    
    // .gitignoreの作成
    const gitignoreContent = `# cctop monitoring data
activity.db
activity.db-*
cache/
logs/
`;
    await fs.writeFile(path.join(configPath, '.gitignore'), gitignoreContent);

    console.log(`
✅ Initialized cctop in ${configPath}/
📝 Edit ${configFile} to customize settings
🚀 Run 'cctop' to start monitoring
`);
  }
}

module.exports = ConfigManager;
```

## 📋 使用方法

### CLIからの使用

```javascript
// bin/cctop

const ConfigManager = require('../src/config/config-manager');

async function main() {
  const args = parseCommandLineArgs();
  
  // --init オプション
  if (args.init) {
    await ConfigManager.initializeNew();
    process.exit(0);
  }
  
  // 通常起動
  const configManager = new ConfigManager();
  const config = await configManager.initialize(args);
  
  // configを使用してアプリケーションを起動
  startApplication(config);
}
```

## 🧪 テストのポイント

1. **設定ファイルパス解決**
   - デフォルトパス解決の動作確認
   - 自動初期化の動作確認

2. **エラーハンドリング**
   - ファイル不在時のメッセージ
   - JSON構文エラーの処理

3. **監視対象追加**
   - 初回起動時のプロンプト
   - テスト環境での自動応答

## ⚠️ 注意事項

- 設定ファイルは常に絶対パスで管理
- Windows環境でのパス区切り文字に注意
- 非同期処理のエラーハンドリング

## 🔗 関連ドキュメント

- [FUNC-105: ローカル設定初期化](../functions/func-105-local-setup-initialization.md)
- [FUNC-101: 階層的設定管理](../functions/FUNC-101-hierarchical-config-management.md)
- [BP-001: v0.2.0.0実装計画](../blueprints/BP-001-for-version0200-restructered.md)