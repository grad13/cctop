/**
 * FUNC-105: Local Setup Initialization Test
 * ローカル設定・初期化機能のテスト
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const CLI_PATH = path.join(process.cwd(), 'bin', 'cctop');

describe('FUNC-105: Local Setup Initialization', () => {
  let tempDir;
  let originalCwd;
  
  beforeEach(() => {
    // テスト用一時ディレクトリ作成
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'func105-test-'));
    originalCwd = process.cwd();
  });
  
  afterEach(() => {
    // クリーンアップ
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    process.chdir(originalCwd);
  });

  describe('Local Directory Management (.cctop/)', () => {
    it('should create .cctop/ directory on first run', async () => {
      process.chdir(tempDir);
      
      // 初回実行前は .cctop/ が存在しない
      expect(fs.existsSync('.cctop')).toBe(false);
      
      try {
        // タイムアウト付きで実行（実際の監視は開始させない）
        execSync(`timeout 2s node ${CLI_PATH} || true`, { 
          encoding: 'utf8',
          timeout: 3000,
          stdio: 'pipe'
        });
      } catch (error) {
        // タイムアウトエラーは想定内
      }
      
      // .cctop/ ディレクトリが作成される
      expect(fs.existsSync('.cctop')).toBe(true);
      expect(fs.statSync('.cctop').isDirectory()).toBe(true);
    });

    it('should create config.json with FUNC-101 schema', async () => {
      process.chdir(tempDir);
      
      try {
        execSync(`timeout 2s node ${CLI_PATH} || true`, { 
          encoding: 'utf8',
          timeout: 3000,
          stdio: 'pipe'
        });
      } catch (error) {
        // タイムアウトエラーは想定内
      }
      
      // config.json が作成される
      const configPath = path.join('.cctop', 'config.json');
      expect(fs.existsSync(configPath)).toBe(true);
      
      // FUNC-101準拠のスキーマ構造を確認
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(config).toHaveProperty('version');
      expect(config).toHaveProperty('monitoring');
      expect(config).toHaveProperty('database');
      expect(config).toHaveProperty('display');
      
      // FUNC-101で定義された必須フィールド
      expect(config.monitoring).toHaveProperty('watchPaths');
      expect(config.monitoring).toHaveProperty('excludePatterns');
      expect(config.database).toHaveProperty('path');
      expect(config.display).toHaveProperty('maxEvents');
      expect(config.display).toHaveProperty('refreshRateMs');
    });

    it('should create .gitignore file', async () => {
      process.chdir(tempDir);
      
      try {
        execSync(`timeout 2s node ${CLI_PATH} || true`, { 
          encoding: 'utf8',
          timeout: 3000,
          stdio: 'pipe'
        });
      } catch (error) {
        // タイムアウトエラーは想定内
      }
      
      // .gitignore が作成される
      const gitignorePath = path.join('.cctop', '.gitignore');
      expect(fs.existsSync(gitignorePath)).toBe(true);
      
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      expect(gitignoreContent).toContain('activity.db');
      expect(gitignoreContent).toContain('activity.db-*');
      expect(gitignoreContent).toContain('cache/');
      expect(gitignoreContent).toContain('logs/');
    });

    it('should use existing .cctop/ on second run', async () => {
      process.chdir(tempDir);
      
      // 初回実行
      try {
        execSync(`timeout 2s node ${CLI_PATH} || true`, { 
          encoding: 'utf8',
          timeout: 3000,
          stdio: 'pipe'
        });
      } catch (error) {
        // タイムアウトエラーは想定内
      }
      
      const configPath = path.join('.cctop', 'config.json');
      const initialStat = fs.statSync(configPath);
      
      // 2回目実行
      await new Promise(resolve => setTimeout(resolve, 1000)); // 時間差確保
      
      try {
        execSync(`timeout 2s node ${CLI_PATH} || true`, { 
          encoding: 'utf8',
          timeout: 3000,
          stdio: 'pipe'
        });
      } catch (error) {
        // タイムアウトエラーは想定内
      }
      
      // config.json が再作成されない（更新時刻が同じ）
      const secondStat = fs.statSync(configPath);
      expect(secondStat.mtime.getTime()).toBe(initialStat.mtime.getTime());
    });
  });

  describe('Multiple Project Independence', () => {
    it('should create independent .cctop/ for different directories', async () => {
      // プロジェクトA
      const projectA = path.join(tempDir, 'project-a');
      fs.mkdirSync(projectA, { recursive: true });
      
      // プロジェクトB
      const projectB = path.join(tempDir, 'project-b');
      fs.mkdirSync(projectB, { recursive: true });
      
      // プロジェクトAで実行
      process.chdir(projectA);
      try {
        execSync(`timeout 2s node ${CLI_PATH} || true`, { 
          encoding: 'utf8',
          timeout: 3000,
          stdio: 'pipe'
        });
      } catch (error) {}
      
      // プロジェクトBで実行
      process.chdir(projectB);
      try {
        execSync(`timeout 2s node ${CLI_PATH} || true`, { 
          encoding: 'utf8',
          timeout: 3000,
          stdio: 'pipe'
        });
      } catch (error) {}
      
      // 独立した .cctop/ が作成される
      expect(fs.existsSync(path.join(projectA, '.cctop'))).toBe(true);
      expect(fs.existsSync(path.join(projectB, '.cctop'))).toBe(true);
      
      // 異なる設定ファイル
      const configA = path.join(projectA, '.cctop', 'config.json');
      const configB = path.join(projectB, '.cctop', 'config.json');
      
      expect(fs.existsSync(configA)).toBe(true);
      expect(fs.existsSync(configB)).toBe(true);
      
      // watchPathsがそれぞれのプロジェクトディレクトリ
      const configAContent = JSON.parse(fs.readFileSync(configA, 'utf8'));
      const configBContent = JSON.parse(fs.readFileSync(configB, 'utf8'));
      
      expect(configAContent.monitoring.watchPaths).toContain('.');
      expect(configBContent.monitoring.watchPaths).toContain('.');
    });
  });

  describe('Global Configuration Removal (FUNC-105)', () => {
    it('should not create ~/.cctop/ directory', async () => {
      process.chdir(tempDir);
      
      try {
        execSync(`timeout 2s node ${CLI_PATH} || true`, { 
          encoding: 'utf8',
          timeout: 3000,
          stdio: 'pipe'
        });
      } catch (error) {}
      
      // ~/.cctop/ ディレクトリが作成されない
      const globalCctopPath = path.join(os.homedir(), '.cctop');
      expect(fs.existsSync(globalCctopPath)).toBe(false);
    });

    it('should reject --global option (removed per FUNC-105)', async () => {
      process.chdir(tempDir);
      
      try {
        const result = execSync(`node ${CLI_PATH} --global`, { 
          encoding: 'utf8',
          timeout: 3000
        });
        // --globalオプションが実装されている場合は失敗
        expect(true).toBe(false);
      } catch (error) {
        // --globalオプションがサポートされていないエラーが期待される
        expect(error.message).toMatch(/Unknown option.*global/);
      }
    });

    it('should reject --local option (removed per FUNC-105)', async () => {
      process.chdir(tempDir);
      
      try {
        const result = execSync(`node ${CLI_PATH} --local`, { 
          encoding: 'utf8',
          timeout: 3000
        });
        // --localオプションが実装されている場合は失敗
        expect(true).toBe(false);
      } catch (error) {
        // --localオプションがサポートされていないエラーが期待される
        expect(error.message).toMatch(/Unknown option.*local/);
      }
    });
  });

  describe('Initial Messages (FUNC-105)', () => {
    it('should display creation message on first run', async () => {
      process.chdir(tempDir);
      
      try {
        const result = execSync(`timeout 2s node ${CLI_PATH} || true`, { 
          encoding: 'utf8',
          timeout: 3000,
          stdio: 'pipe'
        });
        
        // FUNC-105で定義された初回実行メッセージ
        expect(result).toContain('Created configuration in ./.cctop/');
        expect(result).toContain('Edit ./.cctop/config.json to customize settings');
        expect(result).toContain('Starting monitoring...');
      } catch (error) {
        // execSyncのタイムアウトエラーは許容
        if (!error.message.includes('SIGTERM')) {
          throw error;
        }
      }
    });

    it('should not display creation message on subsequent runs', async () => {
      process.chdir(tempDir);
      
      // 初回実行
      try {
        execSync(`timeout 1s node ${CLI_PATH} || true`, { 
          encoding: 'utf8',
          timeout: 2000,
          stdio: 'pipe'
        });
      } catch (error) {}
      
      // 2回目実行
      try {
        const result = execSync(`timeout 1s node ${CLI_PATH} || true`, { 
          encoding: 'utf8',
          timeout: 2000,
          stdio: 'pipe'
        });
        
        // 作成メッセージが表示されない
        expect(result).not.toContain('Created configuration in ./.cctop/');
      } catch (error) {
        // execSyncのタイムアウトエラーは許容
        if (!error.message.includes('SIGTERM')) {
          throw error;
        }
      }
    });
  });

  describe('Directory Structure Verification (FUNC-105)', () => {
    it('should create correct directory structure', async () => {
      process.chdir(tempDir);
      
      try {
        execSync(`timeout 2s node ${CLI_PATH} || true`, { 
          encoding: 'utf8',
          timeout: 3000,
          stdio: 'pipe'
        });
      } catch (error) {}
      
      // FUNC-105で定義されたディレクトリ構造
      const cctopDir = '.cctop';
      expect(fs.existsSync(cctopDir)).toBe(true);
      expect(fs.existsSync(path.join(cctopDir, 'config.json'))).toBe(true);
      expect(fs.existsSync(path.join(cctopDir, '.gitignore'))).toBe(true);
      
      // activity.db は実際の監視開始後に作成される
      // plugins/ と cache/ は将来拡張用（現在は作成されない）
    });
  });
});