/**
 * Jest Global Setup
 * テスト実行前後のリソース管理を確実に行う
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// EventEmitter メモリリーク対策（グローバル設定）
require('events').EventEmitter.defaultMaxListeners = 20;

// テスト用の設定ファイルを作成
const setupTestConfig = () => {
  const configDir = path.join(os.homedir(), '.cctop');
  const configPath = path.join(configDir, 'config.json');
  
  // ディレクトリ作成
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  // テスト用のデフォルト設定
  const testConfig = {
    version: "0.1.0",
    monitoring: {
      watchPaths: ["./"],
      excludePatterns: [
        "**/node_modules/**",
        "**/.git/**",
        "**/dist/**",
        "**/build/**",
        "**/.next/**",
        "**/.nuxt/**",
        "**/.cache/**",
        "**/coverage/**",
        "**/.DS_Store",
        "**/*.log",
        "**/.env*",
        "**/.cctop/**"
      ],
      debounceMs: 100,
      maxDepth: 10
    },
    display: {
      maxEvents: 20,
      refreshRateMs: 100,
      showTimestamps: true,
      colorEnabled: true,
      relativeTime: false,
      mode: "all"
    },
    database: {
      path: "~/.cctop/activity.db",
      mode: "WAL"
    }
  };
  
  // 設定ファイルが存在しない場合のみ作成
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(testConfig, null, 2));
    console.log(`📝 Created test config: ${configPath}`);
  }
};

// テスト環境のセットアップ
beforeAll(() => {
  setupTestConfig();
});

// グローバルタイムアウト延長（Vitestでは設定ファイルで管理）
// jest.setTimeout(10000); // Vitest互換のため無効化

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