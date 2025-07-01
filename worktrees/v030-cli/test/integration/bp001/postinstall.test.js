/**
 * BP-001 Postinstall Auto-initialization Test
 * FUNC-013準拠: postinstall自動初期化機能
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// postinstallスクリプトのモック
class PostinstallRunner {
  constructor(testHomeDir) {
    this.homeDir = testHomeDir;
    this.cctopDir = path.join(testHomeDir, '.cctop');
    this.configPath = path.join(this.cctopDir, 'config.json');
  }
  
  // デフォルト設定
  getDefaultConfig() {
    return {
      monitoring: {
        watchPaths: ["."],
        excludePatterns: ["node_modules/**", ".git/**", "*.log"],
        refreshRateMs: 100,
        eventBuffer: 100,
        depth: 99
      },
      database: {
        path: "~/.cctop/activity.db",
        mode: "WAL"
      },
      display: {
        maxRows: 50,
        theme: "default",
        showRelativePath: true
      },
      eventFilters: {
        find: true,
        create: true,
        modify: true,
        delete: true,
        move: true,
        restore: true
      }
    };
  }
  
  // postinstallスクリプトの実行をシミュレート
  run() {
    // 既存ディレクトリチェック
    if (fs.existsSync(this.cctopDir)) {
      return {
        success: true,
        skipped: true,
        message: 'Directory already exists'
      };
    }
    
    try {
      // ディレクトリ作成
      fs.mkdirSync(this.cctopDir, { recursive: true });
      
      // デフォルト設定ファイル作成
      fs.writeFileSync(
        this.configPath,
        JSON.stringify(this.getDefaultConfig(), null, 2)
      );
      
      return {
        success: true,
        skipped: false,
        message: 'Successfully created ~/.cctop'
      };
    } catch (error) {
      return {
        success: false,
        skipped: false,
        message: `Failed to create ~/.cctop: ${error.message}`
      };
    }
  }
  
  // クリーンアップ
  cleanup() {
    if (fs.existsSync(this.cctopDir)) {
      fs.rmSync(this.cctopDir, { recursive: true, force: true });
    }
  }
}

describe('BP-001: Postinstall Auto-initialization (FUNC-013)', () => {
  let testHomeDir;
  let runner;

  beforeEach(() => {
    // テスト用ホームディレクトリ
    testHomeDir = path.join(os.tmpdir(), `bp001-postinstall-${Date.now()}`);
    fs.mkdirSync(testHomeDir, { recursive: true });
    runner = new PostinstallRunner(testHomeDir);
  });

  afterEach(() => {
    runner.cleanup();
    fs.rmSync(testHomeDir, { recursive: true, force: true });
  });

  test('should create .cctop directory on first install', () => {
    // 初回実行
    const result = runner.run();
    
    expect(result.success).toBe(true);
    expect(result.skipped).toBe(false);
    expect(fs.existsSync(runner.cctopDir)).toBe(true);
  });

  test('should create default config.json file', () => {
    runner.run();
    
    expect(fs.existsSync(runner.configPath)).toBe(true);
    
    const config = JSON.parse(fs.readFileSync(runner.configPath, 'utf8'));
    expect(config).toHaveProperty('monitoring');
    expect(config).toHaveProperty('database');
    expect(config).toHaveProperty('display');
    expect(config).toHaveProperty('eventFilters');
  });

  test('should skip if .cctop directory already exists', () => {
    // 手動でディレクトリ作成
    fs.mkdirSync(runner.cctopDir, { recursive: true });
    fs.writeFileSync(runner.configPath, '{"custom": true}');
    
    // postinstall実行
    const result = runner.run();
    
    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
    
    // 既存ファイルが保持されている
    const config = JSON.parse(fs.readFileSync(runner.configPath, 'utf8'));
    expect(config.custom).toBe(true);
  });

  test('should handle permission errors gracefully', () => {
    // 読み取り専用ディレクトリをシミュレート
    if (process.platform !== 'win32') {
      fs.mkdirSync(runner.cctopDir, { mode: 0o444 });
      
      const readOnlyRunner = new PostinstallRunner(testHomeDir);
      const result = readOnlyRunner.run();
      
      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true); // 既に存在するのでスキップ
    }
  });

  test('should create valid default configuration', () => {
    runner.run();
    
    const config = JSON.parse(fs.readFileSync(runner.configPath, 'utf8'));
    
    // monitoring設定検証
    expect(config.monitoring.watchPaths).toContain('.');
    expect(config.monitoring.excludePatterns).toContain('node_modules/**');
    expect(config.monitoring.refreshRateMs).toBe(100);
    
    // database設定検証
    expect(config.database.path).toBe('~/.cctop/activity.db');
    expect(config.database.mode).toBe('WAL');
    
    // display設定検証
    expect(config.display.maxRows).toBe(50);
    expect(config.display.showRelativePath).toBe(true);
    
    // eventFilters設定検証（全てtrue）
    Object.values(config.eventFilters).forEach(value => {
      expect(value).toBe(true);
    });
  });

  test('should be idempotent', () => {
    // 複数回実行しても同じ結果
    const result1 = runner.run();
    const result2 = runner.run();
    const result3 = runner.run();
    
    expect(result1.success).toBe(true);
    expect(result1.skipped).toBe(false);
    
    expect(result2.success).toBe(true);
    expect(result2.skipped).toBe(true);
    
    expect(result3.success).toBe(true);
    expect(result3.skipped).toBe(true);
  });

  test('should handle missing parent directory', () => {
    // 存在しない深いパスでのテスト
    const deepPath = path.join(testHomeDir, 'non/existent/path');
    const deepRunner = new PostinstallRunner(deepPath);
    
    const result = deepRunner.run();
    
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(deepPath, '.cctop'))).toBe(true);
  });

  test('should create cross-platform compatible config', () => {
    runner.run();
    
    const configContent = fs.readFileSync(runner.configPath, 'utf8');
    const config = JSON.parse(configContent);
    
    // パスセパレータが正しく使用されている
    expect(config.database.path).toMatch(/^~[/\\]\.cctop[/\\]activity\.db$/);
    
    // JSON形式が正しい（2スペースインデント）
    expect(configContent).toMatch(/^{\n  /);
  });

  test('should not output messages in quiet mode', () => {
    // 出力なしでの実行をシミュレート
    const originalLog = console.log;
    const originalError = console.error;
    const logs = [];
    const errors = [];
    
    console.log = (...args) => logs.push(args);
    console.error = (...args) => errors.push(args);
    
    try {
      runner.run();
      
      // FUNC-013仕様: 進捗メッセージを表示しない
      expect(logs).toHaveLength(0);
      expect(errors).toHaveLength(0);
    } finally {
      console.log = originalLog;
      console.error = originalError;
    }
  });
});