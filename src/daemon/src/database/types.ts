/**
 * Database-specific type definitions
 * Moved from shared module per database specification
 */

export interface FileEvent {
  id?: number;
  eventType: 'find' | 'create' | 'modify' | 'delete' | 'move' | 'restore';
  filePath: string;
  directory: string;
  fileName: string;
  timestamp: Date;
  inode?: number;
}

export interface EventMeasurement {
  eventId?: number;  // Optional - set internally by insertEvent
  inode: number;
  fileSize: number;
  lineCount?: number;
  blockCount?: number;
}

export interface MeasurementResult {
  inode: number;
  fileSize: number;
  lineCount: number;
  blockCount: number;
}

export interface EventRow {
  id: number;
  timestamp: string | number;
  filename: string;
  directory: string;
  event_type: string;
  size: number;
  lines?: number;
  blocks?: number;
  inode: number;
  elapsed_ms: number;
}