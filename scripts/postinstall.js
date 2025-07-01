#!/usr/bin/env node

/**
 * cctop postinstall script (FUNC-013準拠)
 * npm install時に~/.cctopディレクトリとデフォルト設定ファイルを自動作成
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const cctopDir = path.join(os.homedir(), '.cctop');
const configPath = path.join(cctopDir, 'config.json');

// 既存なら終了
if (fs.existsSync(cctopDir)) {
  process.exit(0);
}

try {
  // ディレクトリ作成
  fs.mkdirSync(cctopDir, { recursive: true });

  // デフォルト設定（v0.2.0.0準拠）
  const defaultConfig = {
    "version": "0.2.0",
    "monitoring": {
      "watchPaths": [],
      "excludePatterns": [
        "**/node_modules/**",
        "**/.git/**",
        "**/.DS_Store",
        "**/.cctop/**",
        "**/coverage/**",
        "**/*.log"
      ],
      "debounceMs": 100,
      "maxDepth": 10,
      "eventFilters": {
        "find": true,
        "create": true,
        "modify": true,
        "delete": true,
        "move": true,
        "restore": true
      },
      "inotify": {
        "requiredMaxUserWatches": 524288,
        "checkOnStartup": true,
        "warnIfInsufficient": true,
        "recommendedValue": 524288
      }
    },
    "database": {
      "path": path.join(cctopDir, "activity.db"),
      "mode": "WAL"
    },
    "display": {
      "maxEvents": 20,
      "refreshRateMs": 100
    }
  };

  // config.json作成
  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  
  // 成功時は何も出力しない（FUNC-013準拠）
} catch (error) {
  // エラー時も静かに終了（npm installを妨げない）
  process.exit(0);
}