# config-manager.ts リファクタリング詳細計画

**作成日**: 2025-06-28  
**計画番号**: PLAN-20250628-009  
**関連**: PLAN-20250628-003（TypeScript移行後リファクタリング総合計画）  
**優先度**: Medium  
**Phase**: Phase 3 - 低成功率ファイル（60%成功見込み）  
**対象ファイル**: `src/config/config-manager.ts` (488行)

## 📋 現状分析

### ファイル概要
- **機能**: FUNC-100 Configuration Management準拠、設定ファイル管理・検証
- **責務**: 設定ロード・保存、バリデーション、デフォルト値管理、設定ファイル監視
- **依存関係**: fs、path、chokidar、JSON schema validation
- **TypeScript状況**: 複雑な型定義、条件分岐多数、ファイルI/O集約

### 現在の責務（詳細分析済み）
1. **設定ファイル読み込み** (~140行): JSON解析、エラーハンドリング、フォールバック処理
2. **設定検証・バリデーション** (~120行): schema検証、型チェック、制約確認
3. **デフォルト値管理** (~100行): デフォルト設定、マージ処理、設定継承
4. **設定ファイル監視・更新** (~80行): chokidar統合、hot reload、変更通知
5. **設定保存・書き込み** (~50行): JSON書き込み、バックアップ、原子的操作

### 分解の困難さ評価
- ⚠️ **複雑な状態管理**: 設定キャッシュ、監視状態、バリデーション状態の相互依存
- ⚠️ **ファイルI/O競合**: 読み込み・書き込み・監視の競合状態リスク
- ⚠️ **型定義の複雑性**: 動的設定項目、条件付き型、深いネスト構造
- ⚠️ **非同期処理の複雑性**: ファイル監視、検証、保存の非同期協調

## 🎯 分解設計

### 分解後の構造（5ファイル）

```typescript
// 1. 設定型定義・バリデーション基盤 (100行程度)
src/config/types/ConfigTypes.ts
export interface CCTopConfig {
  monitoring?: MonitoringConfig;
  display?: DisplayConfig;
  database?: DatabaseConfig;
  interactive?: InteractiveConfig;
  logging?: LoggingConfig;
}

export interface MonitoringConfig {
  enabled?: boolean;
  watchPaths?: string[];
  ignorePatterns?: string[];
  debounceMs?: number;
  maxEvents?: number;
}

export interface DisplayConfig {
  theme?: string;
  colorEnabled?: boolean;
  maxWidth?: number;
  refreshInterval?: number;
  statusLines?: number;
}

export interface DatabaseConfig {
  path?: string;
  maxSize?: number;
  enableWAL?: boolean;
  retentionDays?: number;
}

export interface InteractiveConfig {
  enabled?: boolean;
  keyBindings?: Record<string, string>;
  detailMode?: boolean;
}

export interface LoggingConfig {
  level?: 'debug' | 'info' | 'warn' | 'error';
  file?: string;
  maxSize?: number;
  rotateFiles?: number;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  normalizedConfig?: CCTopConfig;
}

export interface ConfigWatchOptions {
  enabled?: boolean;
  debounceMs?: number;
  ignoreInitial?: boolean;
}

export type ConfigSection = keyof CCTopConfig;
export type ConfigValue = string | number | boolean | object | undefined;

// バリデーションスキーマ定義
export const CONFIG_SCHEMA = {
  type: 'object',
  properties: {
    monitoring: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        watchPaths: { type: 'array', items: { type: 'string' } },
        ignorePatterns: { type: 'array', items: { type: 'string' } },
        debounceMs: { type: 'number', minimum: 0, maximum: 10000 },
        maxEvents: { type: 'number', minimum: 100, maximum: 1000000 }
      }
    },
    display: {
      type: 'object',
      properties: {
        theme: { type: 'string', enum: ['dark', 'light', 'auto'] },
        colorEnabled: { type: 'boolean' },
        maxWidth: { type: 'number', minimum: 40, maximum: 200 },
        refreshInterval: { type: 'number', minimum: 100, maximum: 5000 },
        statusLines: { type: 'number', minimum: 1, maximum: 10 }
      }
    }
    // ... other schema definitions
  }
} as const;

// 2. 設定読み込み・解析 (140行程度)
src/config/loaders/ConfigLoader.ts
export class ConfigLoader {
  private configPath: string;
  private encoding: BufferEncoding = 'utf8';
  private debug: boolean;

  constructor(configPath: string) {
    this.configPath = configPath;
    this.debug = process.env.CCTOP_VERBOSE === 'true';
  }

  async loadConfig(): Promise<CCTopConfig | null> {
    try {
      const exists = await this.configFileExists();
      if (!exists) {
        if (this.debug) {
          console.log('[ConfigLoader] Config file not found, using defaults');
        }
        return null;
      }

      const content = await this.readConfigFile();
      if (!content) {
        console.warn('[ConfigLoader] Empty config file');
        return null;
      }

      const parsed = await this.parseConfigContent(content);
      return parsed;
    } catch (error) {
      console.error('[ConfigLoader] Failed to load config:', error);
      throw new Error(`Config loading failed: ${error.message}`);
    }
  }

  async reloadConfig(): Promise<CCTopConfig | null> {
    if (this.debug) {
      console.log('[ConfigLoader] Reloading config from:', this.configPath);
    }
    return await this.loadConfig();
  }

  private async configFileExists(): Promise<boolean> {
    try {
      const fs = await import('fs/promises');
      await fs.access(this.configPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async readConfigFile(): Promise<string | null> {
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(this.configPath, this.encoding);
      
      if (this.debug) {
        console.log(`[ConfigLoader] Read ${content.length} characters from config`);
      }
      
      return content.trim() || null;
    } catch (error) {
      throw new Error(`Failed to read config file: ${error.message}`);
    }
  }

  private async parseConfigContent(content: string): Promise<CCTopConfig> {
    try {
      // Remove comments and clean JSON
      const cleanContent = this.removeJsonComments(content);
      const parsed = JSON.parse(cleanContent);
      
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Config must be a JSON object');
      }

      if (this.debug) {
        console.log('[ConfigLoader] Successfully parsed config with keys:', 
          Object.keys(parsed));
      }

      return parsed as CCTopConfig;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in config file: ${error.message}`);
      }
      throw error;
    }
  }

  private removeJsonComments(content: string): string {
    // Remove single-line comments (// comments)
    const withoutLineComments = content.replace(/\/\/.*$/gm, '');
    
    // Remove multi-line comments (/* comments */)
    const withoutBlockComments = withoutLineComments.replace(/\/\*[\s\S]*?\*\//g, '');
    
    return withoutBlockComments;
  }

  // Error recovery and fallback handling
  async createDefaultConfig(): Promise<void> {
    const defaultConfig: CCTopConfig = {
      monitoring: {
        enabled: true,
        watchPaths: ['.'],
        ignorePatterns: ['node_modules/**', '.git/**'],
        debounceMs: 100,
        maxEvents: 10000
      },
      display: {
        theme: 'auto',
        colorEnabled: true,
        maxWidth: 120,
        refreshInterval: 1000,
        statusLines: 3
      },
      database: {
        path: './.cctop/events.db',
        maxSize: 100 * 1024 * 1024, // 100MB
        enableWAL: true,
        retentionDays: 30
      }
    };

    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Ensure directory exists
      const configDir = path.dirname(this.configPath);
      await fs.mkdir(configDir, { recursive: true });
      
      // Write default config
      const content = JSON.stringify(defaultConfig, null, 2);
      await fs.writeFile(this.configPath, content, this.encoding);
      
      console.log('[ConfigLoader] Created default config file:', this.configPath);
    } catch (error) {
      throw new Error(`Failed to create default config: ${error.message}`);
    }
  }

  getConfigPath(): string {
    return this.configPath;
  }
}

// 3. 設定検証・バリデーション (120行程度)
src/config/validators/ConfigValidator.ts
export class ConfigValidator {
  private schema: typeof CONFIG_SCHEMA;
  private debug: boolean;

  constructor() {
    this.schema = CONFIG_SCHEMA;
    this.debug = process.env.CCTOP_VERBOSE === 'true';
  }

  validateConfig(config: any): ConfigValidationResult {
    if (!config || typeof config !== 'object') {
      return {
        valid: false,
        errors: ['Config must be a non-null object'],
        warnings: []
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Schema validation
      const schemaErrors = this.validateAgainstSchema(config);
      errors.push(...schemaErrors);

      // Custom validation rules
      const customErrors = this.validateCustomRules(config);
      errors.push(...customErrors);

      // Generate warnings for deprecated/unusual configurations
      const configWarnings = this.generateWarnings(config);
      warnings.push(...configWarnings);

      // Normalize and sanitize config
      const normalizedConfig = this.normalizeConfig(config);

      const result: ConfigValidationResult = {
        valid: errors.length === 0,
        errors,
        warnings,
        normalizedConfig: errors.length === 0 ? normalizedConfig : undefined
      };

      if (this.debug) {
        console.log('[ConfigValidator] Validation result:', {
          valid: result.valid,
          errorCount: errors.length,
          warningCount: warnings.length
        });
      }

      return result;
    } catch (error) {
      return {
        valid: false,
        errors: [`Validation failed: ${error.message}`],
        warnings: []
      };
    }
  }

  private validateAgainstSchema(config: any): string[] {
    const errors: string[] = [];

    // Basic type checking for each section
    if (config.monitoring && typeof config.monitoring !== 'object') {
      errors.push('monitoring must be an object');
    }

    if (config.display && typeof config.display !== 'object') {
      errors.push('display must be an object');
    }

    // Validate specific fields
    if (config.monitoring) {
      const mon = config.monitoring;
      
      if (mon.debounceMs !== undefined && 
          (typeof mon.debounceMs !== 'number' || mon.debounceMs < 0 || mon.debounceMs > 10000)) {
        errors.push('monitoring.debounceMs must be a number between 0 and 10000');
      }

      if (mon.watchPaths !== undefined && !Array.isArray(mon.watchPaths)) {
        errors.push('monitoring.watchPaths must be an array');
      }
    }

    if (config.display) {
      const disp = config.display;
      
      if (disp.theme !== undefined && 
          !['dark', 'light', 'auto'].includes(disp.theme)) {
        errors.push('display.theme must be one of: dark, light, auto');
      }

      if (disp.maxWidth !== undefined && 
          (typeof disp.maxWidth !== 'number' || disp.maxWidth < 40 || disp.maxWidth > 200)) {
        errors.push('display.maxWidth must be a number between 40 and 200');
      }
    }

    return errors;
  }

  private validateCustomRules(config: any): string[] {
    const errors: string[] = [];

    // Cross-field validation
    if (config.database?.path && config.monitoring?.watchPaths) {
      const dbPath = config.database.path;
      const watchPaths = config.monitoring.watchPaths;
      
      // Warn if database path is in watch paths (potential recursion)
      const path = require('path');
      const dbDir = path.dirname(dbPath);
      
      for (const watchPath of watchPaths) {
        if (dbDir.startsWith(watchPath) || watchPath.startsWith(dbDir)) {
          errors.push(`Database path ${dbPath} overlaps with watch path ${watchPath}`);
        }
      }
    }

    // Resource limit validation
    if (config.database?.maxSize && config.database.maxSize > 1024 * 1024 * 1024) {
      errors.push('database.maxSize should not exceed 1GB for performance reasons');
    }

    return errors;
  }

  private generateWarnings(config: any): string[] {
    const warnings: string[] = [];

    // Performance warnings
    if (config.monitoring?.debounceMs && config.monitoring.debounceMs < 50) {
      warnings.push('Very low debounceMs may impact performance');
    }

    if (config.display?.refreshInterval && config.display.refreshInterval < 100) {
      warnings.push('Very low refreshInterval may impact performance');
    }

    // Security/privacy warnings
    if (config.logging?.level === 'debug') {
      warnings.push('Debug logging may expose sensitive information');
    }

    return warnings;
  }

  private normalizeConfig(config: any): CCTopConfig {
    // Deep clone to avoid mutations
    const normalized = JSON.parse(JSON.stringify(config));

    // Normalize paths
    if (normalized.database?.path) {
      const path = require('path');
      normalized.database.path = path.resolve(normalized.database.path);
    }

    // Ensure arrays are arrays
    if (normalized.monitoring?.watchPaths && !Array.isArray(normalized.monitoring.watchPaths)) {
      normalized.monitoring.watchPaths = [normalized.monitoring.watchPaths];
    }

    return normalized;
  }

  // Helper for specific validations
  validateSection(section: ConfigSection, value: any): string[] {
    const tempConfig = { [section]: value };
    const result = this.validateConfig(tempConfig);
    return result.errors;
  }
}

// 4. デフォルト値管理・マージ (100行程度)
src/config/defaults/DefaultConfigManager.ts
export class DefaultConfigManager {
  private defaults: CCTopConfig;
  private debug: boolean;

  constructor() {
    this.debug = process.env.CCTOP_VERBOSE === 'true';
    this.defaults = this.createDefaults();
  }

  private createDefaults(): CCTopConfig {
    return {
      monitoring: {
        enabled: true,
        watchPaths: [process.cwd()],
        ignorePatterns: [
          'node_modules/**',
          '.git/**',
          '**/*.log',
          '**/.*',
          '**/.DS_Store',
          '**/Thumbs.db'
        ],
        debounceMs: 100,
        maxEvents: 10000
      },
      display: {
        theme: 'auto',
        colorEnabled: true,
        maxWidth: Math.min(120, process.stdout.columns || 80),
        refreshInterval: 1000,
        statusLines: 3
      },
      database: {
        path: './.cctop/events.db',
        maxSize: 100 * 1024 * 1024, // 100MB
        enableWAL: true,
        retentionDays: 30
      },
      interactive: {
        enabled: true,
        keyBindings: {
          'q': 'quit',
          'Escape': 'exit-detail',
          'Enter': 'detail-mode',
          'ArrowUp': 'scroll-up',
          'ArrowDown': 'scroll-down'
        },
        detailMode: true
      },
      logging: {
        level: 'info',
        file: './.cctop/logs/cctop.log',
        maxSize: 10 * 1024 * 1024, // 10MB
        rotateFiles: 3
      }
    };
  }

  getDefaults(): CCTopConfig {
    return JSON.parse(JSON.stringify(this.defaults));
  }

  mergeWithDefaults(userConfig: Partial<CCTopConfig>): CCTopConfig {
    if (!userConfig) {
      return this.getDefaults();
    }

    const merged = this.deepMerge(this.getDefaults(), userConfig);
    
    if (this.debug) {
      console.log('[DefaultConfigManager] Merged config with defaults');
    }

    return merged;
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] !== undefined) {
        if (this.isObject(source[key]) && this.isObject(target[key])) {
          result[key] = this.deepMerge(target[key], source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  // Environment override support
  applyEnvironmentOverrides(config: CCTopConfig): CCTopConfig {
    const overridden = { ...config };

    // Apply environment variables
    if (process.env.CCTOP_THEME) {
      if (!overridden.display) overridden.display = {};
      overridden.display.theme = process.env.CCTOP_THEME as any;
    }

    if (process.env.CCTOP_COLOR === 'false') {
      if (!overridden.display) overridden.display = {};
      overridden.display.colorEnabled = false;
    }

    if (process.env.CCTOP_DB_PATH) {
      if (!overridden.database) overridden.database = {};
      overridden.database.path = process.env.CCTOP_DB_PATH;
    }

    if (process.env.CCTOP_LOG_LEVEL) {
      if (!overridden.logging) overridden.logging = {};
      overridden.logging.level = process.env.CCTOP_LOG_LEVEL as any;
    }

    if (this.debug) {
      console.log('[DefaultConfigManager] Applied environment overrides');
    }

    return overridden;
  }

  // Specific defaults for different contexts
  getMinimalDefaults(): CCTopConfig {
    return {
      monitoring: {
        enabled: true,
        watchPaths: ['.'],
        ignorePatterns: ['node_modules/**'],
        debounceMs: 100,
        maxEvents: 1000
      },
      display: {
        theme: 'auto',
        colorEnabled: true,
        maxWidth: 80,
        refreshInterval: 1000,
        statusLines: 1
      }
    };
  }

  validateDefaults(): boolean {
    try {
      const validator = new ConfigValidator();
      const result = validator.validateConfig(this.defaults);
      return result.valid;
    } catch (error) {
      console.error('[DefaultConfigManager] Default validation failed:', error);
      return false;
    }
  }
}

// 5. 統合設定管理・監視 (130行程度)
src/config/ConfigManager.ts
export class ConfigManager {
  private configLoader: ConfigLoader;
  private configValidator: ConfigValidator;
  private defaultManager: DefaultConfigManager;
  private currentConfig: CCTopConfig | null = null;
  private watcher: any = null; // chokidar.FSWatcher
  private eventEmitter: any; // EventEmitter for config changes

  constructor(configPath: string = './.cctop/config.json') {
    this.configLoader = new ConfigLoader(configPath);
    this.configValidator = new ConfigValidator();
    this.defaultManager = new DefaultConfigManager();
    
    // Initialize event emitter for config change notifications
    const { EventEmitter } = require('events');
    this.eventEmitter = new EventEmitter();
  }

  // 既存API完全互換
  async loadConfig(): Promise<CCTopConfig> {
    try {
      // Load user config
      const userConfig = await this.configLoader.loadConfig();
      
      // Merge with defaults
      const baseConfig = userConfig ? 
        this.defaultManager.mergeWithDefaults(userConfig) :
        this.defaultManager.getDefaults();
      
      // Apply environment overrides
      const finalConfig = this.defaultManager.applyEnvironmentOverrides(baseConfig);
      
      // Validate final configuration
      const validation = this.configValidator.validateConfig(finalConfig);
      
      if (!validation.valid) {
        console.warn('[ConfigManager] Config validation warnings:', validation.errors);
        // Use normalized config if available, otherwise fall back to defaults
        this.currentConfig = validation.normalizedConfig || this.defaultManager.getDefaults();
      } else {
        this.currentConfig = validation.normalizedConfig || finalConfig;
      }

      // Emit config loaded event
      this.eventEmitter.emit('configLoaded', this.currentConfig);
      
      return this.currentConfig;
    } catch (error) {
      console.error('[ConfigManager] Failed to load config, using defaults:', error);
      this.currentConfig = this.defaultManager.getDefaults();
      return this.currentConfig;
    }
  }

  getCurrentConfig(): CCTopConfig | null {
    return this.currentConfig;
  }

  async saveConfig(config: CCTopConfig): Promise<void> {
    // Validate before saving
    const validation = this.configValidator.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Cannot save invalid config: ${validation.errors.join(', ')}`);
    }

    try {
      const fs = await import('fs/promises');
      const path = require('path');
      
      const configPath = this.configLoader.getConfigPath();
      const configDir = path.dirname(configPath);
      
      // Ensure directory exists
      await fs.mkdir(configDir, { recursive: true });
      
      // Atomic write with backup
      const tempPath = `${configPath}.tmp`;
      const backupPath = `${configPath}.backup`;
      
      // Create backup if config exists
      try {
        await fs.access(configPath);
        await fs.copyFile(configPath, backupPath);
      } catch (error) {
        // No existing config to backup
      }
      
      // Write to temp file first
      const content = JSON.stringify(config, null, 2);
      await fs.writeFile(tempPath, content, 'utf8');
      
      // Atomic rename
      await fs.rename(tempPath, configPath);
      
      // Update current config
      this.currentConfig = config;
      
      // Emit config saved event
      this.eventEmitter.emit('configSaved', config);
      
    } catch (error) {
      throw new Error(`Failed to save config: ${error.message}`);
    }
  }

  startWatching(options: ConfigWatchOptions = {}): void {
    if (this.watcher) {
      return; // Already watching
    }

    try {
      const chokidar = require('chokidar');
      const configPath = this.configLoader.getConfigPath();
      
      this.watcher = chokidar.watch(configPath, {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
        ignoreInitial: options.ignoreInitial !== false
      });

      let debounceTimeout: NodeJS.Timeout | null = null;
      const debounceMs = options.debounceMs || 500;

      this.watcher.on('change', () => {
        if (debounceTimeout) {
          clearTimeout(debounceTimeout);
        }
        
        debounceTimeout = setTimeout(async () => {
          try {
            console.log('[ConfigManager] Config file changed, reloading...');
            const newConfig = await this.loadConfig();
            this.eventEmitter.emit('configChanged', newConfig);
          } catch (error) {
            console.error('[ConfigManager] Failed to reload config:', error);
            this.eventEmitter.emit('configError', error);
          }
        }, debounceMs);
      });

      this.watcher.on('error', (error: any) => {
        console.error('[ConfigManager] Config watcher error:', error);
        this.eventEmitter.emit('configError', error);
      });

    } catch (error) {
      console.error('[ConfigManager] Failed to start config watcher:', error);
    }
  }

  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  // Event subscription for config changes
  onConfigChange(callback: (config: CCTopConfig) => void): void {
    this.eventEmitter.on('configChanged', callback);
  }

  onConfigError(callback: (error: Error) => void): void {
    this.eventEmitter.on('configError', callback);
  }

  // Utility methods
  get<T = any>(keyPath: string): T | undefined {
    if (!this.currentConfig) {
      return undefined;
    }

    const keys = keyPath.split('.');
    let value: any = this.currentConfig;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    return value as T;
  }

  async createDefaultConfigFile(): Promise<void> {
    await this.configLoader.createDefaultConfig();
  }

  cleanup(): void {
    this.stopWatching();
    this.eventEmitter.removeAllListeners();
  }

  // Status and debugging
  getManagerStatus(): object {
    return {
      hasConfig: !!this.currentConfig,
      configPath: this.configLoader.getConfigPath(),
      watching: !!this.watcher,
      listenerCount: this.eventEmitter.listenerCount('configChanged')
    };
  }
}
```

## 📅 実装スケジュール（余裕バッファ含む）

### Week 6: config-manager.ts分解 (8-10日)

#### **Day 1**: 型定義・スキーマ基盤整備
- ConfigTypes.ts作成・複雑な型定義統合
- CONFIG_SCHEMA定義・バリデーションルール設定
- **予期しない課題**: 型継承・条件付き型の複雑化 (+1日)

#### **Day 2**: 設定読み込みクラス実装
- ConfigLoader.ts実装・JSON解析・エラーハンドリング
- コメント除去・ファイル存在確認
- **予期しない課題**: ファイルI/O競合状態 (+0.5日)

#### **Day 3**: バリデーションクラス実装
- ConfigValidator.ts実装・schema検証・カスタムルール
- クロスフィールド検証・警告生成
- **予期しない課題**: 複雑な検証ロジックの実装 (+1日)

#### **Day 4**: デフォルト値管理実装
- DefaultConfigManager.ts実装・マージロジック
- 環境変数オーバーライド・最小構成対応
- **予期しない課題**: 深いマージの複雑化 (+0.5日)

#### **Day 5**: 統合管理クラス実装
- ConfigManager.ts実装・chokidar統合・イベント管理
- 原子的保存・バックアップ機能
- **予期しない課題**: ファイル監視の不安定性 (+1日)

#### **Day 6**: 統合テスト・ファイルI/O安定性確認
- 全機能統合テスト・競合状態テスト
- 設定変更の動的反映確認
- **予期しない課題**: ファイル監視イベントの重複 (+1日)

#### **Day 7-8**: 信頼性テスト・品質確認
- 長時間稼働での設定監視安定性
- 大量設定変更の負荷テスト
- **予期しない課題**: メモリリーク・性能問題 (+1日)

#### **Day 9-10**: バッファ・ドキュメント化
- 品質問題への対応
- 複雑な設定例の作成
- ドキュメント更新

## ⚠️ 想定される課題と対策

### 技術的課題

#### 1. **ファイルI/O競合状態** (発生確率: 60%)
- **課題**: 読み込み・書き込み・監視の競合、原子性保証困難
- **対策**: ファイルロック機構、原子的書き込み、リトライ処理
- **代替案**: インメモリ設定キャッシュの強化

#### 2. **chokidar監視の不安定性** (発生確率: 50%)
- **課題**: ファイル監視イベントの重複・欠損、プラットフォーム依存
- **対策**: debounce処理、エラーハンドリング強化、フォールバック機構
- **代替案**: ポーリングベース監視への変更

#### 3. **複雑な型定義の管理困難** (発生確率: 45%)
- **課題**: 動的設定項目、条件付き型、深いネスト構造の型安全性
- **対策**: 段階的型定義、型ガード関数、実行時型チェック
- **代替案**: any型の限定的使用

### 実装上の課題

#### 4. **設定検証の複雑化** (発生確率: 40%)
- **課題**: クロスフィールド検証、複雑な制約条件の実装
- **対策**: モジュラー検証ルール、段階的検証
- **代替案**: 基本検証のみの簡略化

#### 5. **エラーハンドリングの一貫性** (発生確率: 35%)
- **課題**: 異なる段階でのエラー処理の統一
- **対策**: 統一的なエラークラス、エラー分類
- **代替案**: try-catch の簡易実装

## 🔍 品質保証計画

### TypeScript品質チェック
- `tsc --noEmit` 完全パス
- 複雑な型定義の整合性確認
- 条件付き型・ユニオン型の適切な使用確認

### 機能品質チェック
- 既存テスト全パス（100%必須）
- 設定ファイル監視の長時間安定性テスト
- 原子的保存の信頼性確認
- 設定検証の網羅性確認

### 性能品質チェック
- 設定読み込み時間（±15%以内）
- ファイル監視のCPU使用率確認
- メモリ使用量監視（リーク検出）

## 📈 期待効果

### 開発効率向上
- **設定機能追加**: 30-50%効率化（モジュラー設計）
- **バリデーション修正**: 40-60%効率化（ConfigValidator独立）
- **設定監視デバッグ**: 50-70%効率化（問題箇所特定容易）

### 保守性向上
- **単体テスト**: 各コンポーネントの独立テスト可能
- **設定スキーマ**: 新しい設定項目追加容易
- **エラー解析**: 問題箇所の特定時間短縮

## ✅ 完了条件

- [ ] 5つの新クラス全てがTypeScript strict mode準拠
- [ ] 既存ConfigManager APIの100%互換性維持
- [ ] ファイルI/O操作の安全性確認（競合状態なし）
- [ ] 設定ファイル監視の安定性確認
- [ ] 設定検証の正確性確認
- [ ] 既存テストスイート全パス
- [ ] 新規単体テスト80%カバレッジ達成

## 🔄 ロールバック計画

### ロールバック条件
- ファイルI/O競合問題が3日以上継続
- chokidar監視の安定性問題が解決困難
- 設定検証の正確性に重大な問題

### ロールバック手順
1. 元の config-manager.ts に戻す
2. 新規作成ファイルの削除
3. import文の復元
4. 設定読み込み・監視機能の動作確認

---

**次のステップ**: ProcessManager.ts完了後実行開始  
**所要時間**: 8-10日（バッファ含む）  
**成功確率**: 60%（複雑性が高く、ファイルI/O競合に注意）