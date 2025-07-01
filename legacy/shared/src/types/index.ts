// Common type definitions for cctop daemon-cli architecture

export interface FileEvent {
  id?: number;
  timestamp: string;
  eventType: 'find' | 'create' | 'modify' | 'delete' | 'move';
  projectPath: string;
  fullPath: string;
  relativePath: string;
  isDirectory: boolean;
  size: number;
  lineCount: number | null;
  extension: string | null;
  depth: number;
  inode: number | null;
  parentDir: string | null;
  oldPath?: string | null;
}

export interface ProjectInfo {
  name: string;
  path: string;
  totalFiles: number;
  totalDirectories: number;
  totalSize: number;
  gitBranch?: string;
  lastActivity?: string;
}

export interface ConfigPaths {
  configDir: string;
  dataDir: string;
  logsDir: string;
  runtimeDir: string;
  tempDir: string;
  themesDir: string;
}

export interface SharedConfig {
  version: string;
  database: {
    path: string;
    walMode: boolean;
  };
  directories: ConfigPaths;
  project: {
    name: string;
    rootPath: string;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    maxFileSize: number;
    maxFiles: number;
  };
}

export interface DaemonConfig {
  process: {
    pidFile: string;
    socketFile: string;
  };
  monitoring: {
    ignored: string[];
    followSymlinks: boolean;
    awaitWriteFinish: {
      stabilityThreshold: number;
      pollInterval: number;
    };
  };
  events: {
    batchSize: number;
    flushInterval: number;
  };
}

export interface CLIConfig {
  display: {
    refreshRate: number;
    maxRows: number;
    colorEnabled: boolean;
    theme: string;
  };
  polling: {
    interval: number;
  };
  interactive: {
    keyBindings: Record<string, string>;
  };
}