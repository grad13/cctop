/**
 * Configuration type definitions
 * Centralizes all configuration-related types and interfaces
 */

import { FilterState } from '../../types';

// Main configuration structure
export interface FullConfig {
  version: string;
  monitoring: MonitoringConfig;
  database: DatabaseConfig;
  display: DisplayConfig;
}

// Monitoring configuration
export interface MonitoringConfig {
  watchPaths: string[];
  excludePatterns: string[];
  debounceMs: number;
  maxDepth: number;
  eventFilters: FilterState;
  inotify: InotifyConfig;
  backgroundMonitor: BackgroundMonitorConfig;
}

// Inotify configuration
export interface InotifyConfig {
  requiredMaxUserWatches: number;
  checkOnStartup: boolean;
  warnIfInsufficient: boolean;
  recommendedValue: number;
}

// Background monitor configuration
export interface BackgroundMonitorConfig {
  enabled: boolean;
  logLevel: string;
  heartbeatInterval: number;
}

// Database configuration
export interface DatabaseConfig {
  path: string;
  mode: string;
}

// Display configuration
export interface DisplayConfig {
  maxEvents: number;
  refreshRateMs: number;
  statusArea: StatusAreaConfig;
}

// Status area configuration
export interface StatusAreaConfig {
  maxLines: number;
  enabled: boolean;
  scrollSpeed: number;
  updateInterval: number;
}

// Configuration validation result
export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  normalizedConfig?: FullConfig;
}

// Configuration manager options
export interface ConfigManagerOptions {
  interactive?: boolean;
  cliInterface?: any;
  promptHandler?: (dirPath: string) => Promise<boolean>;
}

// CLI arguments
export interface CLIArgs {
  config?: string;
  watchPath?: string | string[];
  dbPath?: string;
  maxLines?: string | number;
}

// Configuration paths
export interface ConfigPaths {
  configFile: string;
  configDir: string;
  databasePath: string;
}

// Configuration error types
export enum ConfigErrorType {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  INVALID_JSON = 'INVALID_JSON',
  MISSING_REQUIRED = 'MISSING_REQUIRED',
  INVALID_TYPE = 'INVALID_TYPE',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  SAVE_FAILED = 'SAVE_FAILED',
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
  FILE_SYSTEM_ERROR = 'FILE_SYSTEM_ERROR'
}

// Configuration error
export class ConfigError extends Error {
  constructor(
    public type: ConfigErrorType,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ConfigError';
  }
}

// Default configuration values
export const DEFAULT_CONFIG: FullConfig = {
  version: "0.1.0",
  monitoring: {
    watchPaths: ['.'],
    excludePatterns: [
      "**/node_modules/**",
      "**/.git/**",
      "**/.*",
      "**/.cctop/**"
    ],
    debounceMs: 100,
    maxDepth: 10,
    eventFilters: {
      find: true,
      create: true,
      modify: true,
      delete: true,
      move: true,
      restore: true
    },
    inotify: {
      requiredMaxUserWatches: 524288,
      checkOnStartup: true,
      warnIfInsufficient: true,
      recommendedValue: 524288
    },
    backgroundMonitor: {
      enabled: true,
      logLevel: "info",
      heartbeatInterval: 30000
    }
  },
  database: {
    path: "./.cctop/activity.db",
    mode: "WAL"
  },
  display: {
    maxEvents: 20,
    refreshRateMs: 100,
    statusArea: {
      maxLines: 3,
      enabled: true,
      scrollSpeed: 200,
      updateInterval: 5000
    }
  }
};

// Required configuration fields
export const REQUIRED_FIELDS = [
  'database.path',
  'display.maxEvents',
  'monitoring.watchPaths'
];

// Field validation rules
export interface ValidationRule {
  path: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  validator?: (value: any) => boolean;
}

// Validation schema
export const VALIDATION_SCHEMA: ValidationRule[] = [
  {
    path: 'version',
    type: 'string',
    required: true,
    pattern: /^\d+\.\d+\.\d+$/
  },
  {
    path: 'monitoring.watchPaths',
    type: 'array',
    required: true,
    validator: (value) => Array.isArray(value) && value.length > 0
  },
  {
    path: 'monitoring.debounceMs',
    type: 'number',
    min: 0,
    max: 10000
  },
  {
    path: 'display.maxEvents',
    type: 'number',
    required: true,
    min: 1,
    max: 1000
  },
  {
    path: 'database.path',
    type: 'string',
    required: true
  }
];