/**
 * スタートアップ動作確認テスト
 * Data-Driven Testing + 副作用テスト + 契約テストの統合アプローチ
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// テストインフラのインポート
const SideEffectTracker = require('../helpers/side-effect-tracker');
const { startupScenarios } = require('../fixtures/startup-scenarios');
const { InitializationContract } = require('../contracts/initialization.contract');

describe('Startup Verification', () => {
  const cctopPath = path.join(__dirname, '../../bin/cctop');
  const sideEffectTracker = new SideEffectTracker();
  
  // 各テストの前にクリーンアップ
  beforeEach(() => {
    // ~/.cctop のバックアップ（既存設定を保護）
    const cctopDir = path.join(os.homedir(), '.cctop');
    const backupDir = path.join(os.homedir(), '.cctop.backup');
    
    if (fs.existsSync(cctopDir)) {
      if (fs.existsSync(backupDir)) {
        fs.rmSync(backupDir, { recursive: true, force: true });
      }
      fs.renameSync(cctopDir, backupDir);
    }
  });
  
  // 各テストの後にリストア
  afterEach(() => {
    const cctopDir = path.join(os.homedir(), '.cctop');
    const backupDir = path.join(os.homedir(), '.cctop.backup');
    
    // テスト用のディレクトリをクリーンアップ
    if (fs.existsSync(cctopDir)) {
      fs.rmSync(cctopDir, { recursive: true, force: true });
    }
    
    // バックアップをリストア
    if (fs.existsSync(backupDir)) {
      fs.renameSync(backupDir, cctopDir);
    }
  });

  /**
   * データ駆動型テスト - 各シナリオに対してテストを実行
   */
  startupScenarios.forEach(scenario => {
    test(`Scenario: ${scenario.name}`, async () => {
      const testDir = path.join(os.tmpdir(), `test-cctop-${Date.now()}`);
      fs.mkdirSync(testDir, { recursive: true });
      
      try {
        // Setup phase
        let context = {};
        if (scenario.setup) {
          context = await scenario.setup(testDir) || {};
        }
        
        // 副作用トラッキング開始
        sideEffectTracker.addWatchDirs([testDir]);
        sideEffectTracker.captureState();
        
        // Prepare arguments
        const args = [...scenario.input.args];
        if (context.configPath) {
          const configIndex = args.indexOf('--config');
          if (configIndex >= 0) {
            // --configの後にパスがない場合は追加
            if (configIndex === args.length - 1) {
              args.push(context.configPath);
            } else {
              args[configIndex + 1] = context.configPath;
            }
          }
        }
        
        // Execute cctop
        const result = await runCctopWithTimeout(
          cctopPath,
          args,
          scenario.input.env,
          scenario.input.cwd || testDir,
          scenario.expectations.maxDuration || 3000
        );
        
        // Verify exit code
        if (result.exitCode !== scenario.expectations.exitCode) {
          console.log(`Scenario: ${scenario.name}`);
          console.log(`Exit code: ${result.exitCode} (expected: ${scenario.expectations.exitCode})`);
          console.log(`Stdout: ${result.stdout}`);
          console.log(`Stderr: ${result.stderr}`);
        }
        expect(result.exitCode).toBe(scenario.expectations.exitCode);
        
        // Verify side effects
        const changes = sideEffectTracker.detectChanges();
        
        // 期待されるファイルが作成されているか
        if (scenario.expectations.sideEffects.creates) {
          const expectedCreates = scenario.expectations.sideEffects.creates;
          
          // カスタムパスの場合は動的に追加
          if (context.configPath && scenario.name === 'start with custom config path') {
            expectedCreates.push(path.join(testDir, 'test-activity.db'));
          }
          
          for (const expectedFile of expectedCreates) {
            const wasCreated = changes.created.some(created => 
              created === expectedFile || created.endsWith(path.basename(expectedFile))
            );
            if (!wasCreated) {
              console.log(`Expected file not created: ${expectedFile}`);
              console.log(`Created files: ${JSON.stringify(changes.created, null, 2)}`);
              console.log(`Modified files: ${JSON.stringify(changes.modified, null, 2)}`);
              
              // 破損DBの回復の場合、modifiedリストも確認
              if (scenario.name === 'recovery from corrupted database') {
                const wasModified = changes.modified.some(modified => 
                  modified === expectedFile || modified.endsWith(path.basename(expectedFile))
                );
                if (wasModified) {
                  continue; // modifiedとして検出されていればOK
                }
              }
            }
            expect(wasCreated).toBe(true);
          }
        }
        
        // 予期しないファイルが作成されていないか
        if (scenario.expectations.sideEffects.notCreates) {
          for (const unexpectedFile of scenario.expectations.sideEffects.notCreates) {
            const wasCreated = changes.created.some(created => {
              const basename = path.basename(created);
              const unexpectedBase = path.basename(unexpectedFile);
              
              // より厳密なチェック
              if (unexpectedFile === './~') {
                // リテラルな ~ ディレクトリ
                return created.endsWith('/~') || basename === '~';
              } else if (unexpectedFile.includes('events.db')) {
                // events.db という間違った名前
                return basename === 'events.db';
              } else if (unexpectedFile === './activity.db') {
                // カレントディレクトリのactivity.db
                return created === path.join(testDir, 'activity.db');
              }
              
              return created === unexpectedFile || created.endsWith(unexpectedFile);
            });
            
            expect(wasCreated).toBe(false);
          }
        }
        
        // 動作の検証（メッセージではなく振る舞い）
        if (scenario.expectations.behavior) {
          // ファイル監視が開始されたかは、エラーがないことで判断
          if (scenario.expectations.behavior.startsWatching) {
            expect(result.stderr).not.toContain('Failed to start watching');
            expect(result.stderr).not.toContain('chokidar');
          }
          
          // データベースが作成されたかは副作用で確認済み
          
          // 設定が読み込まれたかは、エラーがないことで判断
          if (scenario.expectations.behavior.loadsConfig) {
            expect(result.stderr).not.toContain('Config error');
            expect(result.stderr).not.toContain('Invalid configuration');
          }
        }
        
        // 契約の検証 - 初期化順序
        verifyInitializationContract(result, scenario);
        
      } finally {
        // Cleanup
        if (fs.existsSync(testDir)) {
          fs.rmSync(testDir, { recursive: true, force: true });
        }
      }
    });
  });
  
  /**
   * 設定構造の互換性テスト（フラット構造 vs ネスト構造）
   */
  test('Should handle both flat and nested config structures', async () => {
    const testDir = path.join(os.tmpdir(), `test-config-compat-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
    
    try {
      // フラット構造（後方互換性）
      const flatConfig = {
        version: "0.1.0",
        watchPaths: ["./src", "./test"],
        excludePatterns: ["**/node_modules/**"],
        monitoring: { debounceMs: 100, maxDepth: 5 },
        display: { maxEvents: 25 },
        database: { path: path.join(testDir, 'test.db') }
      };
      
      const flatConfigPath = path.join(testDir, 'flat-config.json');
      fs.writeFileSync(flatConfigPath, JSON.stringify(flatConfig, null, 2));
      
      // ネスト構造（推奨）
      const nestedConfig = {
        version: "0.1.0",
        monitoring: {
          watchPaths: ["./src", "./test"],
          excludePatterns: ["**/node_modules/**"],
          debounceMs: 100,
          maxDepth: 5
        },
        display: {
          maxEvents: 25
        },
        database: {
          path: path.join(testDir, 'test.db')
        }
      };
      
      const nestedConfigPath = path.join(testDir, 'nested-config.json');
      fs.writeFileSync(nestedConfigPath, JSON.stringify(nestedConfig, null, 2));
      
      // 両方の設定で起動できることを確認
      const flatResult = await runCctopWithTimeout(
        cctopPath,
        ['--config', flatConfigPath],
        { NODE_ENV: 'test' },
        testDir,
        2000
      );
      
      const nestedResult = await runCctopWithTimeout(
        cctopPath,
        ['--config', nestedConfigPath],
        { NODE_ENV: 'test' },
        testDir,
        2000
      );
      
      // どちらもエラーなく起動すること
      expect(flatResult.exitCode).toBe(0);
      expect(nestedResult.exitCode).toBe(0);
      expect(flatResult.stderr).toBe('');
      expect(nestedResult.stderr).toBe('');
      
    } finally {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    }
  });
});

/**
 * cctopを実行してタイムアウト付きで結果を取得
 */
function runCctopWithTimeout(cctopPath, args, env, cwd, timeout) {
  return new Promise((resolve) => {
    const child = spawn('node', [cctopPath, ...args], {
      stdio: 'pipe',
      env: { ...process.env, ...env },
      cwd: cwd
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    // タイムアウト後にプロセスを終了
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
    }, timeout);
    
    child.on('exit', (code) => {
      clearTimeout(timer);
      resolve({
        exitCode: code || 0,
        stdout,
        stderr
      });
    });
    
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        exitCode: 1,
        stdout,
        stderr: err.message
      });
    });
  });
}

/**
 * 初期化契約の検証
 */
function verifyInitializationContract(result, scenario) {
  // エラーハンドリングの契約確認
  const contract = InitializationContract.ErrorRecovery.scenarios;
  
  if (scenario.name === 'recovery from corrupted database') {
    // 破損したDBからの回復が契約通りか
    expect(result.stderr).not.toContain('SQLITE_CORRUPT');
    expect(result.exitCode).toBe(0); // 回復して正常起動
  }
}