/**
 * Inotify Integration Tests (FUNC-019)
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const ConfigManager = require('../../src/config/config-manager');
const InotifyChecker = require('../../src/system/inotify-checker');

const execAsync = promisify(exec);

describe('Inotify Integration Tests', () => {
  let tempDir;
  let configPath;
  
  beforeEach(async () => {
    // テスト用の一時ディレクトリ作成
    tempDir = path.join(os.tmpdir(), `inotify-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    configPath = path.join(tempDir, 'config.json');
  });
  
  afterEach(async () => {
    // クリーンアップ
    await fs.rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });
  
  describe('ConfigManager inotify integration', () => {
    test('正常なinotify設定の読み込み', async () => {
      const config = {
        version: '0.1.0',
        monitoring: {
          watchPaths: ['/tmp'],
          inotify: {
            requiredMaxUserWatches: 1048576,
            checkOnStartup: false,
            warnIfInsufficient: true,
            recommendedValue: 1048576
          }
        },
        database: {
          path: path.join(tempDir, 'test.db')
        },
        display: {
          maxEvents: 20
        }
      };
      
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      
      const configManager = ConfigManager.createForTesting();
      await configManager.initialize({ config: configPath });
      
      const inotifyConfig = configManager.getInotifyConfig();
      expect(inotifyConfig.requiredMaxUserWatches).toBe(1048576);
      expect(inotifyConfig.checkOnStartup).toBe(false);
      expect(inotifyConfig.warnIfInsufficient).toBe(true);
    });
    
    test('inotify設定不在時のデフォルト値適用', async () => {
      const config = {
        version: '0.1.0',
        monitoring: {
          watchPaths: ['/tmp']
        },
        database: {
          path: path.join(tempDir, 'test.db')
        },
        display: {
          maxEvents: 20
        }
      };
      
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      
      const configManager = ConfigManager.createForTesting();
      await configManager.initialize({ config: configPath });
      
      const inotifyConfig = configManager.getInotifyConfig();
      expect(inotifyConfig.requiredMaxUserWatches).toBe(524288);
      expect(inotifyConfig.checkOnStartup).toBe(true);
      expect(inotifyConfig.warnIfInsufficient).toBe(true);
    });
    
    test('部分的なinotify設定でのマージ動作', async () => {
      const config = {
        version: '0.1.0',
        monitoring: {
          watchPaths: ['/tmp'],
          inotify: {
            requiredMaxUserWatches: 100000
            // checkOnStartup等は省略
          }
        },
        database: {
          path: path.join(tempDir, 'test.db')
        },
        display: {
          maxEvents: 20
        }
      };
      
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      
      const configManager = ConfigManager.createForTesting();
      await configManager.initialize({ config: configPath });
      
      const inotifyConfig = configManager.getInotifyConfig();
      expect(inotifyConfig.requiredMaxUserWatches).toBe(100000);
      expect(inotifyConfig.checkOnStartup).toBe(true); // デフォルト値
      expect(inotifyConfig.warnIfInsufficient).toBe(true); // デフォルト値
    });
  });
  
  describe('CLI --check-inotify option', () => {
    test('--check-inotifyオプションの実行', async () => {
      const cctopPath = path.join(__dirname, '../../bin/cctop');
      
      // 環境変数でテストモードを指定
      const env = { ...process.env, NODE_ENV: 'test' };
      
      const { stdout } = await execAsync(`node ${cctopPath} --check-inotify`, { env });
      
      // プラットフォームに応じた出力を確認
      if (process.platform === 'linux') {
        // Linux環境では実際の値が表示される
        expect(stdout).toMatch(/Current inotify limit: \d+/);
        expect(stdout).toMatch(/Status: (SUFFICIENT|INSUFFICIENT)/);
      } else if (process.platform === 'darwin') {
        // macOS環境でのメッセージ
        expect(stdout).toContain('not applicable on macOS');
        expect(stdout).toContain('FSEvents');
      } else {
        // その他の環境
        expect(stdout).toContain('not applicable');
      }
    });
  });
  
  describe('Startup inotify check integration', () => {
    test('checkOnStartup=true時の警告表示（モック）', async () => {
      // Linux環境と不足状態をモック
      vi.spyOn(process, 'platform', 'get').mockReturnValue('linux');
      vi.spyOn(InotifyChecker, 'getCurrentLimit').mockResolvedValue(8192);
      
      // 設定ファイル作成
      const config = {
        version: '0.1.0',
        monitoring: {
          watchPaths: [tempDir],
          inotify: {
            requiredMaxUserWatches: 524288,
            checkOnStartup: true,
            warnIfInsufficient: true
          }
        },
        database: {
          path: path.join(tempDir, 'test.db')
        },
        display: {
          maxEvents: 20
        }
      };
      
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      
      // ConfigManagerで設定を読み込み、inotifyチェックを実行
      const configManager = ConfigManager.createForTesting();
      await configManager.initialize({ config: configPath });
      
      const inotifyConfig = configManager.getInotifyConfig();
      expect(inotifyConfig.checkOnStartup).toBe(true);
      
      // チェック実行
      if (InotifyChecker.shouldCheckLimits() && inotifyConfig.checkOnStartup) {
        const currentLimit = await InotifyChecker.getCurrentLimit();
        const checkResult = InotifyChecker.checkLimitSufficiency(
          currentLimit,
          inotifyConfig.requiredMaxUserWatches
        );
        
        expect(checkResult.status).toBe('insufficient');
        expect(checkResult.shortage).toBe(516096);
      }
    });
    
    test('checkOnStartup=false時のチェックスキップ', async () => {
      const config = {
        version: '0.1.0',
        monitoring: {
          watchPaths: [tempDir],
          inotify: {
            checkOnStartup: false
          }
        },
        database: {
          path: path.join(tempDir, 'test.db')
        },
        display: {
          maxEvents: 20
        }
      };
      
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      
      const configManager = ConfigManager.createForTesting();
      await configManager.initialize({ config: configPath });
      
      const inotifyConfig = configManager.getInotifyConfig();
      expect(inotifyConfig.checkOnStartup).toBe(false);
      
      // チェックがスキップされることを確認
      const shouldCheck = InotifyChecker.shouldCheckLimits() && inotifyConfig.checkOnStartup;
      expect(shouldCheck).toBe(false);
    });
  });
  
  describe('Cross-platform behavior', () => {
    test('macOS環境での適切なスキップ', async () => {
      vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin');
      
      const limit = await InotifyChecker.getCurrentLimit();
      expect(limit).toBeNull();
      
      const shouldCheck = InotifyChecker.shouldCheckLimits();
      expect(shouldCheck).toBe(false);
      
      const message = InotifyChecker.getPlatformMessage();
      expect(message).toContain('FSEvents');
    });
    
    test('Windows環境での適切なスキップ', async () => {
      vi.spyOn(process, 'platform', 'get').mockReturnValue('win32');
      
      const limit = await InotifyChecker.getCurrentLimit();
      expect(limit).toBeNull();
      
      const shouldCheck = InotifyChecker.shouldCheckLimits();
      expect(shouldCheck).toBe(false);
    });
  });
});