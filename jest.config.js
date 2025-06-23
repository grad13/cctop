/**
 * Jest Configuration for cctop
 * 基盤テストの安定性を確保するための設定
 */

module.exports = {
  // テスト環境設定
  testEnvironment: 'node',
  
  // テストファイルのパターン（実行順序を保証）
  testMatch: [
    '<rootDir>/test/integration/feature-1-entry.test.js',
    '<rootDir>/test/integration/feature-2-database.test.js', 
    '<rootDir>/test/integration/feature-3-config.test.js',
    '<rootDir>/test/integration/feature-4-file-monitor.test.js',
    '<rootDir>/test/integration/feature-5-event-processor.test.js',
    '<rootDir>/test/integration/feature-6-cli-display.test.js',
    '<rootDir>/test/integration/startup-verification.test.js',
    '<rootDir>/test/integration/rdd-actual-behavior.test.js',
    '<rootDir>/test/integration/rdd-verification.test.js'
  ],
  
  // タイムアウト設定（ファイル監視系は時間がかかる場合がある）
  testTimeout: 10000,
  
  // セットアップファイル
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  
  // ワーカープロセス関連設定
  detectOpenHandles: true,
  forceExit: true,
  
  // カバレッジ設定
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js'
  ],
  
  // テスト実行の詳細度
  verbose: false,
  
  // リークの強制検出（基盤テストでは無効化 - ファイル監視特有のリソース使用のため）
  detectLeaks: false,
  
  // テスト並行数（ファイル監視の競合を避けるため完全に順次実行）
  maxWorkers: 1,
  
  // 完全な順次実行を強制（package.jsonのscriptで指定済み）
};