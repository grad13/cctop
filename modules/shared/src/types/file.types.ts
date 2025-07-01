/**
 * File-related type definitions
 */

/**
 * File record in database
 */
export interface FileRecord {
  id: number;
  inode?: number;
  isActive: boolean;
}

/**
 * File measurements at a specific point in time
 */
export interface FileMeasurement {
  eventId: number;
  inode?: number;
  fileSize?: number;
  lineCount?: number;
  blockCount?: number;
}

/**
 * File aggregate statistics
 */
export interface FileAggregate {
  id?: number;
  fileId: number;
  periodStart?: number;
  
  // Cumulative statistics
  totalSize: number;
  totalLines: number;
  totalBlocks: number;
  
  // Event counts
  totalEvents: number;
  totalCreates: number;
  totalModifies: number;
  totalDeletes: number;
  totalMoves: number;
  totalRestores: number;
  
  // Time series statistics
  firstEventTimestamp?: number;
  lastEventTimestamp?: number;
  
  // Size statistics
  firstSize?: number;
  maxSize?: number;
  lastSize?: number;
  
  // Line statistics
  firstLines?: number;
  maxLines?: number;
  lastLines?: number;
  
  // Block statistics
  firstBlocks?: number;
  maxBlocks?: number;
  lastBlocks?: number;
  
  // Metadata
  lastUpdated?: number;
  calculationMethod?: string;
}

/**
 * File information from filesystem
 */
export interface FileInfo {
  path: string;
  size: number;
  inode?: number;
  lineCount?: number;
  blockCount?: number;
  isDirectory: boolean;
  exists: boolean;
}