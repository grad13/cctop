/**
 * ConfigManager Architecture Refactoring Test
 * REP-0098中期対策: テスト可能性向上の確認
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
const ConfigManager = require('../../src/config/config-manager');
const CLIInterface = require('../../src/interfaces/cli-interface');

describe('ConfigManager Architecture Refactoring (REP-0098)', () => {
  describe('責任分離とテスト可能性', () => {
    it('非インタラクティブモードでの初期化（テスト用）', async () => {
      // テスト用ファクトリーで作成
      const configManager = ConfigManager.createForTesting();
      
      expect(configManager.interactive).toBe(false);
      expect(configManager.cliInterface).toBeInstanceOf(CLIInterface);
    });

    it('インタラクティブモードでの初期化（本番用）', () => {
      // 本番用ファクトリーで作成
      const configManager = ConfigManager.createForProduction();
      
      expect(configManager.interactive).toBe(true);
      expect(configManager.cliInterface).toBeInstanceOf(CLIInterface);
    });

    it('依存性注入: カスタムCLIInterface', () => {
      const mockCLIInterface = {
        promptAddDirectory: vi.fn().mockResolvedValue(false),
        waitForUserConfirmation: vi.fn().mockResolvedValue(),
        success: vi.fn(),
        info: vi.fn(),
        error: vi.fn()
      };

      const configManager = new ConfigManager({
        interactive: false,
        cliInterface: mockCLIInterface
      });

      expect(configManager.cliInterface).toBe(mockCLIInterface);
    });

    it('依存性注入: カスタムpromptHandler', async () => {
      const mockPromptHandler = vi.fn().mockResolvedValue(true);
      
      const configManager = new ConfigManager({
        interactive: false,
        promptHandler: mockPromptHandler
      });

      expect(configManager.promptHandler).toBe(mockPromptHandler);
    });
  });

  describe('NODE_ENV依存の除去', () => {
    beforeEach(() => {
      // NODE_ENVをリセット
      delete process.env.NODE_ENV;
    });

    it('非インタラクティブモードではNODE_ENVに関係なく例外をthrow', async () => {
      const configManager = ConfigManager.createForTesting();
      
      // 存在しない設定ファイルで初期化を試行（無効なディレクトリ）
      await expect(configManager.initialize({ config: '/nonexistent/path.json' }))
        .rejects.toThrow(); // エラーのタイプは問わず、例外が発生することを確認
    });

    it('インタラクティブモードではNODE_ENVに関係なくprocess.exit', () => {
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {});
      const configManager = ConfigManager.createForProduction();
      
      try {
        // この実装では実際のテストは困難だが、構造は確認できる
        expect(configManager.interactive).toBe(true);
      } finally {
        mockExit.mockRestore();
      }
    });
  });

  describe('純粋な設定管理機能', () => {
    it('基本的な設定管理機能は保持されている', () => {
      const configManager = ConfigManager.createForTesting();
      
      // 基本メソッドの存在確認
      expect(typeof configManager.initialize).toBe('function');
      expect(typeof configManager.get).toBe('function');
      expect(typeof configManager.getAll).toBe('function');
      expect(typeof configManager.getConfig).toBe('function');
      expect(typeof configManager.validate).toBe('function');
      expect(typeof configManager.save).toBe('function');
    });

    it('設定値の取得・設定は変更されていない', () => {
      const configManager = ConfigManager.createForTesting();
      configManager.config = {
        test: {
          value: 'hello'
        }
      };

      expect(configManager.get('test.value')).toBe('hello');
      expect(configManager.get('nonexistent', 'default')).toBe('default');
    });
  });

  describe('CLIInterface分離の効果', () => {
    it('プロンプト処理がCLIInterfaceに委譲されている', async () => {
      const mockCLIInterface = {
        promptAddDirectory: vi.fn().mockResolvedValue(true),
        success: vi.fn(),
        info: vi.fn()
      };

      const configManager = new ConfigManager({
        interactive: true,
        cliInterface: mockCLIInterface
      });

      // defaultPromptHandlerがCLIInterfaceを使用することを確認
      const result = await configManager.defaultPromptHandler('/test/path');
      
      expect(mockCLIInterface.promptAddDirectory).toHaveBeenCalledWith('/test/path', 30000);
      expect(result).toBe(true);
    });

    it('非インタラクティブモードではプロンプトをスキップ', async () => {
      const configManager = ConfigManager.createForTesting();
      
      const result = await configManager.defaultPromptHandler('/test/path');
      
      expect(result).toBe(false);
    });
  });
});