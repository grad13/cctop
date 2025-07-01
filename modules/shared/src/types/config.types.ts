/**
 * Configuration-related type definitions
 */

/**
 * Shared configuration (FUNC-101)
 */
export interface SharedConfig {
  version: string;
  project: {
    name: string;
    description: string;
  };
  database: {
    path: string;
    maxSize?: number;
  };
  directories: {
    config: string;
    logs: string;
    temp: string;
  };
  logging?: {
    maxFileSize?: number;
    maxFiles?: number;
    datePattern?: string;
  };
}

/**
 * Daemon configuration (FUNC-106)
 */
export interface DaemonConfig {
  watch: {
    enabled: boolean;
    paths: string[];
    ignore: string[];
    followSymlinks: boolean;
    depth?: number;
  };
  polling?: {
    interval: number;
    usePolling: boolean;
  };
  process?: {
    autoRestart: boolean;
    restartDelay: number;
    maxRestarts: number;
  };
}

/**
 * CLI configuration (FUNC-107)
 */
export interface CliConfig {
  display: {
    refreshRate: number;
    maxRows: number;
    showHidden: boolean;
  };
  polling: {
    interval: number;
  };
  colors?: {
    theme: string;
  };
}

/**
 * Complete configuration (merged)
 */
export interface CompleteConfig {
  shared: SharedConfig;
  daemon?: DaemonConfig;
  cli?: CliConfig;
}

/**
 * Configuration load options
 */
export interface ConfigLoadOptions {
  configDir?: string;
  processType?: 'daemon' | 'cli';
  createIfMissing?: boolean;
}