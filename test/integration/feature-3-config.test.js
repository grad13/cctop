/**
 * Feature 3 Test: 設定システム
 * Data-Driven Testing + 動作確認中心のアプローチ
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const ConfigManager = require('../../dist/src/config/config-manager');

// テストフィクスチャとコントラクトのインポート
const { configScenarios } = require('../fixtures/config-scenarios');
const { PathHandlingContract, validateContract } = require('../contracts/path-handling.contract');

describe('Feature 3: 設定システム', () => {
  let tempConfigDir;
  let configManager;
  let originalConfigPath;

  beforeEach(() => {
    // テスト用の一時設定ディレクトリ
    tempConfigDir = path.join(os.tmpdir(), `test-cctop-config-${Date.now()}`);
    fs.mkdirSync(tempConfigDir, { recursive: true });
    configManager = new ConfigManager();
    
    // ~/.cctop/config.jsonのバックアップ
    originalConfigPath = path.join(os.homedir(), '.cctop', 'config.json');
    if (fs.existsSync(originalConfigPath)) {
      fs.renameSync(originalConfigPath, originalConfigPath + '.backup');
    }
  });

  afterEach(() => {
    // テスト用ディレクトリのクリーンアップ
    if (fs.existsSync(tempConfigDir)) {
      fs.rmSync(tempConfigDir, { recursive: true, force: true });
    }
    
    // ~/.cctop/config.jsonの復元
    if (fs.existsSync(originalConfigPath + '.backup')) {
      fs.renameSync(originalConfigPath + '.backup', originalConfigPath);
    } else if (fs.existsSync(originalConfigPath)) {
      fs.unlinkSync(originalConfigPath);
    }
    
  });

  /**
   * データ駆動型テスト - 各シナリオを実行
   */
  configScenarios.forEach(scenario => {
    test(`Scenario: ${scenario.name}`, async () => {
      let context = {};
      
      // Setup
      if (scenario.setup) {
        context = await scenario.setup(tempConfigDir) || {};
      }
      
      try {
        // Initialize with scenario input
        let config;
        if (scenario.input.userConfig) {
          // ユーザー設定がある場合は、一時ファイルに書き込む
          const configPath = path.join(tempConfigDir, 'scenario-config.json');
          fs.writeFileSync(configPath, JSON.stringify(scenario.input.userConfig, null, 2));
          config = await configManager.initialize({ config: configPath });
        } else if (scenario.input.args) {
          // コマンドライン引数の場合
          const configPath = context.customConfigPath || scenario.input.args[1];
          config = await configManager.initialize({ config: configPath });
        } else {
          // デフォルト設定
          config = await configManager.initialize();
        }
        
        // Verify behavior
        scenario.verifyBehavior(configManager);
        
        // Verify structure if defined
        if (scenario.verifyStructure) {
          scenario.verifyStructure(configManager);
        }
        
        // Verify path handling if defined
        if (scenario.verifyPathHandling) {
          // PathResolverの簡易実装
          const pathResolver = {
            resolve: (inputPath) => {
              if (inputPath.startsWith('~/')) {
                return path.join(os.homedir(), inputPath.slice(2));
              }
              return path.resolve(inputPath);
            }
          };
          scenario.verifyPathHandling(configManager, pathResolver);
        }
        
      } finally {
        // Cleanup
        if (scenario.cleanup) {
          await scenario.cleanup(context);
        }
      }
    });
  });

  /**
   * 設定ファイルが存在しない場合のエラーハンドリング
   */
  test('Should handle config file not exists with error', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test'; // テスト環境設定維持
    
    const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {});
    const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    configManager.waitForUserConfirmation = vi.fn().mockResolvedValue();
    
    const configPath = path.join(os.homedir(), '.cctop', 'config.json');
    const backupPath = configPath + '.test-backup';
    if (fs.existsSync(configPath)) {
      fs.renameSync(configPath, backupPath);
    }
    
    try {
      await configManager.initialize();
    } catch (error) {
      // process.exitが呼ばれるので、エラーハンドリング
    }
    
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('エラー: 設定ファイルが見つかりません'));
    // TEST_ENV時は自動作成されるため、process.exitは呼ばれない
    expect(mockExit).not.toHaveBeenCalled();
    
    if (fs.existsSync(backupPath)) {
      fs.renameSync(backupPath, configPath);
    }
    
    mockExit.mockRestore();
    mockConsoleError.mockRestore();
    mockConsoleLog.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  /**
   * 設定ファイルの自動作成テスト
   */
  test('Should create config.json automatically when missing', async () => {
    const testConfigDir = path.join(os.tmpdir(), `test-cctop-auto-config-${Date.now()}`);
    const testConfigPath = path.join(testConfigDir, 'config.json');
    
    const manager = new ConfigManager();
    manager.configPath = testConfigPath;
    
    expect(fs.existsSync(testConfigPath)).toBe(false);
    
    await manager.createDefaultConfigFile();
    
    expect(fs.existsSync(testConfigPath)).toBe(true);
    
    const createdConfig = JSON.parse(fs.readFileSync(testConfigPath, 'utf8'));
    
    // 必須フィールドが存在することを確認（ネスト構造）
    expect(createdConfig).toHaveProperty('monitoring');
    expect(createdConfig).toHaveProperty('database');
    expect(createdConfig).toHaveProperty('display');
    
    // ネスト構造（仕様書準拠）の確認
    expect(createdConfig.monitoring).toHaveProperty('watchPaths');
    expect(createdConfig.monitoring).toHaveProperty('excludePatterns');
    expect(Array.isArray(createdConfig.monitoring.watchPaths)).toBe(true);
    expect(Array.isArray(createdConfig.monitoring.excludePatterns)).toBe(true);
    
    fs.rmSync(testConfigDir, { recursive: true, force: true });
  });

  /**
   * 契約テスト - ConfigManagerが契約を満たすか
   */
  test('Should satisfy ConfigManager contract', async () => {
    process.env.NODE_ENV = 'test'; // テスト環境でプロンプト回避
    const testConfig = {
      monitoring: {
        watchPaths: ['./src', './test'],
        excludePatterns: ['**/node_modules/**']
      },
      database: {
        path: '~/.cctop/activity.db'
      }
    };
    
    const configPath = path.join(tempConfigDir, 'contract-test-config.json');
    fs.writeFileSync(configPath, JSON.stringify(testConfig, null, 2));
    
    await configManager.initialize({ config: configPath });
    
    // database.pathの契約検証
    const dbPath = configManager.get('database.path');
    expect(validateContract('ConfigManager', 'database.path', dbPath)).toBe(true);
    
    // monitoring.watchPathsの契約検証
    const watchPaths = configManager.get('monitoring.watchPaths');
    expect(validateContract('ConfigManager', 'monitoring.watchPaths', watchPaths)).toBe(true);
  });

  /**
   * 設定の検証機能テスト
   */
  test('Should validate configuration values', async () => {
    const homeConfigPath = path.join(os.homedir(), '.cctop', 'config.json');
    const validConfig = {
      monitoring: {
        watchPaths: ['./'],
        excludePatterns: [],
        debounceMs: 100,
        maxDepth: 10
      },
      display: {
        maxEvents: 20,
        refreshRateMs: 100
      },
      database: {
        path: '~/.cctop/activity.db',
        mode: 'WAL'
      }
    };
    
    fs.mkdirSync(path.dirname(homeConfigPath), { recursive: true });
    fs.writeFileSync(homeConfigPath, JSON.stringify(validConfig, null, 2));
    
    await configManager.initialize();
    
    // 正常な設定では検証が通る
    expect(() => configManager.validate()).not.toThrow();
    
    // 不正な値で検証エラー
    const invalidTests = [
      {
        modify: () => configManager.config.display.maxEvents = 0,
        error: 'display.maxEvents must be positive'
      },
      {
        modify: () => configManager.config.monitoring.watchPaths = 'not-an-array',
        error: 'monitoring.watchPaths must be an array'
      },
      {
        modify: () => configManager.config.database.path = '',
        error: 'Required fields missing: database.path'
      }
    ];
    
    for (const test of invalidTests) {
      // 設定を復元
      configManager.config = JSON.parse(JSON.stringify(validConfig));
      
      // 不正な値を設定
      test.modify();
      
      // エラーが発生することを確認
      expect(() => configManager.validate()).toThrow(test.error);
    }
  });

  /**
   * 設定の保存機能テスト
   */
  test('Should save configuration changes', async () => {
    const homeConfigPath = path.join(os.homedir(), '.cctop', 'config.json');
    const initialConfig = {
      monitoring: {
        watchPaths: ['./'],
        excludePatterns: [],
        debounceMs: 100
      },
      display: {
        maxLines: 50
      },
      database: {
        path: '~/.cctop/activity.db'
      }
    };
    
    fs.mkdirSync(path.dirname(homeConfigPath), { recursive: true });
    fs.writeFileSync(homeConfigPath, JSON.stringify(initialConfig, null, 2));
    
    await configManager.initialize();
    
    // 設定を変更
    configManager.config.display.maxEvents = 100;
    configManager.config.monitoring.debounceMs = 200;
    
    // 保存
    configManager.save();
    
    // ファイルから読み込んで確認
    const savedConfig = JSON.parse(fs.readFileSync(homeConfigPath, 'utf8'));
    expect(savedConfig.display.maxEvents).toBe(100);
    expect(savedConfig.monitoring.debounceMs).toBe(200);
    
    // 他の設定は維持されている（絶対パス変換済み）
    expect(Array.isArray(savedConfig.monitoring.watchPaths)).toBe(true);
    expect(savedConfig.monitoring.watchPaths.length).toBeGreaterThan(0);
    expect(savedConfig.database.path).toContain('.cctop/activity.db');
  });

  /**
   * get()メソッドの動作確認
   */
  test('Should get nested configuration values', async () => {
    const testConfig = {
      monitoring: {
        watchPaths: ['./src'],
        excludePatterns: ['**/*.log'],
        debounceMs: 150
      },
      display: {
        maxLines: 75,
        refreshRateMs: 250
      },
      database: {
        path: '~/.cctop/test.db',
        mode: 'WAL'
      }
    };
    
    const configPath = path.join(tempConfigDir, 'get-test-config.json');
    fs.writeFileSync(configPath, JSON.stringify(testConfig, null, 2));
    
    await configManager.initialize({ config: configPath });
    
    // ネストされた値の取得
    expect(configManager.get('monitoring.debounceMs')).toBe(150);
    expect(configManager.get('display.refreshRateMs')).toBe(250);
    expect(configManager.get('database.mode')).toBe('WAL');
    
    // 配列の取得（絶対パス変換済み + 自動追加考慮）
    const watchPaths = configManager.get('monitoring.watchPaths');
    expect(watchPaths.some(path => path.endsWith('/src'))).toBe(true);
    expect(configManager.get('monitoring.excludePatterns')).toEqual(['**/*.log']);
    
    // 存在しないキーはnullまたはデフォルト値
    expect(configManager.get('nonexistent.key')).toBeNull();
    expect(configManager.get('nonexistent.key', 'default')).toBe('default');
  });

  /**
   * CLI引数の優先度テスト
   */
  test('Should prioritize CLI arguments over config file', async () => {
    // 設定ファイルを作成
    const configPath = path.join(tempConfigDir, 'priority-test-config.json');
    const fileConfig = {
      monitoring: {
        watchPaths: ['./file-path'],
        debounceMs: 100
      },
      display: {
        maxLines: 50
      },
      database: {
        path: '~/.cctop/file.db'
      }
    };
    fs.writeFileSync(configPath, JSON.stringify(fileConfig, null, 2));
    
    // CLI引数でオーバーライド
    const cliArgs = {
      config: configPath,
      watchPath: './cli-path',
      maxLines: '100',
      dbPath: '~/.cctop/cli.db'
    };
    
    const config = await configManager.initialize(cliArgs);
    
    // CLI引数が優先されることを確認（絶対パス変換済み）
    expect(config.monitoring.watchPaths.some(path => path.endsWith('/cli-path'))).toBe(true);
    expect(config.display.maxEvents).toBe(100); // 文字列から数値に変換される
    expect(config.database.path).toContain('cli.db');
    
    // 他の設定はファイルから読み込まれる
    expect(config.monitoring?.debounceMs || config.debounceMs).toBe(100);
  });

  /**
   * 自動監視対象追加機能のテスト
   */
  test('Should automatically add current directory to watchPaths when empty', async () => {
    // 空のwatchPathsを含む設定を作成
    const configWithEmptyWatchPaths = {
      monitoring: {
        watchPaths: [],
        excludePatterns: [],
        debounceMs: 100,
        maxDepth: 10
      },
      display: {
        maxEvents: 20,
        refreshRateMs: 100
      },
      database: {
        path: '~/.cctop/activity.db',
        mode: 'WAL'
      }
    };
    
    const configPath = path.join(tempConfigDir, 'auto-watch-test-config.json');
    fs.writeFileSync(configPath, JSON.stringify(configWithEmptyWatchPaths, null, 2));
    
    // NODE_ENV=testなので自動的にy応答される
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    
    try {
      const config = await configManager.initialize({ config: configPath });
      
      // 現在のディレクトリが追加されていることを確認
      const currentDir = process.cwd();
      expect(config.monitoring.watchPaths).toContain(currentDir);
      expect(config.monitoring.watchPaths).toHaveLength(1);
      
      // config.jsonが更新されていることを確認
      const savedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(savedConfig.monitoring.watchPaths).toContain(currentDir);
      
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  test('Should add CLI watchPath to config when specified', async () => {
    const configWithEmptyWatchPaths = {
      monitoring: {
        watchPaths: [],
        excludePatterns: [],
        debounceMs: 100,
        maxDepth: 10
      },
      display: {
        maxEvents: 20,
        refreshRateMs: 100
      },
      database: {
        path: '~/.cctop/activity.db',
        mode: 'WAL'
      }
    };
    
    const configPath = path.join(tempConfigDir, 'cli-watch-test-config.json');
    fs.writeFileSync(configPath, JSON.stringify(configWithEmptyWatchPaths, null, 2));
    
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    
    try {
      const targetWatchPath = '/custom/watch/path';
      const config = await configManager.initialize({ 
        config: configPath,
        watchPath: targetWatchPath 
      });
      
      // CLI指定のパスが上書きされていることを確認
      expect(config.monitoring.watchPaths).toEqual([targetWatchPath]);
      
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  test('Should not add duplicate watchPaths', async () => {
    const currentDir = process.cwd();
    const configWithCurrentDir = {
      monitoring: {
        watchPaths: [currentDir],
        excludePatterns: [],
        debounceMs: 100,
        maxDepth: 10
      },
      display: {
        maxEvents: 20,
        refreshRateMs: 100
      },
      database: {
        path: '~/.cctop/activity.db',
        mode: 'WAL'
      }
    };
    
    const configPath = path.join(tempConfigDir, 'no-duplicate-test-config.json');
    fs.writeFileSync(configPath, JSON.stringify(configWithCurrentDir, null, 2));
    
    const config = await configManager.initialize({ config: configPath });
    
    // 重複がないことを確認（現在ディレクトリが既に含まれているので追加されない）
    expect(config.monitoring.watchPaths).toEqual([currentDir]);
    expect(config.monitoring.watchPaths).toHaveLength(1);
  });

  test('Should handle relative path normalization correctly', async () => {
    const configWithRelativePath = {
      monitoring: {
        watchPaths: ['.'], // 相対パス
        excludePatterns: [],
        debounceMs: 100,
        maxDepth: 10
      },
      display: {
        maxEvents: 20,
        refreshRateMs: 100
      },
      database: {
        path: '~/.cctop/activity.db',
        mode: 'WAL'
      }
    };
    
    const configPath = path.join(tempConfigDir, 'relative-path-test-config.json');
    fs.writeFileSync(configPath, JSON.stringify(configWithRelativePath, null, 2));
    
    const config = await configManager.initialize({ config: configPath });
    
    // 相対パス"."が絶対パスに正規化されて重複なしであることを確認
    const currentDir = process.cwd();
    const resolvedCurrentDir = path.resolve(currentDir);
    expect(config.monitoring.watchPaths).toContain(resolvedCurrentDir);
    expect(config.monitoring.watchPaths).toHaveLength(1); // 重複なし
  });
});