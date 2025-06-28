/**
 * Common Type Definitions for cctop
 * Shared interfaces and types across the application
 */

// File system event types
export type EventType = 'find' | 'create' | 'modify' | 'delete' | 'move' | 'restore';

// File event interface
export interface FileEvent {
  path: string;
  event_type: EventType;
  timestamp: number;
  size?: number;
  inode?: number;
}

// Filter configuration
export interface FilterState {
  find: boolean;
  create: boolean;
  modify: boolean;
  delete: boolean;
  move: boolean;
  restore: boolean;
}

// Inotify Checker interfaces
export interface InotifyLimitResult {
  status: 'sufficient' | 'insufficient' | 'unknown';
  canCheck: boolean;
  current?: number;
  required?: number;
  shortage?: number;
  message: string;
}

// Progressive Loader interfaces
export interface ProgressiveLoaderConfig {
  batchSize?: number;
  loadDelay?: number;
}

export interface LoadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface LoaderStats {
  loadedCount: number;
  batchSize: number;
  loadDelay: number;
}

// Database Manager interface (for Progressive Loader dependency)
export interface DatabaseManager {
  getEventCount(): Promise<number>;
  getEventsBatch(offset: number, limit: number): Promise<any[]>;
  getRecentEvents(limit: number): Promise<any[]>;
}

// Display Manager interface (for Progressive Loader dependency)
export interface DisplayManager {
  addEvents?(events: any[]): void;
}

// Status Display interface (for Progressive Loader dependency)
export interface StatusDisplay {
  updateMessage(message: string): void;
}

// CLI Interface options
export interface CLIInterfaceOptions {
  input?: NodeJS.ReadableStream;
  output?: NodeJS.WritableStream;
}

// Key mapping for event filters
export interface KeyMapping {
  [key: string]: EventType;
}

// Filter change event
export interface FilterChangeEvent {
  eventType: EventType | 'all';
  isVisible: boolean;
  allFilters: FilterState;
}

// Configuration related interfaces
export interface MonitoringConfig {
  eventFilters?: Partial<FilterState>;
  timeout?: number;
  maxEvents?: number;
}

export interface Config {
  monitoring?: MonitoringConfig;
  [key: string]: any;
}

// Utility types for async operations
export type PromiseResolve<T> = (value: T | PromiseLike<T>) => void;
export type PromiseReject = (reason?: any) => void;

// Theme system types
export interface ThemeColors {
  table: {
    column_headers: string;
    row: {
      event_timestamp: string;
      elapsed_time: string;
      file_name: string;
      event_type: {
        [K in EventType]: string;
      };
      lines: string;
      blocks: string;
      directory: string;
    };
  };
  status_bar: {
    label: string;
    count: string;
    separator: string;
  };
  general_keys: {
    key_active: string;
    key_inactive: string;
    label_active: string;
    label_inactive: string;
  };
  event_filters: {
    key_active: string;
    key_inactive: string;
    label_active: string;
    label_inactive: string;
  };
  message_area: {
    prompt: string;
    label: string;
    status: string;
    pid: string;
    summary: string;
  };
}

export interface ThemeData {
  name: string;
  description: string;
  version: string;
  colors: ThemeColors;
}

export interface ThemeInfo {
  name: string;
  displayName: string;
  description: string;
}

// ColorManager specific types
export interface ColorMap {
  [colorName: string]: string;
}

export interface RGBColor {
  hex: string;
  valid: boolean;
}

export interface ColorConfig {
  configPath: string;
  currentThemeFile: string;
  themesDir: string;
}

export interface ThemeMetadata {
  name: string;
  description: string;
  version: string;
  lastUpdated: string;
}

export interface FullThemeData extends ThemeMetadata {
  colors: ThemeColors;
}

export interface ThemeInfoResult {
  name: string;
  description: string;
  version: string;
  lastUpdated: string;
}