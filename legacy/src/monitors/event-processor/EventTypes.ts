/**
 * Event Types and Interfaces
 * Core type definitions for event processing system
 */

import { EventEmitter } from 'events';
import { FilterState, EventType } from '../../types';

/**
 * File event input from monitoring system
 */
export interface FileEventInput {
  type: string;
  path: string;
  stats?: any;
  retryCount?: number;
}

/**
 * File event metadata for recording
 */
export interface FileEventMetadata {
  file_path: string;
  file_name: string;
  directory: string;
  timestamp: number;
  file_size?: number;
  inode?: number | null;
  line_count?: number | null;
  block_count?: number;
  event_type?: EventType;
}

/**
 * Processed event result
 */
export interface ProcessedEventResult {
  original: FileEventInput;
  recorded: {
    id: number;
    event_type: EventType;
  } & FileEventMetadata;
  eventType: EventType;
}

/**
 * Event processing error
 */
export interface EventProcessingError {
  event: FileEventInput;
  error: Error;
}

/**
 * Move detection info for tracking file moves
 */
export interface MoveDetectionInfo {
  inode: number;
  timestamp: number;
}

/**
 * Event processor statistics
 */
export interface EventProcessorStats {
  isInitialScanMode: boolean;
  processedEvents: number;
  errors: number;
}

/**
 * Event processor configuration
 */
export interface EventProcessorConfig {
  monitoring?: {
    eventFilters?: FilterState;
  };
  [key: string]: any;
}

/**
 * Database manager interface (minimal)
 */
export interface DatabaseManager {
  isInitialized: boolean;
  db: any;
  recordEvent(metadata: FileEventMetadata & { event_type: EventType }): Promise<number>;
  findByPath(path: string): Promise<any>;
  get(query: string, params?: any[]): Promise<any>;
}

/**
 * Event type mapping
 */
export const EVENT_TYPE_MAPPING: Record<string, EventType> = {
  'find': 'find',
  'create': 'create',
  'modify': 'modify',
  'delete': 'delete',
  'move': 'move'
};

/**
 * Text file extensions for line counting
 */
export const TEXT_EXTENSIONS = [
  '.txt', '.js', '.ts', '.jsx', '.tsx', '.json', '.md', '.py', '.java', '.c', '.cpp', '.h',
  '.css', '.html', '.xml', '.yaml', '.yml', '.ini', '.cfg', '.conf', '.log',
  '.sql', '.sh', '.bash', '.zsh', '.fish', '.ps1', '.rb', '.php', '.go', '.rs', '.swift'
];

/**
 * Constants
 */
export const BLOCK_SIZE = 512;
export const RESTORE_TIME_LIMIT = 5 * 60 * 1000; // 5 minutes
export const DEFAULT_MOVE_DETECTION_WINDOW = 1000; // 1 second
export const MAX_RETRY_COUNT = 10;
export const RETRY_DELAY = 100; // ms
export const MAX_EVENT_QUEUE_SIZE = 1000;

// Re-export types from common
export { FilterState, EventType };