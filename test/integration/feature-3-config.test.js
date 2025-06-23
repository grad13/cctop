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
    
    // 環境変数クリーンアップ
    delete process.env.CCTOP_CONFIG_FILE;
  });

  test('Should use default configuration when no config file exists', () => {
    const config = configManager.initialize();
    
    expect(config.monitoring.watchPaths).toEqual(['.']);
    expect(config.monitoring.excludePatterns).toContain('**/node_modules/**');
    expect(config.database.mode).toBe('WAL');
    expect(config.display.maxLines).toBe(50);
  });

  test('Should load configuration from file (a002準拠)', () => {
    // テスト用設定ファイル作成
    const testConfigPath = path.join(tempConfigDir, 'config.json');
    const testConfig = {
      monitoring: {
        watchPaths: ['/test/path'],
        debounceMs: 200
      },
      display: {
        maxLines: 100
      }
    };
    fs.writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));

    // 設定ファイルを指定して初期化
    const config = configManager.initialize({ config: testConfigPath });
    
    // ファイルからの設定が適用されていることを確認
    expect(config.monitoring.watchPaths).toEqual(['/test/path']);
    expect(config.monitoring.debounceMs).toBe(200);
    expect(config.display.maxLines).toBe(100);
    
    // デフォルト値もマージされていることを確認
    expect(config.database.mode).toBe('WAL');
    expect(config.monitoring.excludePatterns).toContain('**/node_modules/**');
  });

  test('Should apply CLI overrides (最高優先度)', () => {
    const cliArgs = {
      watchPath: '/cli/path',
      maxLines: '25',
      dbPath: '/custom/db.sqlite'
    };

    const config = configManager.initialize(cliArgs);
    
    expect(config.monitoring.watchPaths).toEqual(['/cli/path']);
    expect(config.display.maxLines).toBe(25);
    expect(config.database.path).toBe('/custom/db.sqlite');
  });

  test('Should handle config file priority (a002準拠の優先順位)', () => {
    // 環境変数設定
    const envConfigPath = path.join(tempConfigDir, 'env-config.json');
    const envConfig = { display: { maxLines: 75 } };
    fs.writeFileSync(envConfigPath, JSON.stringify(envConfig, null, 2));
    
    process.env.CCTOP_CONFIG_FILE = envConfigPath;
    
    const config = configManager.initialize();
    
    expect(config.display.maxLines).toBe(75);
    
    // 環境変数クリーンアップ
    delete process.env.CCTOP_CONFIG_FILE;
  });

  test('Should validate configuration', () => {
    configManager.initialize();
    
    // 正常な設定では検証が通る
    expect(() => configManager.validate()).not.toThrow();
    
    // 不正な設定で検証エラー
    configManager.config.display.maxLines = -1;
    expect(() => configManager.validate()).toThrow('display.maxLines must be positive');
  });

  test('Should get configuration values', () => {
    const config = configManager.initialize();
    
    expect(configManager.get('monitoring.debounceMs')).toBe(100);
    expect(configManager.get('database.mode')).toBe('WAL');
    expect(configManager.get('nonexistent.key', 'default')).toBe('default');
    expect(configManager.get('nonexistent.key')).toBeNull();
  });

  test('Should save configuration to ~/.cctop/config.json', () => {
    const config = configManager.initialize();
    config.display.maxLines = 999; // 変更
    
    configManager.save();
    
    // 保存されたファイルを確認
    const savedConfigPath = path.join(os.homedir(), '.cctop', 'config.json');
    expect(fs.existsSync(savedConfigPath)).toBe(true);
    
    const savedConfig = JSON.parse(fs.readFileSync(savedConfigPath, 'utf8'));
    expect(savedConfig.display.maxLines).toBe(999);
  });

  test('Should handle malformed config file gracefully', () => {
    // 不正なJSONファイル作成
    const badConfigPath = path.join(tempConfigDir, 'bad-config.json');
    fs.writeFileSync(badConfigPath, '{ invalid json }');

    // エラーが発生せずデフォルト設定が使われることを確認
    const config = configManager.initialize({ config: badConfigPath });
    expect(config.monitoring.watchPaths).toEqual(['.']);
  });

  test('Should respect config priority order (統合テスト)', () => {
    // 4つの設定源を全て用意
    
    // 4. デフォルト設定（defaults.js） - maxLines: 50
    // （これは既に組み込まれている）
    
    // 3. ~/.cctop/config.json
    const defaultConfigPath = path.join(os.homedir(), '.cctop', 'config.json');
    const defaultConfig = { display: { maxLines: 75 } };
    fs.writeFileSync(defaultConfigPath, JSON.stringify(defaultConfig, null, 2));
    
    // 2. 環境変数
    const envConfigPath = path.join(tempConfigDir, 'env-config.json');
    const envConfig = { display: { maxLines: 100 } };
    fs.writeFileSync(envConfigPath, JSON.stringify(envConfig, null, 2));
    process.env.CCTOP_CONFIG_FILE = envConfigPath;
    
    // 1. コマンドライン引数（最高優先度）
    const cliConfigPath = path.join(tempConfigDir, 'cli-config.json');
    const cliConfig = { display: { maxLines: 125 } };
    fs.writeFileSync(cliConfigPath, JSON.stringify(cliConfig, null, 2));
    
    const config = configManager.initialize({ 
      config: cliConfigPath,  // CLIで指定
      maxLines: '150'         // CLI引数でさらにオーバーライド
    });
    
    // 最高優先度のCLI引数が適用されることを確認
    expect(config.display.maxLines).toBe(150);
    
    // クリーンアップ
    delete process.env.CCTOP_CONFIG_FILE;
    if (fs.existsSync(defaultConfigPath)) {
      fs.unlinkSync(defaultConfigPath);
    }
  });

  test('Should create config.json automatically when missing', () => {
    // 存在しないディレクトリでテスト
    const testConfigDir = path.join(os.tmpdir(), `test-cctop-auto-config-${Date.now()}`);
    const testConfigPath = path.join(testConfigDir, 'config.json');
    
    const manager = new ConfigManager();
    manager.configPath = testConfigPath;
    // デフォルト設定を初期化
    manager.config = require('../../src/config/defaults');
    
    // config.jsonが存在しないことを確認
    expect(fs.existsSync(testConfigPath)).toBe(false);
    
    // createDefaultConfigFileを実行
    manager.createDefaultConfigFile();
    
    // config.jsonが作成されたことを確認
    expect(fs.existsSync(testConfigPath)).toBe(true);
    
    // 内容が正しいことを確認
    const createdConfig = JSON.parse(fs.readFileSync(testConfigPath, 'utf8'));
    expect(createdConfig.monitoring).toBeDefined();
    expect(createdConfig.database).toBeDefined();
    expect(createdConfig.display).toBeDefined();
    
    // クリーンアップ
    fs.rmSync(testConfigDir, { recursive: true, force: true });
  });
});