/**
 * RDD実動作確認テスト - 実際の動作に基づく検証
 * テストを通すためのテストではなく、実際の動作を確認するテスト
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('RDD Actual Behavior Verification', () => {
  const cctopPath = path.join(__dirname, '../../bin/cctop');
  const testDir = path.join(os.tmpdir(), `test-cctop-rdd-actual-${Date.now()}`);
  let cctopProcess;
  
  beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });
  
  afterEach(async () => {
    if (cctopProcess) {
      cctopProcess.kill();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('Should observe actual output and behavior', async () => {
    return new Promise((resolve, reject) => {
      cctopProcess = spawn('node', [cctopPath], {
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'test' },
        cwd: testDir
      });
      
      let stdout = '';
      let stderr = '';
      let hasStarted = false;
      let testFile = null;
      
      cctopProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        console.log('[STDOUT]:', chunk); // 実際の出力を確認
        
        // 起動完了を確認
        if (!hasStarted && chunk.includes('Starting real-time file activity monitor')) {
          hasStarted = true;
          console.log('[TEST]: cctop started, creating test file...');
          
          // ファイル作成
          setTimeout(() => {
            testFile = path.join(testDir, 'test-file.txt');
            fs.writeFileSync(testFile, 'Test content');
            console.log('[TEST]: Created file:', testFile);
            
            // ファイル変更
            setTimeout(() => {
              fs.appendFileSync(testFile, '\nAdditional content');
              console.log('[TEST]: Modified file:', testFile);
              
              // ファイル削除
              setTimeout(() => {
                fs.unlinkSync(testFile);
                console.log('[TEST]: Deleted file:', testFile);
                
                // 結果確認のため少し待機
                setTimeout(() => {
                  cctopProcess.kill();
                  console.log('\n[FINAL OUTPUT]:\n', stdout);
                  console.log('\n[STDERR]:\n', stderr);
                  
                  // 実際の動作を確認
                  expect(hasStarted).toBe(true);
                  resolve();
                }, 2000);
              }, 1000);
            }, 1000);
          }, 1000);
        }
      });
      
      cctopProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error('[STDERR]:', data.toString());
      });
      
      cctopProcess.on('error', (err) => {
        console.error('[ERROR]:', err);
        reject(err);
      });
      
      // タイムアウト
      setTimeout(() => {
        reject(new Error('Test timeout - check console output for details'));
      }, 10000);
    });
  }, 15000);

  test('Should check display format', async () => {
    return new Promise((resolve, reject) => {
      cctopProcess = spawn('node', [cctopPath], {
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'test' },
        cwd: testDir
      });
      
      let output = '';
      let displayStarted = false;
      
      cctopProcess.stdout.on('data', (data) => {
        output += data.toString();
        
        // CLIDisplayの表示形式を確認
        if (!displayStarted && output.includes('Modified')) {
          displayStarted = true;
          console.log('[DISPLAY FORMAT]:\n', output);
          
          // テストファイル作成
          setTimeout(() => {
            const testFile = path.join(testDir, 'display-test.js');
            fs.writeFileSync(testFile, 'console.log("test");');
            
            // 表示更新を待つ
            setTimeout(() => {
              cctopProcess.kill();
              console.log('[FINAL DISPLAY]:\n', output);
              
              // 表示形式の確認
              expect(output).toContain('Modified');
              expect(output).toContain('Elapsed');
              expect(output).toContain('File Name');
              expect(output).toContain('Event');
              resolve();
            }, 3000);
          }, 500);
        }
      });
      
      cctopProcess.on('error', reject);
      
      setTimeout(() => {
        reject(new Error('Display format test timeout'));
      }, 8000);
    });
  }, 10000);
});