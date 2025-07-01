/**
 * Configuration types for shared, daemon, and CLI settings
 */

// Shared configuration (FUNC-101)
export interface SharedConfig {
  version: string;
  project: {
    name: string;
    rootPath: string;
    excludePaths: string[];
  };
  database: {
    path: string;
    walMode: boolean;
    busyTimeout: number;
  };
  directories: {
    config: string;
    themes: string;
    data: string;
    logs: string;
    runtime: string;
    temp: string;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    maxFiles: number;
    maxSize: string; // e.g., "10MB"
  };
}

// CLI configuration (FUNC-107)
export interface CLIConfig {
  version: string;
  display: {
    maxEvents: number;
    refreshRateMs: number;
    dateFormat: string;
    columns: {
      [key: string]: {
        width: number | 'auto';
        visible: boolean;
      };
    };
  };
  colors: {
    [eventType: string]: string;
  };
  statusArea: {
    maxLines: number;
    enabled: boolean;
    scrollSpeed: number;
    updateInterval: number;
  };
  interactive: {
    keyRepeatDelay: number;
    keyRepeatInterval: number;
    selectionHighlight: string;
    detailViewPosition: 'bottom' | 'right';
  };
  locale: {
    language: string;
    timezone: string;
  };
}

// Configuration loading options
export interface ConfigOptions {
  configDir?: string;
  overrides?: Partial<SharedConfig | CLIConfig>;
}