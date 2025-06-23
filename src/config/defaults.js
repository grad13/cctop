/**
 * Default Configuration (a002準拠)
 * PLAN-20250624-001に記載されたデフォルト設定
 */

const os = require('os');
const path = require('path');

module.exports = {
  monitoring: {
    watchPaths: ['.'],
    excludePatterns: [
      '**/node_modules/**',
      '**/.git/**',
      '**/.DS_Store',
      '**/.cctop/**',
      '**/coverage/**',
      '**/*.log'
    ],
    debounceMs: 100,
    maxDepth: 10
  },
  database: {
    path: path.join(os.homedir(), '.cctop', 'activity.db'),  // ユーザーディレクトリ配下
    mode: 'WAL'
  },
  display: {
    maxLines: 50,
    refreshRateMs: 100
  }
};