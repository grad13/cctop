/**
 * Config Factory
 * Generates initial configuration schemas for .cctop setup
 * @created 2026-03-14
 * @checked 2026-03-14
 * @updated 2026-03-14
 */

import * as path from 'path';

export class ConfigFactory {
  createSharedConfig(): object {
    return {
      version: "0.5.2.6",
      project: {
        name: path.basename(process.cwd()),
        description: "Code Change Top - Real-time file monitoring tool"
      },
      database: {
        path: ".cctop/data/activity.db",
        maxSize: 104857600
      },
      directories: {
        config: ".cctop/config",
        themes: ".cctop/themes",
        data: ".cctop/data",
        logs: ".cctop/logs",
        runtime: ".cctop/runtime",
        temp: ".cctop/temp"
      },
      logging: {
        maxFileSize: 10485760,
        maxFiles: 5,
        datePattern: "YYYY-MM-DD"
      }
    };
  }

  createDaemonConfig(): object {
    return {
      version: "0.5.2.6",
      monitoring: {
        watchPaths: [],
        excludePatterns: [
          "**/node_modules/**",
          "**/.git/**",
          "**/.*",
          "**/.cctop/**",
          "**/dist/**",
          "**/coverage/**",
          "**/build/**",
          "**/*.log",
          "**/.DS_Store"
        ],
        debounceMs: 100,
        maxDepth: 10,
        moveThresholdMs: 100,
        systemLimits: {
          requiredLimit: 524288,
          checkOnStartup: true,
          warnIfInsufficient: true
        }
      },
      daemon: {
        pidFile: ".cctop/runtime/daemon.pid",
        logFile: ".cctop/logs/daemon.log",
        logLevel: "info",
        heartbeatInterval: 30000,
        autoStart: true,
        maxRestarts: 3,
        restartDelay: 5000
      },
      database: {
        writeMode: "WAL",
        syncMode: "NORMAL",
        cacheSize: 65536,
        busyTimeout: 5000,
        checkpointInterval: 300000
      }
    };
  }

  createCliConfig(): object {
    return {
      version: "0.5.2.6",
      display: {
        maxRows: 20,
        refreshInterval: 100,
        refreshRateMs: 100,
        showTimestamps: true,
        dateFormat: "YYYY-MM-DD HH:mm:ss",
        columnWidths: {
          time: 19,
          event: 8,
          size: 7,
          path: 40
        },
        columns: {
          timestamp: { visible: true, width: 19 },
          elapsed: { visible: true, width: 8 },
          fileName: { visible: true, width: 35 },
          event: { visible: true, width: 6 },
          lines: { visible: true, width: 6 },
          blocks: { visible: true, width: 4 },
          size: { visible: true, width: 7 },
          directory: { visible: true, width: -1 }
        },
        directoryMutePaths: []
      },
      interaction: {
        enableMouse: true,
        enableKeyboard: true,
        scrollSpeed: 3
      },
      colors: {
        info: 'white',
        success: 'green',
        warning: 'yellow',
        error: 'red',
        find: 'cyan',
        create: 'green',
        modify: 'yellow',
        delete: 'red',
        move: 'blue',
        restore: 'magenta'
      },
      logFile: "./logs/cli.log"
    };
  }

  createDefaultTheme(): object {
    return {
      name: "default",
      colors: {
        background: "black",
        foreground: "white",
        border: "gray",
        highlight: "cyan",
        event: {
          create: "green",
          modify: "yellow",
          delete: "red",
          move: "blue"
        },
        ui: {
          statusBar: "blue",
          searchBox: "cyan",
          selection: "white"
        }
      }
    };
  }

  createHighContrastTheme(): object {
    return {
      name: "high-contrast",
      colors: {
        background: "black",
        foreground: "white",
        border: "white",
        highlight: "yellow",
        event: {
          create: "bright-green",
          modify: "bright-yellow",
          delete: "bright-red",
          move: "bright-blue"
        },
        ui: {
          statusBar: "bright-blue",
          searchBox: "bright-cyan",
          selection: "bright-white"
        }
      }
    };
  }
}
