import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Jest互換性設定
    globals: true,
    environment: 'node',
    
    // テストファイルパターン
    include: ['test/integration/**/*.test.js'],
    
    // Jest設定の移行
    setupFiles: ['./test/setup.js'],
    
    // タイムアウト設定
    testTimeout: 120000,
    hookTimeout: 120000,
    
    // 並列実行制御（Jest --runInBandの代替）
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
    
    // プロセス終了制御（Jest --forceExitの代替）
    forceRerunTriggers: ['**/package.json/**'],
    watchExclude: ['**/node_modules/**', '**/dist/**'],
    
    // 分離とクリーンアップ
    isolate: true,
    pool: 'threads'
  }
});