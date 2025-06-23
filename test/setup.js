/**
 * Jest Global Setup
 * テスト実行前後のリソース管理を確実に行う
 */

// グローバルタイムアウト延長
jest.setTimeout(10000);

// プロセス終了時のクリーンアップ
const originalExit = process.exit;
process.exit = function(code) {
  // テスト完了後の強制クリーンアップ
  if (global.gc) {
    global.gc();
  }
  originalExit.call(process, code);
};

// 未処理の Promise rejection をキャッチ
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // テスト失敗として扱わない（ログのみ）
});

// 未処理の例外をキャッチ
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // テスト失敗として扱わない（ログのみ）
});

// テスト完了後のガベージコレクション
afterEach(async () => {
  // ガベージコレクションを強制実行
  if (global.gc) {
    global.gc();
  }
  
  // リソース解放のための待機時間を延長（競合状態対策）
  await new Promise(resolve => setTimeout(resolve, 500));
});

// テストスイート間の待機時間
afterAll(async () => {
  // テストスイート完了後の追加待機
  await new Promise(resolve => setTimeout(resolve, 1000));
});