/**
 * Daemon Configuration Interface
 * Per FUNC-106 specification
 * @created 2026-03-13
 * @checked 2026-03-14
 * @updated 2026-03-13
 */

export interface DaemonConfig {
  version: string;
  monitoring: {
    watchPaths: string[];
    excludePatterns: string[];
    debounceMs: number;
    maxDepth: number;
    moveThresholdMs: number;
    useFsEvents?: boolean;  // macOS FSEvents (default: true). Set false to reduce disk writes
    usePolling?: boolean;   // Polling mode (default: false). Use if FSEvents causes issues
    ignoreInitial?: boolean; // Skip initial scan (default: false). Set true to reduce startup disk I/O
    startupDelayMs?: number; // Delay before starting watcher (default: 0). Set 3000-5000 to wait for FSEvents cache
    systemLimits: {
      requiredLimit: number;
      checkOnStartup: boolean;
      warnIfInsufficient: boolean;
    };
  };
  daemon: {
    pidFile: string;
    logFile: string;
    logLevel: string;
    heartbeatInterval: number;
    autoStart: boolean;
    maxRestarts: number;
    restartDelay: number;
  };
  database: {
    writeMode: string;
    syncMode: string;
    cacheSize: number;
    busyTimeout: number;
    checkpointInterval: number;
  };
}

export const defaultDaemonConfig: DaemonConfig = {
  version: "0.5.2.6",
  monitoring: {
    watchPaths: ["."],
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