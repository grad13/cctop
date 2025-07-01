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
    moveThresholdMs: number;
    maxDepth: number;
    ignoreInitial: boolean;
    includeStats: boolean;
  };
  daemon: {
    pidFile: string;
    logFile: string;
    heartbeatIntervalMs: number;
  };
  database: {
    path: string;
    maxEvents: number;
    connectionTimeout: number;
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