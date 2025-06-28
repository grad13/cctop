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