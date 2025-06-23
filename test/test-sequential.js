#!/usr/bin/env node

/**
 * 完全順次テスト実行スクリプト
 * 競合状態を回避するため、各テストファイルを個別に実行
 */

const { spawn } = require('child_process');
const path = require('path');

// 実行順序を明示的に定義
const testFiles = [
  'feature-1-entry.test.js',
  'feature-2-database.test.js', 
  'feature-3-config.test.js',
  'feature-4-file-monitor.test.js',
  'feature-5-event-processor.test.js',
  'feature-6-cli-display.test.js',
  'rdd-verification.test.js'
];

// テスト結果の集計
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const results = [];

console.log('🚀 Starting sequential test execution...\n');

async function runTest(testFile) {
  const testPath = path.join('test/integration', testFile);
  
  console.log(`📋 Running: ${testFile}`);
  console.log(`⏰ Started at: ${new Date().toLocaleTimeString()}`);
  
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const jest = spawn('npx', ['jest', testPath, '--no-coverage', '--runInBand', '--verbose'], {
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    let output = '';
    let errorOutput = '';
    
    jest.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      // リアルタイムでのデバッグ出力
      // process.stdout.write(chunk);
    });
    
    jest.stderr.on('data', (data) => {
      const chunk = data.toString();
      errorOutput += chunk;
      // リアルタイムでのデバッグ出力
      // process.stderr.write(chunk);
    });
    
    jest.on('close', (code) => {
      const duration = Date.now() - startTime;
      const success = code === 0;
      
      // 結果解析（Jest の様々な出力形式に対応）
      const allOutput = output + errorOutput;
      let testsInFile = 0;
      
      // パターン1: "Tests: X passed, Y total" の精密パターン
      const testsPassedMatch = allOutput.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+total/);
      if (testsPassedMatch) {
        testsInFile = parseInt(testsPassedMatch[1]);
      }
      
      // パターン2: "✓ test description" の数をカウント (より正確)
      if (testsInFile === 0) {
        const testPassedMatches = allOutput.match(/^\s*✓/gm);
        if (testPassedMatches) {
          testsInFile = testPassedMatches.length;
        }
      }
      
      // パターン3: PASS行があって✓がない場合は最低限の検出
      if (testsInFile === 0) {
        const passMatch = allOutput.match(/PASS.*\.test\.js/);
        if (passMatch && success) {
          testsInFile = 1; // 成功したら最低1つのテストがあったとみなす
        }
      }
      
      if (success) {
        passedTests += testsInFile;
        console.log(`✅ PASSED: ${testFile} (${testsInFile} tests, ${duration}ms)`);
      } else {
        failedTests += testsInFile || 1;
        console.log(`❌ FAILED: ${testFile} (${duration}ms)`);
        console.log(`Error output: ${errorOutput.slice(0, 300)}...`);
        if (output) {
          console.log(`Jest output: ${output.slice(0, 300)}...`);
        }
      }
      
      totalTests += testsInFile || 1;
      
      results.push({
        file: testFile,
        success,
        tests: testsInFile,
        duration,
        output: success ? '' : errorOutput.slice(0, 500)
      });
      
      console.log(`⏱️  Finished at: ${new Date().toLocaleTimeString()}\n`);
      
      // テスト間の待機時間（リソース解放のため）
      setTimeout(resolve, 1000);
    });
  });
}

async function runAllTests() {
  console.log(`📊 Total test files: ${testFiles.length}\n`);
  
  // 各テストファイルを順次実行
  for (const testFile of testFiles) {
    await runTest(testFile);
  }
  
  // 最終結果
  console.log('📈 FINAL RESULTS:');
  console.log('='.repeat(50));
  console.log(`📊 Total tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📈 Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log('='.repeat(50));
  
  // 詳細結果
  console.log('\n📋 Detailed Results:');
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${result.file} (${result.tests} tests, ${result.duration}ms)`);
    if (!result.success && result.output) {
      console.log(`   Error: ${result.output.slice(0, 100)}...`);
    }
  });
  
  // 失敗があった場合は終了コード1
  process.exit(failedTests > 0 ? 1 : 0);
}

// メイン実行
runAllTests().catch(error => {
  console.error('❌ Sequential test execution failed:', error);
  process.exit(1);
});