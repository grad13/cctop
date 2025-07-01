/**
 * 起動テスト用シナリオデータ
 * テストロジックとデータを分離
 */

const path = require('path');
const os = require('os');

/**
 * 起動シナリオの定義
 * 仕様書（PLAN-20250624-001）に基づく期待動作を定義
 */
const startupScenarios = [
  {
    name: 'clean start with defaults',
    description: '初回起動時、デフォルト設定での動作',
    setup: async (testDir) => {
      // クリーンな環境を準備（特に何もしない）
    },
    input: {
      args: [],
      env: { NODE_ENV: 'test' },
      cwd: null // testDirを使用
    },
    expectations: {
      exitCode: 0,
      maxDuration: 3000, // 仕様書: 起動時間 < 3秒
      sideEffects: {
        // 仕様書86-89行目: ~/.cctop/ディレクトリ構造
        creates: [
          path.join(os.homedir(), '.cctop'),
          path.join(os.homedir(), '.cctop', 'activity.db'), // 仕様書: activity.db
          path.join(os.homedir(), '.cctop', 'config.json')
        ],
        // 間違ったファイル名や場所に作成されないことを確認
        notCreates: [
          './~', // リテラルな ~ ディレクトリ
          './events.db', // 間違ったDB名
          'events.db',
          path.join(os.homedir(), '.cctop', 'events.db'), // 間違ったDB名
          './activity.db' // ローカルディレクトリに作成されない
        ]
      },
      // デバッグメッセージではなく、動作を確認
      behavior: {
        startsWatching: true, // ファイル監視が開始される
        createsDatabase: true, // DBが作成される
        loadsConfig: true // 設定が読み込まれる
      }
    }
  },
  
  {
    name: 'start with existing config',
    description: '既存の設定ファイルがある場合の起動',
    setup: async (testDir) => {
      // ~/.cctop/config.json を事前に作成
      const configDir = path.join(os.homedir(), '.cctop');
      const fs = require('fs');
      fs.mkdirSync(configDir, { recursive: true });
      
      // 仕様書のネスト構造（188行目）に準拠
      const config = {
        version: "0.1.0",
        monitoring: {
          watchPaths: ["./src"],
          excludePatterns: ["**/node_modules/**", "**/.git/**"],
          debounceMs: 50,
          maxDepth: 5
        },
        database: {
          path: "~/.cctop/activity.db",
          mode: "WAL"
        },
        display: {
          maxLines: 25,
          refreshRateMs: 100
        }
      };
      
      fs.writeFileSync(
        path.join(configDir, 'config.json'),
        JSON.stringify(config, null, 2)
      );
    },
    input: {
      args: [],
      env: { NODE_ENV: 'test' }
    },
    expectations: {
      exitCode: 0,
      maxDuration: 1500, // 既存設定で高速化
      sideEffects: {
        creates: [
          path.join(os.homedir(), '.cctop', 'activity.db')
        ],
        notCreates: [
          './events.db',
          './activity.db'
        ]
      },
      behavior: {
        usesExistingConfig: true,
        watchPaths: ['./src'] // 設定が反映される
      }
    }
  },
  
  {
    name: 'start with custom config path',
    description: 'カスタム設定ファイルを指定した起動',
    setup: async (testDir) => {
      const fs = require('fs');
      const configPath = path.join(testDir, 'custom-config.json');
      
      // カスタム設定（仕様書のネスト構造に準拠）
      const config = {
        version: "0.1.0",
        monitoring: {
          watchPaths: ["./test"],
          excludePatterns: ["**/*.tmp"],
          debounceMs: 200
        },
        database: {
          // カスタムDBパス（テスト用）
          path: path.join(testDir, 'test-activity.db')
        },
        display: {
          maxLines: 10
        }
      };
      
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      return { configPath };
    },
    input: {
      args: ['--config'],  // configPathは動的に追加
      env: { NODE_ENV: 'test' }
    },
    expectations: {
      exitCode: 0,
      maxDuration: 2000,
      sideEffects: {
        creates: [], // 動的にsetupで設定
        notCreates: [
          path.join(os.homedir(), '.cctop', 'activity.db'), // デフォルトは作成されない
          './events.db'
        ]
      },
      behavior: {
        usesCustomConfig: true,
        watchPaths: ['./test']
      }
    }
  },
  
  {
    name: 'recovery from corrupted database',
    description: '破損したDBファイルからの回復',
    setup: async (testDir) => {
      const fs = require('fs');
      const dbDir = path.join(os.homedir(), '.cctop');
      fs.mkdirSync(dbDir, { recursive: true });
      
      // 破損したDBファイルを作成
      fs.writeFileSync(
        path.join(dbDir, 'activity.db'),
        'CORRUPTED DATA - NOT A VALID SQLITE FILE'
      );
    },
    input: {
      args: [],
      env: { NODE_ENV: 'test' }
    },
    expectations: {
      exitCode: 0,
      maxDuration: 4000, // 回復処理で時間がかかる可能性
      sideEffects: {
        creates: [
          // バックアップと新規DBが作成される想定
          path.join(os.homedir(), '.cctop', 'activity.db')
        ],
        modified: [
          path.join(os.homedir(), '.cctop', 'activity.db')
        ]
      },
      behavior: {
        recoversFromCorruption: true,
        createsBackup: true
      }
    }
  }
];

module.exports = {
  startupScenarios
};