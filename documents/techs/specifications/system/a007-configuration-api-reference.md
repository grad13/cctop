# s002: Configuration System API Reference

**作成日**: 2025-06-22 12:20  
**作成者**: Architect Agent  
**対象**: 設定システムの公開API仕様  
**バージョン**: 1.0.0

## 📋 概要

本ドキュメントは、cctop設定システムの全APIを網羅的に定義する。各モジュールの公開メソッド、パラメータ、戻り値、エラー、使用例を含む。

## 📦 モジュール一覧

```javascript
// CommonJS形式でのインポート
const { ConfigManager } = require('./config/config-manager');
const { ConfigLoader } = require('./config/config-loader');
const { ConfigMerger, deepMerge } = require('./config/config-merger');
const { getDefaults, expandPath } = require('./config/defaults');
```

## 🔧 ConfigManager API

### クラス: ConfigManager

設定の中央管理を行うメインクラス。EventEmitterを継承。

#### コンストラクタ
```javascript
new ConfigManager()
```
設定マネージャーの新しいインスタンスを作成。

**例:**
```javascript
const configManager = new ConfigManager();
```

#### メソッド

##### `async load(options)`
設定を階層的に読み込み、マージして返す。

**パラメータ:**
| 名前 | 型 | 必須 | 説明 |
|------|----|----|------|
| options | Object | No | 読み込みオプション |
| options.configPath | string | No | 設定ファイルパス |
| options.profile | string | No | プロファイル名 |
| options.cliOptions | Object | No | CLI引数オブジェクト |

**戻り値:** `Promise<Object>` - マージされた設定オブジェクト

**エラー:**
- `ConfigLoadError` - 設定ファイルの読み込み失敗
- `ValidationError` - 設定値の検証エラー

**例:**
```javascript
const config = await configManager.load({
  configPath: './config.json',
  profile: 'development',
  cliOptions: {
    'display.maxLines': 100
  }
});
```

##### `get(keyPath, defaultValue)`
ドット記法で設定値を取得。

**パラメータ:**
| 名前 | 型 | 必須 | 説明 |
|------|----|----|------|
| keyPath | string | Yes | ドット区切りのキーパス |
| defaultValue | any | No | デフォルト値 |

**戻り値:** `any` - 設定値またはデフォルト値

**例:**
```javascript
const timeout = configManager.get('database.timeout', 5000);
const watchPaths = configManager.get('monitoring.watchPaths', ['.']);
```

##### `set(keyPath, value, layer)`
設定値を更新し、変更イベントを発行。

**パラメータ:**
| 名前 | 型 | 必須 | 説明 |
|------|----|----|------|
| keyPath | string | Yes | ドット区切りのキーパス |
| value | any | Yes | 設定する値 |
| layer | string | No | 設定層（default: 'runtime'） |

**戻り値:** `void`

**イベント:** `changed` イベントを発行

**例:**
```javascript
configManager.set('display.maxLines', 200);
configManager.set('monitoring.debounceMs', 50, 'user');
```

##### `getAll()`
全設定を取得。

**戻り値:** `Object` - 完全な設定オブジェクト

**例:**
```javascript
const fullConfig = configManager.getAll();
console.log(JSON.stringify(fullConfig, null, 2));
```

##### `watch(keyPath, callback)`
設定値の変更を監視。

**パラメータ:**
| 名前 | 型 | 必須 | 説明 |
|------|----|----|------|
| keyPath | string | Yes | 監視するキーパス |
| callback | Function | Yes | 変更時のコールバック |

**コールバック引数:**
- `newValue` - 新しい値
- `oldValue` - 古い値
- `keyPath` - 変更されたキーパス

**戻り値:** `Function` - 監視解除関数

**例:**
```javascript
const unwatch = configManager.watch('cache.eventTypeCache.maxSize', 
  (newValue, oldValue) => {
    console.log(`Cache size changed: ${oldValue} -> ${newValue}`);
  }
);

// 監視を解除
unwatch();
```

##### `async reload()`
設定を再読み込み。

**戻り値:** `Promise<Object>` - 新しい設定

**イベント:** `reloaded` イベントを発行

**例:**
```javascript
await configManager.reload();
```

#### イベント

##### `loaded`
初回設定読み込み完了時に発行。

```javascript
configManager.on('loaded', (config) => {
  console.log('Configuration loaded:', config);
});
```

##### `changed`
設定値変更時に発行。

```javascript
configManager.on('changed', (keyPath, newValue, oldValue) => {
  console.log(`${keyPath}: ${oldValue} -> ${newValue}`);
});
```

##### `reloaded`
設定再読み込み時に発行。

```javascript
configManager.on('reloaded', (config) => {
  console.log('Configuration reloaded');
});
```

##### `error`
エラー発生時に発行。

```javascript
configManager.on('error', (error) => {
  console.error('Configuration error:', error);
});
```

## 📂 ConfigLoader API

### クラス: ConfigLoader

設定ファイルの読み込みとキャッシュ管理。

#### コンストラクタ
```javascript
new ConfigLoader()
```

#### メソッド

##### `async loadConfigFile(filePath, options)`
設定ファイルを読み込む。

**パラメータ:**
| 名前 | 型 | 必須 | 説明 |
|------|----|----|------|
| filePath | string | Yes | ファイルパス |
| options | Object | No | 読み込みオプション |
| options.throwOnError | boolean | No | エラー時に例外を投げる（default: true） |
| options.expandPaths | boolean | No | パス展開を実行（default: true） |

**戻り値:** `Promise<Object>` - 設定オブジェクト

**サポート形式:**
- `.json` - JSONファイル（コメント対応）
- `.js` - CommonJSモジュール

**例:**
```javascript
const loader = new ConfigLoader();
const config = await loader.loadConfigFile('./config.json');
```

##### `async loadProfile(profileName, profilesDir)`
プロファイル設定を読み込む（継承対応）。

**パラメータ:**
| 名前 | 型 | 必須 | 説明 |
|------|----|----|------|
| profileName | string | Yes | プロファイル名 |
| profilesDir | string | Yes | プロファイルディレクトリ |

**戻り値:** `Promise<Object>` - マージされたプロファイル設定

**例:**
```javascript
const profile = await loader.loadProfile('development', '~/.cctop/profiles');
```

##### `async findConfigFiles(configName, searchPaths)`
標準的な場所で設定ファイルを検索。

**パラメータ:**
| 名前 | 型 | 必須 | 説明 |
|------|----|----|------|
| configName | string | Yes | 設定ファイル名 |
| searchPaths | string[] | No | 検索パス配列 |

**デフォルト検索パス:**
1. `process.cwd()`
2. `~/.cctop`
3. `~/.config/cctop`
4. `/etc/cctop`

**戻り値:** `Promise<string[]>` - 見つかったファイルパス

**例:**
```javascript
const files = await loader.findConfigFiles('config.json');
// ['/home/user/.cctop/config.json', '/etc/cctop/config.json']
```

## 🔀 ConfigMerger API

### クラス: ConfigMerger

高度な設定マージ機能。

#### コンストラクタ
```javascript
new ConfigMerger(options)
```

**パラメータ:**
| 名前 | 型 | 必須 | 説明 |
|------|----|----|------|
| options | Object | No | マージオプション |
| options.arrayStrategy | string | No | デフォルト配列戦略 |
| options.preserveTypes | boolean | No | 型を保持（default: false） |

#### メソッド

##### `merge(...configs)`
複数の設定オブジェクトをマージ。

**パラメータ:**
- `configs` - マージする設定オブジェクト（可変長引数）

**戻り値:** `Object` - マージ結果

**例:**
```javascript
const merger = new ConfigMerger();
const result = merger.merge(defaults, userConfig, cliConfig);
```

##### `addCustomRule(path, rule)`
カスタムマージルールを追加。

**パラメータ:**
| 名前 | 型 | 必須 | 説明 |
|------|----|----|------|
| path | string | Yes | 適用するパス |
| rule | Function | Yes | マージ関数 |

**ルール関数シグネチャ:**
```javascript
(targetValue, sourceValue, path) => mergedValue
```

**例:**
```javascript
merger.addCustomRule('display.theme', (target, source) => {
  // テーマ名の検証
  const validThemes = ['default', 'dark', 'light'];
  return validThemes.includes(source) ? source : target;
});
```

### 配列マージ戦略

##### `replace` (デフォルト)
ソース配列で完全置換。
```javascript
merge([1, 2], [3, 4]) // [3, 4]
```

##### `append`
ソース配列を末尾に追加。
```javascript
merge([1, 2], [3, 4]) // [1, 2, 3, 4]
```

##### `prepend`
ソース配列を先頭に追加。
```javascript
merge([1, 2], [3, 4]) // [3, 4, 1, 2]
```

##### `merge`
インデックスごとにマージ。
```javascript
merge([{a:1}, {b:2}], [{a:3}, {c:4}]) // [{a:3}, {b:2, c:4}]
```

##### `unique`
重複を除去（順序変更あり）。
```javascript
merge([1, 2, 3], [2, 3, 4]) // [1, 2, 3, 4]
```

##### `concat-unique`
重複を除去（順序保持）。
```javascript
merge([1, 2, 3], [2, 4, 5]) // [1, 2, 3, 4, 5]
```

### ユーティリティ関数

##### `deepMerge(target, source, options)`
深いマージのスタンドアロン関数。

**例:**
```javascript
const { deepMerge } = require('./config/config-merger');
const merged = deepMerge(obj1, obj2, { arrayStrategy: 'append' });
```

## 🏠 defaults API

### 関数

##### `getDefaults(environment)`
環境に応じたデフォルト設定を取得。

**パラメータ:**
| 名前 | 型 | 必須 | 説明 |
|------|----|----|------|
| environment | string | No | 環境名（default: NODE_ENV） |

**戻り値:** `Object` - デフォルト設定

**例:**
```javascript
const defaults = getDefaults('production');
```

##### `expandPath(path)`
チルダパスをホームディレクトリに展開。

**パラメータ:**
| 名前 | 型 | 必須 | 説明 |
|------|----|----|------|
| path | string | Yes | 展開するパス |

**戻り値:** `string` - 展開されたパス

**例:**
```javascript
const fullPath = expandPath('~/.cctop/config.json');
// '/home/username/.cctop/config.json'
```

##### `validateDefaults(config)`
設定の基本検証を実行。

**パラメータ:**
| 名前 | 型 | 必須 | 説明 |
|------|----|----|------|
| config | Object | Yes | 検証する設定 |

**戻り値:** `Object` - `{valid: boolean, errors: string[]}`

**例:**
```javascript
const result = validateDefaults(config);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

## 🚨 エラー処理

### エラークラス

```javascript
class ConfigError extends Error {
  constructor(message, code, details) {
    super(message);
    this.name = 'ConfigError';
    this.code = code;
    this.details = details;
  }
}
```

### エラーコード

| コード | 説明 | 対処法 |
|--------|------|--------|
| `LOAD_FAILED` | ファイル読み込み失敗 | ファイルパスを確認 |
| `PARSE_ERROR` | JSON/JSパースエラー | ファイル形式を確認 |
| `VALIDATION_ERROR` | 設定値検証エラー | エラー詳細を確認 |
| `MERGE_CONFLICT` | マージ競合 | カスタムルールを定義 |
| `PROFILE_NOT_FOUND` | プロファイル未検出 | プロファイル名を確認 |

## 📝 完全な使用例

```javascript
const { ConfigManager } = require('./config/config-manager');

async function setupApplication() {
  // 1. ConfigManager初期化
  const configManager = new ConfigManager();
  
  try {
    // 2. 設定読み込み
    const config = await configManager.load({
      configPath: process.env.CONFIG_PATH,
      profile: process.env.NODE_ENV,
      cliOptions: {
        'display.maxLines': 100,
        'monitoring.watchPaths': ['./src', './test']
      }
    });
    
    // 3. 設定値の取得
    const dbPath = configManager.get('database.path');
    const cacheSize = configManager.get('cache.eventTypeCache.maxSize');
    
    // 4. 動的設定変更の監視
    configManager.watch('monitoring.excludePatterns', (newPatterns) => {
      console.log('Exclude patterns updated:', newPatterns);
      updateFileWatcher(newPatterns);
    });
    
    // 5. エラーハンドリング
    configManager.on('error', (error) => {
      console.error('Configuration error:', error);
      if (error.code === 'VALIDATION_ERROR') {
        process.exit(1);
      }
    });
    
    // 6. アプリケーション初期化
    return initializeApp(config);
    
  } catch (error) {
    console.error('Failed to load configuration:', error);
    process.exit(1);
  }
}
```

---

**バージョン**: 1.0.0  
**最終更新**: 2025-06-22