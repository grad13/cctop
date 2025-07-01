/**
 * Event types for file system monitoring
 */

export type EventType = 'find' | 'create' | 'modify' | 'move' | 'delete' | 'restore';

export interface FileEvent {
  id: number;
  timestamp: Date;
  eventType: EventType;
  filePath: string;
  directory: string;
  fileName: string;
  fileSize: number;
  lineCount: number;
  blocks: number;
  inode: number;
  elapsed?: number;
  oldPath?: string; // For move events
  error?: string;
}

export interface EventStats {
  totalEvents: number;
  eventsByType: Record<EventType, number>;
  totalFiles: number;
  totalSize: number;
  totalLines: number;
  lastEventTime?: Date;
}

export interface EventFilter {
  eventTypes?: EventType[];
  directory?: string;
  fileName?: string;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
}