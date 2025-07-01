/**
 * Process type definitions and interfaces
 * Centralizes all type definitions for process management
 */

// Process information stored in PID file
export interface PidInfo {
  pid: number;
  started_by: string;
  started_at: number | null;
  startTime: string | null;
  scriptPath: string | null;
  processName?: string;
  parentPid?: number;
  config_path: string | null;
}

// Process status information
export interface ProcessMonitorStatus {
  status: 'running' | 'stopped' | 'stale' | 'error';
  running: boolean;
  pid: number | null;
  started_by?: string;
  started_at?: number;
  startTime: string | null;
  scriptPath?: string;
  config_path?: string;
  uptime?: number | null;
  error?: string;
}

// Process manager configuration
export interface ProcessManagerConfig {
  baseDir?: string;
  processName?: string;
  maxLogSize?: number;
  logRetentionCount?: number;
  processTimeout?: number;
  configFile?: string;
}

// Process start options
export interface ProcessManagerOptions {
  started_by?: string;
  configFile?: string;
  logLevel?: string;
  [key: string]: any;
}

// Log backup file information
export interface LogBackupFile {
  name: string;
  path: string;
  timestamp: number;
}

// Process signals
export type ProcessSignal = 'SIGTERM' | 'SIGKILL' | 'SIGINT';

// Log levels
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Lock file options
export interface LockFileOptions {
  exclusive?: boolean;
  timeout?: number;
}

// Process validation result
export interface ProcessValidationResult {
  valid: boolean;
  error?: string;
  details?: {
    pidExists?: boolean;
    processRunning?: boolean;
    pidFileValid?: boolean;
  };
}

// PID file statistics
export interface PidFileStats {
  exists: boolean;
  size?: number;
  modified?: Date;
  valid?: boolean;
  pidInfo?: PidInfo | null;
  error?: string;
}

// Logger status information
export interface LoggerStatus {
  logFile: string;
  size?: number;
  maxSize?: number;
  needsRotation?: boolean;
  backupCount?: number;
  retentionCount?: number;
  error?: string;
}

// Controller status information
export interface ControllerStatus {
  timeout: number;
  config: ProcessManagerConfig;
}

// Integrated status information
export interface IntegratedStatus {
  process: ProcessMonitorStatus;
  pidFile: PidFileStats;
  logger: LoggerStatus;
  controller: ControllerStatus;
}

// Process cleanup options
export interface ProcessCleanupOptions {
  forceful?: boolean;
  timeout?: number;
  removeFiles?: boolean;
}

// Event types for process lifecycle
export type ProcessEvent = 'start' | 'stop' | 'error' | 'restart' | 'stale';

// Process error types
export enum ProcessErrorType {
  START_FAILED = 'START_FAILED',
  STOP_FAILED = 'STOP_FAILED',
  PID_FILE_ERROR = 'PID_FILE_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  LOCK_ERROR = 'LOCK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

// Process error interface
export interface ProcessError extends Error {
  type: ProcessErrorType;
  pid?: number;
  details?: any;
}