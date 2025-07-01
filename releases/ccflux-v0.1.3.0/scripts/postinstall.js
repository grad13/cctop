#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

// デフォルト設定
const DEFAULT_CONFIG = {
  version: "0.1.0",
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
  includePatterns: [],
  monitoring: {
    debounceMs: 100,
    maxDepth: 10,
    followSymlinks: false
  },
  display: {
    maxEvents: 50,
    refreshInterval: 100,
    showTimestamps: true,
    colorEnabled: true,
    relativeTime: false,
    mode: "all"
  },
  database: {
    path: "~/.cctop/activity.db",
    maxEvents: 10000,
    cleanupInterval: 3600000,
    walMode: true
  },
  performance: {
    maxMemoryMB: 256,
    gcInterval: 60000
  }
};

// ユーザー入力を取得するヘルパー関数
async function askQuestion(question, defaultAnswer = 'n') {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    // 30秒のタイムアウト
    const timeout = setTimeout(() => {
      console.log(`\nタイムアウト: デフォルト値 '${defaultAnswer}' を使用します`);
      rl.close();
      resolve(defaultAnswer);
    }, 30000);

    rl.question(question, (answer) => {
      clearTimeout(timeout);
      rl.close();
      resolve(answer.toLowerCase() || defaultAnswer);
    });
  });
}

async function main() {
  console.log('\n=== cctop ポストインストールセットアップ ===\n');

  const homeDir = os.homedir();
  const configDir = path.join(homeDir, '.cctop');
  const configPath = path.join(configDir, 'config.json');
  const dbPath = path.join(configDir, 'events.db');

  try {
    // 1. 設定ディレクトリの確認・作成
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
      console.log(`✓ 設定ディレクトリを作成しました: ${configDir}`);
    }

    // 2. 設定ファイルの処理
    if (fs.existsSync(configPath)) {
      console.log(`既に設定ファイルが存在します: ${configPath}`);
      const answer = await askQuestion('設定を初期化しますか？ [y/N]: ', 'n');
      
      if (answer === 'y' || answer === 'yes') {
        fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
        console.log('✓ 設定ファイルを初期化しました');
      } else {
        console.log('✓ 既存の設定ファイルを維持します');
      }
    } else {
      fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
      console.log(`✓ 設定ファイルを作成しました: ${configPath}`);
    }

    // 3. データベースファイルの処理
    if (fs.existsSync(dbPath)) {
      console.log(`\n既にデータベースが存在します: ${dbPath}`);
      const answer = await askQuestion('DBを初期化しますか？ [y/N]: ', 'n');
      
      if (answer === 'y' || answer === 'yes') {
        fs.unlinkSync(dbPath);
        console.log('✓ データベースを削除しました（次回起動時に再作成されます）');
      } else {
        console.log('✓ 既存のデータベースを維持します');
      }
    }

    console.log('\n✓ セットアップが完了しました！');
    console.log(`\n設定ファイルの場所: ${configPath}`);
    console.log('必要に応じて設定を編集してください。\n');

  } catch (error) {
    console.error('\n⚠️  警告: セットアップ中にエラーが発生しました');
    console.error(error.message);
    console.error('\n以下の手順で手動セットアップを行ってください:');
    console.error(`1. mkdir -p ${configDir}`);
    console.error(`2. 設定ファイルを作成: ${configPath}`);
    console.error('\nインストールは続行されます。');
  }
}

// スクリプト実行
if (require.main === module) {
  main().catch(console.error);
}