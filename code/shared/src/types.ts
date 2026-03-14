/**
 * Common type definitions
 * @created 2026-03-13
 * @checked 2026-03-14
 * @updated 2026-03-13
 */

export interface FileEvent {
  id?: number;
  eventType: 'find' | 'create' | 'modify' | 'delete' | 'move' | 'restore';
  eventTypeId?: number;
  fileId?: number;
  filePath: string;
  directory: string;
  fileName: string;
  timestamp: Date;
  inode?: number;
}

export interface Config {
  watchPath: string;
  dbPath: string;
  pollingInterval: number;
}

export interface DaemonState {
  pid: number;
  started_at: number;
  working_directory: string;
  watch_paths: string[];
  config_path: string;
}