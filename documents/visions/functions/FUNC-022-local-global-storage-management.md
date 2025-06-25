# FUNC-022: ローカル・グローバル設定管理機能

**作成日**: 2025年6月25日  
**作成者**: Architect Agent  
**カテゴリ**: Core System  
**Phase**: 1 (高優先機能)  
**ステータス**: Draft

## 📊 機能概要

cctopの設定・データを現在ディレクトリ（.cctop/）またはユーザーホーム（~/.cctop/）で管理する選択式システム。デフォルトはローカル重視で不要なホーム作成を回避。

**ユーザー価値**: プロジェクト固有設定・チーム共有・Git管理・個人環境分離・明示的な設定場所制御

## 🎯 機能境界

### ✅ **実行する**
- ローカル（.cctop/）をデフォルト配置
- --globalオプションでホーム（~/.cctop/）使用
- 存在しない場合の明確なエラー案内

### ❌ **実行しない**
- 自動的なホームディレクトリ作成
- 複雑な設定階層・継承システム
- 複数設定の自動マージ

## 📋 必要な仕様

### **基本動作パターン**

#### **1. デフォルト動作（ローカル優先）**
```bash
# ローカル設定使用（デフォルト）
cctop
# → ./.cctop/ を使用、存在しなければエラー案内
```

#### **2. 明示的モード指定**
```bash
# グローバル設定使用
cctop --global
# → ~/.cctop/ を使用、存在しなければ作成

# ローカル設定強制
cctop --local
# → ./.cctop/ を強制使用、存在しなければエラー
```

### 設定ファイル検索ロジック**

#### **StoragePathResolverクラス実装**
```javascript
class StoragePathResolver {
  constructor(options = {}) {
    this.mode = this.determineMode(options);
    this.basePath = this.resolveBasePath();
  }
  
  determineMode(options) {
    // 1. 明示的指定
    if (options.global) return 'global';
    if (options.local) return 'local';
    
    // 2. デフォルト（ローカル）
    return 'local';
  }
  
  resolveBasePath() {
    switch (this.mode) {
      case 'global':
        return path.join(os.homedir(), '.cctop');
      case 'local':
      default:
        return path.join(process.cwd(), '.cctop');
    }
  }
  
  getConfigPath() {
    return path.join(this.basePath, 'config.json');
  }
  
  getDatabasePath() {
    return path.join(this.basePath, 'activity.db');
  }
  
  getCachePath() {
    return path.join(this.basePath, 'cache');
  }
  
  async ensureExists() {
    if (this.mode === 'global') {
      // グローバルモードは自動作成
      await this.createIfNotExists();
    } else {
      // ローカルモードは存在チェックのみ
      await this.checkExists();
    }
  }
  
  async checkExists() {
    if (!fs.existsSync(this.basePath)) {
      throw new ConfigurationError(
        `No cctop configuration found at ${this.basePath}\n\n` +
        `To get started:\n` +
        `  cctop --init     # Create local config (./.cctop/)\n` +
        `  cctop --global   # Use global config (~/.cctop/)\n\n` +
        `Learn more: cctop --help`
      );
    }
  }
  
  async createIfNotExists() {
    if (!fs.existsSync(this.basePath)) {
      await this.initializeDirectory();
    }
  }
}
```

### **初期化システム**

#### **--initオプション実装**
```javascript
class StorageInitializer {
  static async initializeLocal(options = {}) {
    const basePath = path.join(process.cwd(), '.cctop');
    
    if (fs.existsSync(basePath)) {
      console.log(`✅ .cctop/ already exists`);
      return basePath;
    }
    
    // ディレクトリ作成
    await fs.promises.mkdir(basePath, { recursive: true });
    
    // config.json作成
    const defaultConfig = this.getDefaultConfig();
    await fs.promises.writeFile(
      path.join(basePath, 'config.json'),
      JSON.stringify(defaultConfig, null, 2)
    );
    
    // .gitignore設定
    await this.setupGitignore(basePath);
    
    // README作成
    await this.createReadme(basePath);
    
    console.log(`✅ Initialized cctop in ./.cctop/`);
    console.log(`📝 Edit ./.cctop/config.json to customize settings`);
    console.log(`🚀 Run 'cctop' to start monitoring`);
    
    return basePath;
  }
  
  static async initializeGlobal() {
    const basePath = path.join(os.homedir(), '.cctop');
    
    if (fs.existsSync(basePath)) {
      return basePath;
    }
    
    // ディレクトリ作成
    await fs.promises.mkdir(basePath, { recursive: true });
    
    // config.json作成
    const defaultConfig = this.getDefaultConfig();
    await fs.promises.writeFile(
      path.join(basePath, 'config.json'),
      JSON.stringify(defaultConfig, null, 2)
    );
    
    console.log(`✅ Initialized global cctop in ~/.cctop/`);
    
    return basePath;
  }
  
  static async setupGitignore(basePath) {
    const gitignoreContent = [
      '# cctop monitoring data',
      'activity.db',
      'activity.db-*',
      'cache/',
      'logs/',
      '',
      '# Keep configuration for team sharing',
      '# config.json'
    ].join('\n');
    
    await fs.promises.writeFile(
      path.join(basePath, '.gitignore'),
      gitignoreContent
    );
  }
  
  static getDefaultConfig() {
    return {
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
        "path": "./activity.db",  // 相対パス（設定ディレクトリ基準）
        "mode": "WAL"
      },
      "display": {
        "maxEvents": 20,
        "refreshRateMs": 100,
        "colors": {
          "theme": "default"
        }
      }
    };
  }
}
```

### **CLI引数統合**

#### **引数パース拡張**
```javascript
// CLI引数定義
const cliOptions = {
  'global': {
    type: 'boolean',
    description: 'Use global configuration (~/.cctop/)'
  },
  'local': {
    type: 'boolean', 
    description: 'Use local configuration (./.cctop/) - default'
  },
  'init': {
    type: 'boolean',
    description: 'Initialize cctop in current directory'
  }
};

// 引数処理
function parseArguments(argv) {
  const args = minimist(argv.slice(2), {
    boolean: ['global', 'local', 'init', 'help'],
    alias: {
      'g': 'global',
      'l': 'local',
      'i': 'init',
      'h': 'help'
    }
  });
  
  // 競合チェック
  if (args.global && args.local) {
    throw new Error('Cannot specify both --global and --local');
  }
  
  return args;
}
```

### **エラーメッセージ設計**

#### **分かりやすいエラー案内**
```javascript
class ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

// ローカル設定不存在時
const LOCAL_NOT_FOUND = `
❌ No cctop configuration found

You are not in a cctop-enabled directory.

To get started:
  cctop --init     # Initialize this directory
  cctop --global   # Use global configuration

Learn more: cctop --help
`;

// プロジェクトルート外実行時
const NOT_IN_PROJECT = `
❌ No .cctop/ directory found

Current directory: ${process.cwd()}

To monitor this directory:
  cctop --init     # Initialize monitoring here
  cctop --global   # Use global monitoring

Learn more: cctop --help
`;
```

## 🔧 技術的実装詳細

### **1. 既存BP-000設定システムとの統合**

#### **ConfigManager修正**
```javascript
class ConfigManager {
  constructor(options = {}) {
    this.pathResolver = new StoragePathResolver(options);
    this.config = null;
  }
  
  async initialize() {
    // 設定ディレクトリ存在確認・作成
    await this.pathResolver.ensureExists();
    
    // 設定ファイル読み込み
    const configPath = this.pathResolver.getConfigPath();
    this.config = await this.loadConfig(configPath);
    
    // データベースパス調整（相対パス解決）
    this.config.database.path = this.resolveDatabasePath();
    
    return this.config;
  }
  
  resolveDatabasePath() {
    const dbPath = this.config.database.path;
    if (path.isAbsolute(dbPath)) {
      return dbPath;
    }
    // 相対パスは設定ディレクトリ基準
    return path.join(this.pathResolver.basePath, dbPath);
  }
}
```

### **2. データベース管理統合**

#### **DatabaseManager修正**
```javascript
class DatabaseManager {
  constructor(configManager) {
    this.configManager = configManager;
    this.dbPath = null;
    this.db = null;
  }
  
  async initialize() {
    this.dbPath = this.configManager.getDatabasePath();
    
    // データベースディレクトリ作成
    const dbDir = path.dirname(this.dbPath);
    await fs.promises.mkdir(dbDir, { recursive: true });
    
    // SQLite接続
    this.db = new sqlite3.Database(this.dbPath);
    
    // スキーマ初期化
    await this.initializeSchema();
  }
  
  getDatabasePath() {
    return this.dbPath;
  }
}
```

### **3. メインエントリーポイント統合**

#### **bin/cctop修正**
```javascript
#!/usr/bin/env node

const { parseArguments } = require('../src/cli/argument-parser');
const { StorageInitializer } = require('../src/config/storage-initializer');
const { ConfigManager } = require('../src/config/config-manager');
const { CCTop } = require('../src/cctop');

async function main() {
  try {
    const args = parseArguments(process.argv);
    
    // ヘルプ表示
    if (args.help) {
      showHelp();
      return;
    }
    
    // 初期化モード
    if (args.init) {
      await StorageInitializer.initializeLocal();
      return;
    }
    
    // 設定管理初期化
    const configManager = new ConfigManager(args);
    await configManager.initialize();
    
    // cctop起動
    const cctop = new CCTop(configManager);
    await cctop.start();
    
  } catch (error) {
    if (error.name === 'ConfigurationError') {
      console.error(error.message);
      process.exit(1);
    } else {
      console.error('Unexpected error:', error.message);
      process.exit(1);
    }
  }
}

main();
```

## 🧪 テスト要件

### **基本機能テスト**
- [ ] デフォルト動作（ローカル設定使用）
- [ ] --globalオプションでグローバル設定使用
- [ ] --initオプションでローカル初期化
- [ ] 設定不存在時の適切なエラー表示

### **統合テスト**
- [ ] ローカル・グローバル設定の独立動作
- [ ] .gitignore適切な設定
- [ ] データベースパスの正しい解決

### **実環境テスト**
- [ ] 複数プロジェクトでの独立動作
- [ ] チーム環境での設定共有
- [ ] Git管理での適切なファイル除外

## 🎯 実装優先度

### **Phase 1: 基本システム**
- StoragePathResolverクラス実装
- CLI引数パース拡張
- エラーメッセージ設計

### **Phase 2: 初期化機能**
- --initオプション実装
- .gitignore自動設定
- デフォルト設定生成

### **Phase 3: 既存システム統合**
- ConfigManager統合
- DatabaseManager統合
- メインエントリーポイント修正

## 💡 使用例・シナリオ

### **個人開発者**
```bash
# 個人プロジェクト用設定
cd my-project
cctop
```

### **チーム開発**
```bash
# プロジェクトクローン
git clone team-project
cd team-project

# 既存チーム設定使用
cctop  # .cctop/config.jsonがあれば即座に動作

# 新規プロジェクト設定
git add .cctop/config.json  # チーム設定として共有
```

### **グローバル使用**
```bash
# 複数プロジェクト共通設定
cctop --global
# → ~/.cctop/ 使用・自動作成
```

## 🎯 成功指標

1. **明確性**: 設定場所が常に明確
2. **非侵入性**: 不要なホーム作成なし
3. **チーム親和**: Git管理での設定共有
4. **使いやすさ**: --initで即座にセットアップ

---

**この機能により、cctopは個人・チーム・プロジェクト特化の柔軟な設定管理を実現し、現代的な開発ワークフローに最適化されます。**