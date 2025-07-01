/**
 * Common type definitions
 */

export interface FileEvent {
  id?: number;
  eventType: 'find' | 'create' | 'modify' | 'delete' | 'move';
  filePath: string;
  directory: string;
  filename: string;
  fileSize: number;
  timestamp: Date;
  inodeNumber: number;
}

export interface Config {
  watchPath: string;
  dbPath: string;
  pollingInterval: number;
}