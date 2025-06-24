# CCTop 設定仕様

**作成日**: 2025-06-21  
**作成者**: Inspector Agent  
**目的**: CCTopの設定可能項目と設定管理の仕様

## 🔧 設定項目一覧

### 表示設定

#### displayLimit
- **説明**: メイン表示部の表示行数
- **型**: number
- **デフォルト**: 10
- **範囲**: 5-50
- **用途**: 画面サイズに応じて調整可能

#### updateInterval
- **説明**: 自動更新の間隔（ミリ秒）
- **型**: number
- **デフォルト**: 0（即時更新）
- **範囲**: 0-5000
- **用途**: CPU負荷軽減やネットワーク環境に応じて調整

#### timeout
- **説明**: テスト用タイムアウト（ミリ秒）
- **型**: number
- **デフォルト**: null（無効）
- **用途**: 自動テストやデモ用

### フィルタ設定

#### defaultEventFilters
- **説明**: 起動時のイベントフィルタ初期状態
- **型**: object
- **デフォルト**:
  ```javascript
  {
    scan: true,
    create: true,
    modify: true,
    move: true,
    delete: true
  }
  ```
- **用途**: よく使うフィルタ設定を保存

#### excludePatterns
- **説明**: 監視から除外するパスパターン
- **型**: string[]
- **デフォルト**:
  ```javascript
  [
    "node_modules/**",
    ".git/**",
    "*.log",
    ".DS_Store",
    "**/*.tmp"
  ]
  ```
- **用途**: 不要なファイルの除外

## 💾 設定の保存場所

### グローバル設定
- **パス**: `~/.cctoprc`
- **形式**: JSON
- **用途**: ユーザー全体の設定

### プロジェクト設定
- **パス**: `./.cctoprc`
- **形式**: JSON
- **用途**: プロジェクト固有の設定
- **優先度**: グローバル設定より優先

## 📄 設定ファイル形式

### 基本構造
```json
{
  "display": {
    "displayLimit": 20,
    "updateInterval": 100,
    "theme": "default"
  },
  "filters": {
    "defaultEventFilters": {
      "scan": true,
      "create": true,
      "modify": true,
      "move": true,
      "delete": false
    },
    "excludePatterns": [
      "node_modules/**",
      ".git/**",
      "*.log"
    ]
  },
  "database": {
    "path": "./cctop.db",
    "walMode": true
  }
}
```

### スキーマ定義
```javascript
const configSchema = {
  display: {
    displayLimit: {
      type: 'number',
      min: 5,
      max: 50,
      default: 10
    },
    updateInterval: {
      type: 'number',
      min: 0,
      max: 5000,
      default: 0
    },
    theme: {
      type: 'string',
      enum: ['default', 'minimal', 'compact'],
      default: 'default'
    }
  },
  filters: {
    defaultEventFilters: {
      type: 'object',
      properties: {
        scan: { type: 'boolean', default: true },
        create: { type: 'boolean', default: true },
        modify: { type: 'boolean', default: true },
        move: { type: 'boolean', default: true },
        delete: { type: 'boolean', default: true }
      }
    },
    excludePatterns: {
      type: 'array',
      items: { type: 'string' },
      default: []
    }
  }
};
```

## 🔄 設定の読み込み順序

1. **デフォルト設定**（ハードコード）
2. **グローバル設定**（~/.cctoprc）
3. **プロジェクト設定**（./.cctoprc）
4. **コマンドライン引数**（最優先）

```javascript
// 設定のマージロジック
const config = {
  ...defaultConfig,
  ...globalConfig,
  ...projectConfig,
  ...cliConfig
};
```

## 💻 実装ガイドライン

### ConfigLoaderクラス
```javascript
class ConfigLoader {
  constructor() {
    this.defaultConfig = { /* ... */ };
  }
  
  loadConfig(options = {}) {
    const config = { ...this.defaultConfig };
    
    // グローバル設定
    const globalPath = path.join(os.homedir(), '.cctoprc');
    if (fs.existsSync(globalPath)) {
      Object.assign(config, this.loadFile(globalPath));
    }
    
    // プロジェクト設定
    const projectPath = './.cctoprc';
    if (fs.existsSync(projectPath)) {
      Object.assign(config, this.loadFile(projectPath));
    }
    
    // CLI引数
    Object.assign(config, options);
    
    return this.validateConfig(config);
  }
  
  validateConfig(config) {
    // スキーマに基づいた検証
    // 無効な値はデフォルトに置換
    return validatedConfig;
  }
}
```

### 設定の適用
```javascript
// StreamDisplay初期化時
const config = configLoader.loadConfig(cliOptions);
const streamDisplay = new StreamDisplay(dbManager, config);
```

## 🚀 将来の拡張案

### Phase 2
- 設定のホットリロード
- 設定エディタUI（`cctop --config`）
- 設定のエクスポート/インポート
- チーム共有設定

### Phase 3
- 設定プロファイル（開発/本番など）
- 条件付き設定（ディレクトリ別など）
- 設定の暗号化（機密情報保護）
- クラウド同期

---

**注記**: この仕様はCCTopの設定管理システムの詳細です。ユーザーが自分の環境に合わせてツールをカスタマイズできることは、開発者体験の向上に重要です。