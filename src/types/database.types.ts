/**
 * Database Type Definitions for cctop
 * Database connections, schemas, and query interfaces
 */

// Database connection interface
export interface DatabaseConnection {
  all(sql: string, params?: any[]): Promise<any[]>;
  get(sql: string, params?: any[]): Promise<any>;
  run(sql: string, params?: any[]): Promise<any>;
}

// Database manager interface
export interface DatabaseManager {
  getEventCount(): Promise<number>;
  getEventsBatch(offset: number, limit: number): Promise<any[]>;
  getRecentEvents(limit: number): Promise<any[]>;
  addEvent(event: any): Promise<void>;
  getEvents(limit?: number): Promise<any[]>;
  getDatabasePath(): string;
  close(): Promise<void>;
  getStatistics?(): Promise<DatabaseStatistics>;
  getAggregateData?(): Promise<AggregateData>;
  initialize?(): Promise<void>;
  searchEvents?(pattern: string): Promise<any[]>;
  findByPath?(path: string): Promise<any[]>;
  ensureFile?(filePath: string): Promise<any>;
  getAggregateStats?(fileId: number): Promise<AggregateData | null>;
  get?(query: string, params?: any[]): Promise<any>;
  isInitialized?: boolean;
}

// Time statistics
export interface TimeStats {
  first_timestamp?: number;
  last_timestamp?: number;
}

// Database statistics
export interface DatabaseStatistics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  totalSize: number;
  averageSize: number;
  timeRange: TimeStats;
}

// Aggregate data
export interface AggregateData {
  summary?: {
    total_events: number;
    total_size: number;
    event_counts: Record<string, number>;
  };
  by_path?: Array<{
    path: string;
    count: number;
    size: number;
    last_modified: number;
  }>;
  by_hour?: Array<{
    hour: string;
    count: number;
  }>;
  // Additional properties for compatibility
  file_id?: number;
  inode?: number;
  filename?: string;
  directory?: string;
  total_events?: number;
  total_creates?: number;
  total_deletes?: number;
  total_modifies?: number;
  total_moves?: number;
  total_restores?: number;
  total_size?: number;
  first_event_timestamp?: number;
  last_event_timestamp?: number;
  first_size?: number;
  last_size?: number;
  max_size?: number;
  first_lines?: number;
  last_lines?: number;
  max_lines?: number;
  first_blocks?: number;
  last_blocks?: number;
  max_blocks?: number;
  total_lines?: number;
  total_blocks?: number;
}

// Table column information
export interface TableColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: any;
  pk: number;
}

// Event record structure in database
export interface EventRecord {
  id: number;
  path: string;
  relative_path: string;
  event_type: string;
  timestamp: number;
  size: number;
  size_str: string;
  type: string;
  event_time: string;
  event_code: string;
  inode: number | null;
}

// Database schema version
export interface SchemaVersion {
  version: number;
  created_at: string;
  description?: string;
}

// Migration interface
export interface Migration {
  version: number;
  description: string;
  up: (db: DatabaseConnection) => Promise<void>;
  down?: (db: DatabaseConnection) => Promise<void>;
}

// Query result
export interface QueryResult<T = any> {
  rows: T[];
  changes?: number;
  lastID?: number;
}

// Database configuration
export interface DatabaseConfig {
  filename: string;
  path?: string;  // Alias for filename
  verbose?: boolean;
  trace?: (sql: string) => void;
  busyTimeout?: number;
}

// Inotify limit check result
export interface InotifyLimitResult {
  status: 'sufficient' | 'insufficient' | 'unknown';
  canCheck: boolean;
  current?: number;
  required?: number;
  shortage?: number;
  message: string;
}

// Additional database types
export interface FileRecord {
  id?: number;
  file_path: string;
  file_name: string;
  directory: string;
  file_size: number;
  line_count: number;
  block_count?: number;
  last_seen: number;
  event_count: number;
  is_active?: number;
}

export interface AggregateRecord {
  path: string;
  event_type: string;
  count: number;
  total_size: number;
  last_event: number;
}

export interface EventTypeRecord {
  [eventType: string]: number;
}

export interface MeasurementRecord {
  timestamp: number;
  event_count: number;
  unique_files: number;
  total_size: number;
}

export interface DatabaseManagerStats {
  totalEvents: number;
  uniqueFiles: number;
  totalFiles?: number;  // Alias for uniqueFiles
  eventsByType: EventTypeRecord;
  lastUpdate: number;
  isInitialized?: boolean;
  transactionActive?: boolean;
  dbPath?: string;
}

export interface EventWithDetails extends EventRecord {
  file_size: number;
  line_count: number;
  file_type: string;
}