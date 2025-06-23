/**
 * スタートアップ動作確認テスト
 * cctopの起動時の基本動作を確認
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('Startup Verification', () => {
  const cctopPath = path.join(__dirname, '../../bin/cctop');
  const testDir = path.join(os.tmpdir(), `test-cctop-startup-${Date.now()}`);
  
  beforeEach(() => {
    // テスト用ディレクトリ作成
    fs.mkdirSync(testDir, { recursive: true });
  });
  
  afterEach(() => {
    // テスト用ディレクトリ削除
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('Should start without errors and initialize all components', async () => {
    return new Promise((resolve, reject) => {
      const child = spawn('node', [cctopPath], {
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'test' },
        cwd: testDir
      });
      
      let stdout = '';
      let stderr = '';
      let hasError = false;
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
        hasError = true;
      });
      
      // 起動後の初期化メッセージを確認
      setTimeout(() => {
        child.kill();
        
        // エラーがないことを確認
        if (hasError) {
          console.log('STDERR:', stderr);
          reject(new Error(`Startup error: ${stderr}`));
          return;
        }
        
        // 必要な初期化メッセージが含まれているか確認
        expect(stdout).toContain('cctop v0.1.0.0 starting');
        expect(stdout).toContain('Configuration initialized');
        expect(stdout).toContain('Database initialized');
        expect(stdout).toContain('FileMonitor initialized');
        expect(stdout).toContain('EventProcessor initialized');
        expect(stdout).toContain('CLIDisplay initialized');
        
        // FileMonitor started のメッセージを確認
        expect(stdout).toContain('FileMonitor started watching');
        
        // 成功メッセージを確認
        expect(stdout).toContain('All systems working');
        
        resolve();
      }, 2000);
      
      child.on('error', (err) => {
        reject(err);
      });
    });
  }, 5000);

  test('Should handle watchPaths configuration correctly', async () => {
    // カスタム設定でテスト
    const configPath = path.join(testDir, 'custom-config.json');
    const customConfig = {
      version: "0.1.0",
      watchPaths: ["./src", "./test"],
      excludePatterns: ["**/node_modules/**"],
      monitoring: { debounceMs: 100, maxDepth: 5 },
      display: { maxEvents: 25 },
      database: { path: path.join(testDir, 'test.db') }
    };
    
    fs.writeFileSync(configPath, JSON.stringify(customConfig, null, 2));
    
    return new Promise((resolve, reject) => {
      const child = spawn('node', [cctopPath, '--config', configPath], {
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'test' },
        cwd: testDir
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      setTimeout(() => {
        child.kill();
        
        // watchPathsが正しく設定されていることを確認
        expect(stdout).toContain('FileMonitor started watching');
        // エラーがないことを確認
        expect(stderr).not.toContain('Cannot read properties');
        
        resolve();
      }, 1500);
      
      child.on('error', (err) => {
        reject(err);
      });
    });
  }, 5000);
});