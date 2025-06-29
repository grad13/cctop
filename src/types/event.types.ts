/**
 * Event Type Definitions for cctop
 * File system event types and related interfaces
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

// Event data for display
export interface EventData {
  id?: number;
  event_type: EventType;
  file_path: string;
  path?: string;  // Alias for file_path
  file_name?: string;
  directory?: string;
  type: string;
  event_time: string;
  event_code: string;
  file_size: string;
  size_bytes?: number;
  lines?: number;
  line_count?: number;  // Alias for lines
  block_count?: number;
  relative_path: string;
  color_code?: string;
  timestamp?: number;
  elapsed_ms?: number;
}

// File event input for processing
export interface FileEventInput {
  path: string;
  eventType: EventType;
  timestamp: number;
  size?: number;
  inode?: number;
  oldPath?: string;
}

// File event metadata
export interface FileEventMetadata {
  path: string;
  file_path?: string;  // Alias for path
  file_name?: string;
  directory?: string;
  size: number;
  file_size?: number;  // Alias for size
  line_count?: number;
  block_count?: number;
  inode: number | null;
  type: 'file' | 'directory' | 'symlink' | 'other';
  mtime: number;
  timestamp?: number;
  exists: boolean;
}

// Processed event result
export interface ProcessedEventResult {
  path: string;
  relative_path: string;
  event_type: EventType;
  timestamp: number;
  size: number;
  size_str: string;
  type: string;
  event_time: string;
  event_code: string;
  inode: number | null;
}

// Event processor result
export interface EventProcessorResult {
  success: boolean;
  event?: ProcessedEventResult;
  error?: Error;
}

// Event filter manager interface
export interface EventFilterManager {
  getFilterState(): FilterState;
  getState?(): FilterState;  // Alias for getFilterState
  toggleFilter(eventType: EventType): void;
  resetFilters(): void;
  isEventTypeEnabled(eventType: EventType): boolean;
  shouldDisplayEvent?(event: any): boolean;
  on?(event: string, listener: (...args: any[]) => void): this;
  filterEvents?(events: EventData[]): EventData[];
  emit?(event: string, ...args: any[]): boolean;
}

// Filter manager interface (alias for compatibility)
export interface FilterManager extends EventFilterManager {
  filterEvents?(events: any[]): any[];
}

// Key mapping for filter shortcuts
export interface KeyMapping {
  [key: string]: EventType;
}

// Filter change event
export interface FilterChangeEvent {
  eventType: EventType | 'all';
  enabled?: boolean;
  isVisible?: boolean;
  filterState?: FilterState;
  allFilters?: FilterState;
}