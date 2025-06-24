/**
 * Config Validation Script
 * Schema Validationによる設定ファイル検証
 */

const { ConfigSchema } = require('./test/schema/config-schema.js');
const fs = require('fs');

console.log('🔍 Schema Validation実行中...\n');

try {
  const config = JSON.parse(fs.readFileSync('/Users/takuo-h/.cctop/config.json', 'utf8'));
  
  console.log('📋 設定ファイル構造分析:');
  console.log('- ルートキー:', Object.keys(config));
  console.log('- monitoring.watchPaths数:', config.monitoring?.watchPaths?.length || 0);
  console.log();
  
  // 1. 重複構造問題
  console.log('=== 🚨 重複構造問題 ===');
  console.log('watchPaths (ルート):', config.watchPaths?.length || 0, '個');
  console.log('monitoring.watchPaths:', config.monitoring?.watchPaths?.length || 0, '個');
  console.log();
  
  // 2. 配列汚染問題
  console.log('=== 🚨 配列汚染問題 ===');
  const tempPaths = config.monitoring?.watchPaths?.filter(p => 
    p.includes('/tmp/') || p.includes('test-')
  ) || [];
  console.log('一時テストパス汚染:', tempPaths.length, '個');
  if (tempPaths.length > 0) {
    console.log('サンプル:', tempPaths.slice(0, 3));
  }
  console.log();
  
  // 3. Schema Validation実行
  console.log('=== 🔍 Schema Validation結果 ===');
  const result = ConfigSchema.parse(config);
  console.log('✅ Schema validation PASSED');
  
} catch (error) {
  console.log('❌ Schema validation FAILED:');
  console.log();
  
  if (error.errors) {
    error.errors.forEach((err, i) => {
      console.log(`${i+1}. パス: ${err.path.join('.')}`);
      console.log(`   エラー: ${err.message}`);
      console.log(`   期待: ${err.expected || 'schema定義参照'}`);
      console.log();
    });
  }
  
  // 4. 追加問題検出
  const config = JSON.parse(fs.readFileSync('/Users/takuo-h/.cctop/config.json', 'utf8'));
  console.log('=== 🚨 追加検出問題 ===');
  
  if (config.display?.refreshInterval) {
    console.log('❌ display.refreshInterval → refreshRateMs に変更必要');
  }
  
  if (config.performance) {
    console.log('❌ performance オブジェクト → schema未定義');
  }
  
  if (config.excludePatterns) {
    console.log('❌ excludePatterns (ルート) → monitoring.excludePatternsに移動必要');
  }
}