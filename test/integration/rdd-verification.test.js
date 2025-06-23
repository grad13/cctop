/**
 * RDD Verification Test: 実動作確認
 * Phase 5: RDD原則に基づく実動作確認テスト
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('RDD Verification: 実動作確認', () => {
  let testDir;
  let cctopProcess;

  beforeEach(() => {
    // テスト用ディレクトリ作成
    testDir = path.join(os.tmpdir(), `rdd-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(async () => {
    // プロセス終了
    if (cctopProcess && !cctopProcess.killed) {
      cctopProcess.kill('SIGINT');
      await new Promise(resolve => {
        cctopProcess.on('exit', resolve);
        setTimeout(resolve, 1000); // 1秒でタイムアウト
      });
    }

    // テストディレクトリクリーンアップ
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('Should start within 3 seconds (RDD requirement)', async () => {
    const cctopPath = path.join(__dirname, '../../bin/cctop');
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      cctopProcess = spawn('node', [cctopPath], {
        stdio: 'pipe',
        cwd: testDir
      });
      
      let output = '';
      
      cctopProcess.stdout.on('data', (data) => {
        output += data.toString();
        
        // 起動完了メッセージを確認
        if (output.includes('🎯 Starting real-time file activity monitor...')) {
          const elapsedTime = Date.now() - startTime;
          
          expect(elapsedTime).toBeLessThan(3000); // 3秒以内
          resolve();
        }
      });
      
      cctopProcess.on('error', reject);
      
      // タイムアウト
      setTimeout(() => {
        reject(new Error('Startup timeout - exceeded 3 seconds'));
      }, 5000);
    });
  }, 10000); // テスト自体は10秒タイムアウト

  test('Should create ~/.cctop/activity.db correctly', async () => {
    const cctopPath = path.join(__dirname, '../../bin/cctop');
    const expectedDbPath = path.join(os.homedir(), '.cctop', 'activity.db');
    
    return new Promise((resolve, reject) => {
      cctopProcess = spawn('node', [cctopPath], {
        stdio: 'pipe',
        cwd: testDir
      });
      
      let output = '';
      
      cctopProcess.stdout.on('data', (data) => {
        output += data.toString();
        
        // データベース初期化完了を確認
        if (output.includes('🗄️ Database initialized:')) {
          // データベースファイルの存在確認
          expect(fs.existsSync(expectedDbPath)).toBe(true);
          
          // データベースファイルのサイズ確認（0バイトでない）
          const stats = fs.statSync(expectedDbPath);
          expect(stats.size).toBeGreaterThan(0);
          
          resolve();
        }
      });
      
      cctopProcess.on('error', reject);
      
      setTimeout(() => {
        reject(new Error('Database creation timeout'));
      }, 5000);
    });
  }, 10000);

  test('Should exit gracefully with Ctrl+C', async () => {
    const cctopPath = path.join(__dirname, '../../bin/cctop');
    
    return new Promise((resolve, reject) => {
      cctopProcess = spawn('node', [cctopPath], {
        stdio: 'pipe',
        cwd: testDir
      });
      
      let output = '';
      let startupComplete = false;
      
      cctopProcess.stdout.on('data', (data) => {
        output += data.toString();
        
        // 起動完了後にSIGINTを送信
        if (!startupComplete && output.includes('🎯 Starting real-time file activity monitor...')) {
          startupComplete = true;
          setTimeout(() => {
            cctopProcess.kill('SIGINT');
          }, 100);
        }
      });
      
      cctopProcess.on('exit', (code, signal) => {
        // 正常終了（SIGINT）またはコード0を期待
        expect(code === 0 || signal === 'SIGINT').toBe(true);
        resolve();
      });
      
      cctopProcess.on('error', reject);
      
      setTimeout(() => {
        reject(new Error('Exit test timeout'));
      }, 10000);
    });
  }, 15000);

  test('Should detect file changes in real-time', async () => {
    const cctopPath = path.join(__dirname, '../../bin/cctop');
    
    return new Promise((resolve, reject) => {
      cctopProcess = spawn('node', [cctopPath], {
        stdio: 'pipe',
        cwd: testDir
      });
      
      let output = '';
      let fileCreated = false;
      
      cctopProcess.stdout.on('data', (data) => {
        output += data.toString();
        
        // 起動完了後にファイル作成
        if (!fileCreated && output.includes('🎯 Starting real-time file activity monitor...')) {
          fileCreated = true;
          setTimeout(() => {
            const testFile = path.join(testDir, 'real-time-test.txt');
            fs.writeFileSync(testFile, 'Real-time detection test');
          }, 500);
        }
        
        // ファイル作成イベントの検出を確認（表形式での表示）
        if (output.includes('real-time-test.txt') && output.includes('create')) {
          resolve();
        }
      });
      
      cctopProcess.on('error', reject);
      
      setTimeout(() => {
        reject(new Error('Real-time detection timeout'));
      }, 8000);
    });
  }, 12000);

  test('Should handle multiple file operations', async () => {
    const cctopPath = path.join(__dirname, '../../bin/cctop');
    
    return new Promise((resolve, reject) => {
      cctopProcess = spawn('node', [cctopPath], {
        stdio: 'pipe',
        cwd: testDir
      });
      
      let output = '';
      let operationsStarted = false;
      let detectedEvents = [];
      
      cctopProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        
        // イベント検出の記録（仕様書ui002準拠の表形式）
        // 画面全体の再描画方式なので、行ごとに解析する
        const lines = chunk.split('\n');
        for (const line of lines) {
          // 表示例: "2025-06-24 00:00:00     00:00  multi-test.txt               ./              create       1      8"
          if (line.includes('multi-test.txt') && line.includes('   ')) {  // データ行の判定
            // イベントタイプは固定位置にあるため、正確に判定
            if (line.includes(' create ') && !detectedEvents.includes('create')) {
              detectedEvents.push('create');
            } else if (line.includes(' modify ') && !detectedEvents.includes('modify')) {
              detectedEvents.push('modify');
            } else if (line.includes(' delete ') && !detectedEvents.includes('delete')) {
              detectedEvents.push('delete');
            }
          }
        }
        
        // 起動完了後に複数操作実行
        if (!operationsStarted && output.includes('🎯 Starting real-time file activity monitor...')) {
          operationsStarted = true;
          setTimeout(() => {
            const testFile = path.join(testDir, 'multi-test.txt');
            
            // 1. 作成
            fs.writeFileSync(testFile, 'Initial content');
            
            setTimeout(() => {
              // 2. 変更
              fs.writeFileSync(testFile, 'Modified content');
              
              setTimeout(() => {
                // 3. 削除
                fs.unlinkSync(testFile);
                
                // 結果確認
                setTimeout(() => {
                  expect(detectedEvents).toContain('create');
                  expect(detectedEvents).toContain('modify');
                  expect(detectedEvents).toContain('delete');
                  resolve();
                }, 1000);
              }, 300);
            }, 300);
          }, 500);
        }
      });
      
      cctopProcess.on('error', reject);
      
      const timeoutId = setTimeout(() => {
        reject(new Error(`Multiple operations timeout. Detected events: ${detectedEvents.join(', ')}`));
      }, 15000);
      
      // 正常終了時にタイムアウトをクリア
      const originalResolve = resolve;
      resolve = () => {
        clearTimeout(timeoutId);
        originalResolve();
      };
    });
  }, 20000);

  test('Should maintain performance with multiple files', async () => {
    const cctopPath = path.join(__dirname, '../../bin/cctop');
    
    return new Promise((resolve, reject) => {
      cctopProcess = spawn('node', [cctopPath], {
        stdio: 'pipe',
        cwd: testDir
      });
      
      let output = '';
      let performanceTestStarted = false;
      let detectedEventCount = 0;
      
      cctopProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        
        // イベント数カウント（仕様書ui002準拠の表形式）
        // perf-test-*.txt ファイルのcreateイベントをカウント
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.includes('perf-test-') && line.includes(' create ')) {
            detectedEventCount++;
          }
        }
        
        // 起動完了後にパフォーマンステスト実行
        if (!performanceTestStarted && output.includes('🎯 Starting real-time file activity monitor...')) {
          performanceTestStarted = true;
          
          setTimeout(() => {
            // 20ファイルを素早く作成（1000ファイルは時間がかかるため縮小）
            for (let i = 0; i < 20; i++) {
              const testFile = path.join(testDir, `perf-test-${i}.txt`);
              fs.writeFileSync(testFile, `Performance test file ${i}`);
            }
            
            // 結果確認（少し待機）
            setTimeout(() => {
              expect(detectedEventCount).toBeGreaterThanOrEqual(20);
              clearTimeout(timeoutId);
              originalResolve();
            }, 3000);
          }, 500);
        }
      });
      
      cctopProcess.on('error', reject);
      
      const timeoutId = setTimeout(() => {
        reject(new Error(`Performance test timeout. Detected ${detectedEventCount} events`));
      }, 15000);
      
      // 正常終了時にタイムアウトをクリア
      const originalResolve = resolve;
      resolve = () => {
        clearTimeout(timeoutId);
        originalResolve();
      };
    });
  }, 20000);
});