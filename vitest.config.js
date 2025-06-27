import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // グローバル設定
    globals: true,
    environment: 'node',
    
    // テストファイルパターン
    include: ['test/integration/**/*.test.js', 'test/unit/**/*.test.js', 'test/func003/**/*.test.js', 'test/e2e/**/*.test.js', 'test/**/*.test.mjs'],
    
    // セットアップファイル（削除済み）
    // setupFiles: ['./test/vitest-setup.js'],
    
    // タイムアウト設定
    testTimeout: 300000,
    hookTimeout: 60000,
    
    // 並列実行制御（シングルスレッド実行）
    poolOptions: {
      threads: {
        singleThread: true
      }
    },
    
    // 非同期干渉問題対策
    sequence: {
      concurrent: false
    },
    
    // RDDテストは完全に分離実行
    fileParallelism: false,
    
    // デバッグ・ログ制御
    silent: false,
    reporter: ['verbose'],
    
    // プロセス終了制御（強制終了の代替）
    forceRerunTriggers: ['**/package.json/**'],
    watchExclude: ['**/node_modules/**', '**/dist/**'],
    
    // 分離とクリーンアップ
    isolate: true,
    pool: 'threads'
  }
});