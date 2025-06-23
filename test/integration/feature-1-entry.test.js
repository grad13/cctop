/**
 * Feature 1 Test: 基本エントリポイント
 * 機能1の動作確認テスト
 */

const { spawn } = require('child_process');
const path = require('path');

describe('Feature 1: 基本エントリポイント', () => {
  test('Should start and display basic messages', async () => {
    const cctopPath = path.join(__dirname, '../../bin/cctop');
    
    return new Promise((resolve, reject) => {
      const child = spawn('node', [cctopPath], {
        stdio: 'pipe'
      });
      
      let output = '';
      const startTime = Date.now();
      
      child.stdout.on('data', (data) => {
        output += data.toString();
        
        // 期待するメッセージが表示されたら成功（機能6統合後）
        if (output.includes('🚀 cctop v0.1.0.0 starting...') &&
            output.includes('✅ All systems working: entry, config, database, file monitoring, event processing, CLI display!')) {
          
          const elapsedTime = Date.now() - startTime;
          
          // RDD原則: 3秒以内の起動
          expect(elapsedTime).toBeLessThan(3000);
          
          child.kill('SIGINT');
          resolve();
        }
      });
      
      child.on('error', reject);
      
      // タイムアウト
      const timeoutId = setTimeout(() => {
        child.kill();
        reject(new Error('Startup timeout'));
      }, 5000);
      
      // 正常終了時にタイムアウトをクリア
      const originalResolve = resolve;
      resolve = () => {
        clearTimeout(timeoutId);
        originalResolve();
      };
    });
  });
  
  test('Should exit gracefully with SIGINT', async () => {
    const cctopPath = path.join(__dirname, '../../bin/cctop');
    
    return new Promise((resolve, reject) => {
      const child = spawn('node', [cctopPath], {
        stdio: 'pipe'
      });
      
      let output = '';
      
      child.stdout.on('data', (data) => {
        output += data.toString();
        
        // 起動確認後にSIGINT送信（機能6統合後）
        if (output.includes('All systems working: entry, config, database, file monitoring, event processing, CLI display!')) {
          child.kill('SIGINT');
        }
      });
      
      child.on('exit', (code, signal) => {
        expect(code).toBe(0);
        clearTimeout(timeoutId);
        originalResolve();
      });
      
      child.on('error', reject);
      
      const timeoutId = setTimeout(() => {
        child.kill();
        reject(new Error('Exit test timeout'));
      }, 5000);
      
      // 正常終了時にタイムアウトをクリア
      const originalResolve = resolve;
      resolve = () => {
        clearTimeout(timeoutId);
        originalResolve();
      };
    });
  });
});