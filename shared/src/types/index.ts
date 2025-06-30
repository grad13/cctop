/**
 * Central export for all type definitions
 */

// Event types
export * from './event.types';

// File types
export * from './file.types';

// Configuration types
export * from './config.types';

// Database types
export * from './database.types';

// Common types
export interface Timestamp {
  seconds: number;
  nanoseconds?: number;
}

export interface ErrorInfo {
  code: string;
  message: string;
  details?: any;
}

export type ProcessType = 'daemon' | 'cli';

export interface Version {
  major: number;
  minor: number;
  patch: number;
  build: number;
}