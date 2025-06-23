/**
 * Feature 3 Test: 設定システム
 * 機能3の動作確認テスト
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const ConfigManager = require('../../src/config/config-manager');

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

  test('Should handle config file not exists with error', async () => {
    // テスト環境ではエラーハンドリングが異なるため、NODE_ENVを一時的に変更
    const originalEnv = process.env.NODE_ENV;
    delete process.env.NODE_ENV;
    
    // ~/.cctop/config.jsonが存在しない状況でテスト
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // waitForUserConfirmationをモックしてユーザー入力をスキップ
    configManager.waitForUserConfirmation = jest.fn().mockResolvedValue();
    
    // 一時的に設定ファイルを削除
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
    expect(mockExit).toHaveBeenCalledWith(1);
    
    // 設定ファイルを復元
    if (fs.existsSync(backupPath)) {
      fs.renameSync(backupPath, configPath);
    }
    
    mockExit.mockRestore();
    mockConsoleError.mockRestore();
    mockConsoleLog.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  test('Should load configuration from file (CONFIG001準拠)', async () => {
    // テスト用設定ファイル作成
    const testConfigPath = path.join(tempConfigDir, 'config.json');
    const testConfig = {
      watchPaths: ['/test/path'],
      ignorePaths: ['test_modules'],
      display: {
        maxEvents: 20,
        refreshInterval: 200
      },
      database: {
        path: '~/.cctop/test.db',
        maxEvents: 5000,
        cleanupInterval: 1800000
      }
    };
    fs.writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));

    // 設定ファイルを指定して初期化
    const config = await configManager.initialize({ config: testConfigPath });
    
    // ファイルからの設定が適用されていることを確認
    expect(config.watchPaths).toEqual(['/test/path']);
    expect(config.ignorePaths).toContain('test_modules');
    expect(config.display.maxEvents).toBe(20);
    expect(config.database.path).toBe('~/.cctop/test.db');
  });

  test('Should apply CLI overrides (最高優先度)', async () => {
    // まず~/.cctop/config.jsonを作成
    const homeConfigPath = path.join(os.homedir(), '.cctop', 'config.json');
    const homeConfig = {
      watchPaths: ['./'],
      ignorePaths: ['node_modules'],
      display: { maxEvents: 10, refreshInterval: 100 },
      database: { path: '~/.cctop/events.db', maxEvents: 10000, cleanupInterval: 3600000 }
    };
    fs.mkdirSync(path.dirname(homeConfigPath), { recursive: true });
    fs.writeFileSync(homeConfigPath, JSON.stringify(homeConfig, null, 2));
    
    const cliArgs = {
      watchPath: '/cli/path',
      maxLines: '25',
      dbPath: '/custom/db.sqlite'
    };

    const config = await configManager.initialize(cliArgs);
    
    expect(config.watchPaths).toEqual(['/cli/path']);
    expect(config.display.maxEvents).toBe(25);
    expect(config.database.path).toBe('/custom/db.sqlite');
  });

  test('Should use ~/.cctop/config.json as default', async () => {
    // ~/.cctop/config.jsonを作成
    const homeConfigPath = path.join(os.homedir(), '.cctop', 'config.json');
    const homeConfig = {
      watchPaths: ['/home/path'],
      ignorePaths: ['custom_ignore'],
      display: { maxEvents: 30, refreshInterval: 150 },
      database: { path: '~/.cctop/custom.db', maxEvents: 20000, cleanupInterval: 7200000 }
    };
    fs.mkdirSync(path.dirname(homeConfigPath), { recursive: true });
    fs.writeFileSync(homeConfigPath, JSON.stringify(homeConfig, null, 2));
    
    const config = await configManager.initialize();
    
    expect(config.watchPaths).toEqual(['/home/path']);
    expect(config.display.maxEvents).toBe(30);
  });

  test('Should validate configuration', async () => {
    // ~/.cctop/config.jsonを作成
    const homeConfigPath = path.join(os.homedir(), '.cctop', 'config.json');
    const homeConfig = {
      watchPaths: ['./'],
      ignorePaths: [],
      display: { maxEvents: 10, refreshInterval: 100 },
      database: { path: '~/.cctop/events.db', maxEvents: 10000, cleanupInterval: 3600000 }
    };
    fs.mkdirSync(path.dirname(homeConfigPath), { recursive: true });
    fs.writeFileSync(homeConfigPath, JSON.stringify(homeConfig, null, 2));
    
    await configManager.initialize();
    
    // 正常な設定では検証が通る
    expect(() => configManager.validate()).not.toThrow();
    
    // 不正な設定で検証エラー
    configManager.config.display.maxEvents = -1;
    expect(() => configManager.validate()).toThrow('display.maxEvents must be positive');
  });

  test('Should get configuration values', async () => {
    // ~/.cctop/config.jsonを作成
    const homeConfigPath = path.join(os.homedir(), '.cctop', 'config.json');
    const homeConfig = {
      watchPaths: ['./'],
      ignorePaths: [],
      display: { maxEvents: 10, refreshInterval: 100 },
      database: { path: '~/.cctop/events.db', maxEvents: 10000, cleanupInterval: 3600000 }
    };
    fs.mkdirSync(path.dirname(homeConfigPath), { recursive: true });
    fs.writeFileSync(homeConfigPath, JSON.stringify(homeConfig, null, 2));
    
    const config = await configManager.initialize();
    
    expect(configManager.get('display.refreshInterval')).toBe(100);
    expect(configManager.get('database.path')).toBe('~/.cctop/events.db');
    expect(configManager.get('nonexistent.key', 'default')).toBe('default');
    expect(configManager.get('nonexistent.key')).toBeNull();
  });

  test('Should save configuration to ~/.cctop/config.json', async () => {
    // ~/.cctop/config.jsonを作成
    const homeConfigPath = path.join(os.homedir(), '.cctop', 'config.json');
    const homeConfig = {
      watchPaths: ['./'],
      ignorePaths: [],
      display: { maxEvents: 10, refreshInterval: 100 },
      database: { path: '~/.cctop/events.db', maxEvents: 10000, cleanupInterval: 3600000 }
    };
    fs.mkdirSync(path.dirname(homeConfigPath), { recursive: true });
    fs.writeFileSync(homeConfigPath, JSON.stringify(homeConfig, null, 2));
    
    const config = await configManager.initialize();
    config.display.maxEvents = 999; // 変更
    
    configManager.save();
    
    // 保存されたファイルを確認
    const savedConfigPath = path.join(os.homedir(), '.cctop', 'config.json');
    expect(fs.existsSync(savedConfigPath)).toBe(true);
    
    const savedConfig = JSON.parse(fs.readFileSync(savedConfigPath, 'utf8'));
    expect(savedConfig.display.maxEvents).toBe(999);
  });

  test('Should handle malformed config file with error', async () => {
    // 不正なJSONファイル作成
    const badConfigPath = path.join(tempConfigDir, 'bad-config.json');
    fs.writeFileSync(badConfigPath, '{ invalid json }');
    
    const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    // loadConfigFileは空のオブジェクトを返すが、initializeは成功する
    const config = await configManager.initialize({ config: badConfigPath });
    
    // 警告が出力されていることを確認
    expect(mockConsoleWarn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load config file'),
      expect.any(String)
    );
    
    // デフォルト値が使われていることを確認（空のオブジェクトが返される）
    expect(config).toEqual({});
    
    mockConsoleWarn.mockRestore();
    mockConsoleError.mockRestore();
  });

  test('Should respect config priority order (統合テスト)', async () => {
    // 2つの設定源を用意
    
    // 2. ~/.cctop/config.json
    const defaultConfigPath = path.join(os.homedir(), '.cctop', 'config.json');
    const defaultConfig = { 
      watchPaths: ['./'],
      ignorePaths: [],
      display: { maxEvents: 75, refreshInterval: 100 },
      database: { path: '~/.cctop/events.db', maxEvents: 10000, cleanupInterval: 3600000 }
    };
    fs.mkdirSync(path.dirname(defaultConfigPath), { recursive: true });
    fs.writeFileSync(defaultConfigPath, JSON.stringify(defaultConfig, null, 2));
    
    // 1. コマンドライン引数（最高優先度）
    const cliConfigPath = path.join(tempConfigDir, 'cli-config.json');
    const cliConfig = { 
      watchPaths: ['./cli'],
      ignorePaths: [],
      display: { maxEvents: 125, refreshInterval: 200 },
      database: { path: '~/.cctop/cli.db', maxEvents: 20000, cleanupInterval: 7200000 }
    };
    fs.writeFileSync(cliConfigPath, JSON.stringify(cliConfig, null, 2));
    
    const config = await configManager.initialize({ 
      config: cliConfigPath,  // CLIで指定
      maxLines: '150'         // CLI引数でさらにオーバーライド
    });
    
    // 最高優先度のCLI引数が適用されることを確認
    expect(config.display.maxEvents).toBe(150);
    
    // クリーンアップ
    if (fs.existsSync(defaultConfigPath)) {
      fs.unlinkSync(defaultConfigPath);
    }
  });

  test('Should have consistent config structure for watchPaths', async () => {
    // bin/cctopとFileMonitorで同じ参照パスを使うことを確認
    const config = await configManager.initialize();
    
    // config.watchPathsが存在することを確認
    expect(config).toHaveProperty('watchPaths');
    expect(Array.isArray(config.watchPaths)).toBe(true);
    expect(config.watchPaths.length).toBeGreaterThan(0);
    
    // bin/cctopでの使用を模擬
    const monitorConfig = {
      watchPaths: config.watchPaths,
      ignored: config.excludePatterns,
      depth: config.monitoring?.maxDepth || 10
    };
    
    expect(monitorConfig.watchPaths).toBeDefined();
    expect(monitorConfig.watchPaths).toEqual(config.watchPaths);
  });

  test('Should create config.json automatically when missing', async () => {
    // 存在しないディレクトリでテスト
    const testConfigDir = path.join(os.tmpdir(), `test-cctop-auto-config-${Date.now()}`);
    const testConfigPath = path.join(testConfigDir, 'config.json');
    
    const manager = new ConfigManager();
    manager.configPath = testConfigPath;
    
    // config.jsonが存在しないことを確認
    expect(fs.existsSync(testConfigPath)).toBe(false);
    
    // createDefaultConfigFileを実行
    await manager.createDefaultConfigFile();
    
    // config.jsonが作成されたことを確認
    expect(fs.existsSync(testConfigPath)).toBe(true);
    
    // 内容が正しいことを確認
    const createdConfig = JSON.parse(fs.readFileSync(testConfigPath, 'utf8'));
    expect(createdConfig.watchPaths).toBeDefined();
    expect(createdConfig.database).toBeDefined();
    expect(createdConfig.display).toBeDefined();
    
    // クリーンアップ
    fs.rmSync(testConfigDir, { recursive: true, force: true });
  });
});