/**
 * Configuration Type Definitions for cctop
 * Application configuration interfaces
 */

// Progressive loader configuration
export interface ProgressiveLoaderConfig {
  batchSize?: number;
  loadDelay?: number;
}

// Load progress tracking
export interface LoadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// Loader statistics
export interface LoaderStats {
  loadedCount: number;
  batchSize: number;
  loadDelay: number;
}

// Monitoring configuration
export interface MonitoringConfig {
  targetPath: string;
  recursive: boolean;
  eventFilters?: FilterConfig;
}

// Filter configuration
export interface FilterConfig {
  [key: string]: boolean;
}

// Main configuration interface
export interface Config {
  targetPath: string;
  recursive?: boolean;
  updateInterval?: number;
  verbose?: boolean;
  debug?: boolean;
  noInitialScan?: boolean;
  theme?: string;
  maxDisplayEvents?: number;
  maxDatabaseEvents?: number;
  noDatabase?: boolean;
  databasePath?: string;
  monitoring?: MonitoringConfig;
}

// CLI arguments interface
export interface CLIArgs {
  path?: string;
  recursive?: boolean;
  global?: boolean;
  interval?: number;
  verbose?: boolean;
  debug?: boolean;
  'no-initial-scan'?: boolean;
  theme?: string;
  'max-display'?: number;
  'max-database'?: number;
  'no-database'?: boolean;
  'database-path'?: string;
  version?: boolean;
  help?: boolean;
  restore?: boolean;
  test?: boolean;
  'test-mode'?: string;
  _?: string[];
}

// Config manager options
export interface ConfigManagerOptions {
  cliArgs?: CLIArgs;
  verbose?: boolean;
}

// Render controller configuration
export interface RenderControllerConfig {
  renderInterval?: number;
  clearOnRender?: boolean;
  maxEvents?: number;
  configPath?: string;
}

// Event processor configuration
export interface EventProcessorConfig {
  maxRetries?: number;
  retryDelay?: number;
  enableCache?: boolean;
  cacheSize?: number;
}

// Display configuration
export interface DisplayConfig {
  maxEvents?: number;
  showHeader?: boolean;
  showFooter?: boolean;
  showTimestamp?: boolean;
  colorEnabled?: boolean;
  theme?: string;
}

// Monitor configuration
export interface MonitorConfig {
  paths: string[];
  recursive: boolean;
  ignored?: string[];
  followSymlinks?: boolean;
  usePolling?: boolean;
  interval?: number;
  binaryInterval?: number;
  awaitWriteFinish?: boolean | {
    stabilityThreshold?: number;
    pollInterval?: number;
  };
}

// Application configuration (full)
export interface AppConfig extends Config {
  monitoring: MonitoringConfig;
  display: DisplayConfig;
  database: DatabaseConfig;
  monitor: MonitorConfig;
}

// Configuration validation result
export interface ConfigValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

// Database configuration is exported from database.types.ts

// Re-import DatabaseConfig from database.types
import { DatabaseConfig } from './database.types';

// Full configuration structure
export interface FullConfig {
  version: string;
  monitoring: MonitoringConfig;
  database: DatabaseConfig;
  display: DisplayConfig;
}