/**
 * Common type definitions
 */

export interface FileEvent {
  id?: number;
  eventType: 'find' | 'create' | 'modify' | 'delete' | 'move' | 'restore';
  filePath: string;
  directory: string;
  filename: string;
  fileSize: number;
  timestamp: Date;
  inodeNumber: number;
}

export interface Config {
  watchPath: string;
  dbPath: string;
  pollingInterval: number;
}

export interface DaemonConfig {
  version: string;
  monitoring: {
    watchPaths: string[];
    excludePatterns: string[];
    debounceMs: number;
    maxDepth: number;
    moveThresholdMs: number;
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
  };
  database: {
    writeMode: string;
    syncMode: string;
    cacheSize: number;
    busyTimeout: number;
    path: string;
  };
}

export interface DaemonState {
  pid: number;
  started_by: 'cli' | 'standalone';
  started_at: number;
  config_path: string;
}

export interface EventRow {
  id: number;
  timestamp: string;
  filename: string;
  directory: string;
  event_type: string;
  size: number;
  lines?: number;
  blocks?: number;
  inode: number;
  elapsed_ms: number;
}