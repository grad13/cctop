/**
 * Message type definitions for Status Display
 * Defines all types used by status display components
 */

export interface StatusMessage {
  text: string;
  prefix: string;
  color: string;
  type: string;
  priority: number;
  timestamp: number;
  scrollPosition: number;
  scrollDirection: number; // 1 for forward, -1 for backward
  scrollPause: number;
}

export interface ScrollState {
  position: number;
  direction: number;
  pause: number;
}

export interface MessagePriorities {
  [key: string]: number;
  error: number;
  warning: number;
  progress: number;
  info: number;
  stats: number;
}

export type MessageType = 'error' | 'warning' | 'progress' | 'info' | 'stats';
export type ScrollDirection = 1 | -1;

export interface StatusDisplayConfig {
  maxLines?: number;
  enabled?: boolean;
  scrollSpeed?: number;
  updateInterval?: number;
}

export interface StatusDisplayStatus {
  enabled: boolean;
  messageCount: number;
  maxLines: number;
  terminalWidth: number;
}

export interface DatabaseStats {
  total_events: number;
  active_files: number;
}

export interface EventStats {
  event_type: string;
  count: number;
  unique_files: number;
}

// Re-export common types for convenience
export type { 
  StatusAreaConfig,
  EventTypeRecord,
  StatusDisplay as IStatusDisplay
} from '../../types';

// Extended DatabaseManager interface with necessary methods
export interface DatabaseManager {
  isConnected(): boolean;
  all(query: string, params?: any[]): Promise<any[]>;
  get(query: string, params?: any[]): Promise<any>;
  getStats?(): Promise<{ totalEvents: number; activeFiles: number } | null>;
  dbPath?: string;
}