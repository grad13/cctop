/**
 * Process Type Definitions for cctop
 * File monitoring and process management interfaces
 */

import { EventType } from './event.types';

// File monitor interface
export interface FileMonitor {
  start(): Promise<void>;
  stop(): void;
  on(event: 'change', handler: (event: FileChangeEvent) => void): void;
  on(event: 'error', handler: (error: Error) => void): void;
  on(event: 'ready', handler: () => void): void;
  getWatchedPaths(): string[];
  isRunning(): boolean;
}

// File change event
export interface FileChangeEvent {
  type: EventType;
  path: string;
  oldPath?: string;
  stats?: FileStats;
}

// File statistics
export interface FileStats {
  size: number;
  mtime: number;
  isDirectory: boolean;
  isFile: boolean;
  isSymbolicLink: boolean;
  ino?: number;
}

// Monitor status
export interface MonitorStatus {
  running: boolean;
  paths: string[];
  eventCount: number;
  lastEvent?: FileChangeEvent;
  startTime?: number;
  errors: Error[];
}

// Viewer process configuration
export interface ViewerProcessConfig {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  detached?: boolean;
  shell?: boolean;
  baseDir?: string;
  database?: any;
}

// Viewer process interface
export interface ViewerProcess {
  start(): Promise<void>;
  stop(): Promise<void>;
  restart(): Promise<void>;
  isRunning(): boolean;
  getPid(): number | null;
  getStatus(): ProcessStatus;
}

// Process status
export interface ProcessStatus {
  running: boolean;
  pid?: number;
  startTime?: number;
  exitCode?: number;
  signal?: string;
  error?: Error;
  status?: string;  // Additional status info
  started_by?: string;  // Who started the process
}

// Process manager interface
export interface ProcessManager {
  startMonitor(config: MonitorProcessConfig): Promise<number>;
  stopMonitor(pid: number): Promise<boolean>;
  restartMonitor(pid: number): Promise<number>;
  isMonitorRunning(pid: number): Promise<boolean>;
  getMonitorStatus(pid?: number): Promise<ProcessStatus | null>;
  getAllMonitors(): Promise<MonitorInfo[]>;
}

// Monitor process configuration
export interface MonitorProcessConfig {
  targetPath: string;
  recursive?: boolean;
  configPath?: string;
  verbose?: boolean;
  debug?: boolean;
}

// Monitor information
export interface MonitorInfo {
  pid: number;
  targetPath: string;
  recursive: boolean;
  startTime: number;
  status: ProcessStatus;
}

// Process control interface
export interface ProcessControl {
  start(): Promise<void>;
  stop(): Promise<void>;
  restart(): Promise<void>;
  getStatus(): ProcessStatus;
}

// Monitor controller interface
export interface MonitorController {
  startMonitoring(paths: string[], recursive?: boolean): Promise<void>;
  stopMonitoring(): Promise<void>;
  restartMonitoring(): Promise<void>;
  isMonitoring(): boolean;
  getMonitoringStatus(): MonitorStatus;
  on(event: 'file-change', handler: (event: FileChangeEvent) => void): void;
  on(event: 'error', handler: (error: Error) => void): void;
  on(event: 'stopped', handler: () => void): void;
}

// Process lifecycle events
export interface ProcessLifecycleEvents {
  onStart?: () => void | Promise<void>;
  onStop?: () => void | Promise<void>;
  onRestart?: () => void | Promise<void>;
  onError?: (error: Error) => void;
  onExit?: (code: number | null, signal: string | null) => void;
}

// Monitor options
export interface MonitorOptions {
  recursive?: boolean;
  ignored?: string[];
  persistent?: boolean;
  ignoreInitial?: boolean;
  followSymlinks?: boolean;
  usePolling?: boolean;
  interval?: number;
  binaryInterval?: number;
  alwaysStat?: boolean;
  depth?: number;
  awaitWriteFinish?: boolean | {
    stabilityThreshold?: number;
    pollInterval?: number;
  };
}

// Additional process types
export interface ViewerStatus {
  running: boolean;
  isRunning?: boolean;  // Alias for backward compatibility
  monitorPid?: number;
  displayPid?: number;
  startTime?: number;
  error?: Error | string;
  pid?: number;
  databaseConnected?: boolean;
  displayActive?: boolean;
}

export interface ProcessMonitorStatus extends ProcessStatus {
  targetPath?: string;
  eventCount?: number;
  status?: string;  // Override to ensure it's available
}

export interface StartMonitorOptions {
  targetPath: string;
  recursive?: boolean;
  configPath?: string;
  verbose?: boolean;
  debug?: boolean;
}

export interface ProcessManagerConfig {
  pidFile?: string;
  logFile?: string;
  maxRetries?: number;
}

// File monitor config
export interface FileMonitorConfig {
  paths: string[];
  watchPaths?: string[];  // Alias for paths
  excludePatterns?: string[];  // Alias for ignored
  recursive?: boolean;
  ignored?: string[];
  persistent?: boolean;
  ignoreInitial?: boolean;
  followSymlinks?: boolean;
  usePolling?: boolean;
  interval?: number;
  binaryInterval?: number;
  alwaysStat?: boolean;
  depth?: number;
  awaitWriteFinish?: boolean | {
    stabilityThreshold?: number;
    pollInterval?: number;
  };
  atomic?: number;  // Atomic write delay
}

// Chokidar options (same as FileMonitorConfig for now)
export type ChokidarOptions = FileMonitorConfig;

// File monitor event
export interface FileMonitorEvent extends FileChangeEvent {
  timestamp?: number;
}

// File monitor stats
export interface FileMonitorStats {
  paths: string[];
  watchedPaths?: string[];  // Alias for paths
  fileCount: number;
  eventCount: number;
  running: boolean;
  startTime?: number;
  ignored?: string[];
}

// Config manager interface
export interface ConfigManager {
  get(key: string): any;
  set(key: string, value: any): void;
  getConfig(): any;
  saveConfig(): void;
}