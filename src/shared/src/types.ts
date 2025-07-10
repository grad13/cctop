/**
 * Common type definitions
 */

export interface FileEvent {
  id?: number;
  eventType: 'find' | 'create' | 'modify' | 'delete' | 'move' | 'restore';
  eventTypeId?: number;
  fileId?: number;
  filePath: string;
  directory: string;
  fileName: string;
  timestamp: Date;
  inode?: number;
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
    path: string;
    writeMode: string;
    syncMode: string;
    cacheSize: number;
    busyTimeout: number;
  };
}

export interface DaemonState {
  pid: number;
  started_at: number;
  working_directory: string;
  watch_paths: string[];
  config_path: string;
}