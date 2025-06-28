/**
 * Common Type Definitions for cctop
 * Shared interfaces and types across the application
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

// Inotify Checker interfaces
export interface InotifyLimitResult {
  status: 'sufficient' | 'insufficient' | 'unknown';
  canCheck: boolean;
  current?: number;
  required?: number;
  shortage?: number;
  message: string;
}

// Progressive Loader interfaces
export interface ProgressiveLoaderConfig {
  batchSize?: number;
  loadDelay?: number;
}

export interface LoadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface LoaderStats {
  loadedCount: number;
  batchSize: number;
  loadDelay: number;
}

// Database Manager interface (for Progressive Loader dependency)
export interface DatabaseManager {
  getEventCount(): Promise<number>;
  getEventsBatch(offset: number, limit: number): Promise<any[]>;
  getRecentEvents(limit: number): Promise<any[]>;
}

// Display Manager interface (for Progressive Loader dependency)
export interface DisplayManager {
  addEvents?(events: any[]): void;
}

// Status Display interface (for Progressive Loader dependency)
export interface StatusDisplay {
  updateMessage(message: string): void;
}

// Buffered Renderer interfaces
export interface BufferedRendererOptions {
  renderInterval?: number;
  maxBufferSize?: number;
  enableDebounce?: boolean;
}

export interface RendererStats {
  bufferSize: number;
  previousBufferSize: number;
  maxBufferSize: number;
  renderInterval: number;
  cursorSaved: boolean;
  enableDebounce: boolean;
}

// Database Migration interfaces
export interface DatabaseConnection {
  all(sql: string, params?: any[]): Promise<any[]>;
  get(sql: string, params?: any[]): Promise<any>;
  run(sql: string, params?: any[]): Promise<any>;
}

export interface TimeStats {
  first_timestamp?: number;
  last_timestamp?: number;
}

export interface MeasurementStats {
  first_size?: number;
  max_size?: number;
  first_lines?: number;
  max_lines?: number;
  first_blocks?: number;
  max_blocks?: number;
}

export interface LastMeasurement {
  file_size?: number;
  line_count?: number;
  block_count?: number;
}

export interface TableColumnInfo {
  name: string;
  type: string;
  notnull: number;
  dflt_value: any;
  pk: number;
}

// Selection Manager interfaces
export interface SelectionState {
  mode: 'waiting' | 'selecting';
  currentIndex: number;
  selectedFile: string | null;
  fileList: string[];
}

export interface SelectionManagerState {
  mode: 'waiting' | 'selecting';
  currentIndex: number;
  selectedFile: string | null;
  fileCount: number;
}

export interface SelectionRenderState {
  isSelecting: boolean;
  selectedIndex: number;
  selectionRenderer: any;
}

export interface KeyHandler {
  id: string;
  callback: () => void | Promise<void> | any;
}

// Key Input Manager interface
export interface KeyInputManager {
  registerHandler(mode: string, key: string, handler: KeyHandler): void;
  unregisterHandler(mode: string, key: string): void;
  setState(state: string): void;
}

// Render Controller interface
export interface RenderController {
  setSelectionState?(state: SelectionRenderState): void;
  render?(): void;
  isDetailMode?(): boolean;
}

// Aggregate Display interfaces
export interface AggregateFileData {
  file_id: number;
  inode?: number | null;
  total_events: number;
  total_creates: number;
  total_modifies: number;
  total_deletes: number;
  total_moves: number;
  total_restores: number;
  first_event_timestamp?: number | null;
  last_event_timestamp?: number | null;
  first_size?: number | null;
  max_size?: number | null;
  last_size?: number | null;
  total_size: number;
  first_lines?: number | null;
  max_lines?: number | null;
  last_lines?: number | null;
  total_lines: number;
  first_blocks?: number | null;
  max_blocks?: number | null;
  last_blocks?: number | null;
  total_blocks: number;
}

export interface FileInfo {
  id: number;
  inode?: number | null;
}

// Database Manager interface (extended for Aggregate Display)
export interface AggregatesDatabaseManager {
  ensureFile(filePath: string): Promise<number>;
  getAggregateStats(fileId: number): Promise<AggregateFileData | null>;
  get(sql: string, params: any[]): Promise<FileInfo | null>;
}

// History Display interfaces
export interface HistoryEntry {
  timestamp: number;
  event_type: string;
  event_code: string;
  line_count: number | null;
  block_count: number | null;
  event_id: number;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  currentItem: number;
  totalItems: number;
  itemsOnPage: number;
}

export interface FocusedItemDetails {
  eventId: number;
  timestamp: number;
  eventType: string;
  eventCode: string;
  lineCount: number | null;
  blockCount: number | null;
  formattedTimestamp: string;
}

export interface EventCountResult {
  total_events: number;
}

// History Database Manager interface
export interface HistoryDatabaseManager {
  get(sql: string, params: any[]): Promise<EventCountResult | null>;
  all(sql: string, params: any[]): Promise<HistoryEntry[]>;
}

// CLI Interface options
export interface CLIInterfaceOptions {
  input?: NodeJS.ReadableStream;
  output?: NodeJS.WritableStream;
}

// Key mapping for event filters
export interface KeyMapping {
  [key: string]: EventType;
}

// Filter change event
export interface FilterChangeEvent {
  eventType: EventType | 'all';
  isVisible: boolean;
  allFilters: FilterState;
}

// Configuration related interfaces
export interface MonitoringConfig {
  eventFilters?: Partial<FilterState>;
  timeout?: number;
  maxEvents?: number;
}

export interface Config {
  monitoring?: MonitoringConfig;
  [key: string]: any;
}

// Utility types for async operations
export type PromiseResolve<T> = (value: T | PromiseLike<T>) => void;
export type PromiseReject = (reason?: any) => void;

// Theme system types
export interface ThemeColors {
  table: {
    column_headers: string;
    row: {
      event_timestamp: string;
      elapsed_time: string;
      file_name: string;
      event_type: {
        [K in EventType]: string;
      };
      lines: string;
      blocks: string;
      directory: string;
    };
  };
  status_bar: {
    label: string;
    count: string;
    separator: string;
  };
  general_keys: {
    key_active: string;
    key_inactive: string;
    label_active: string;
    label_inactive: string;
  };
  event_filters: {
    key_active: string;
    key_inactive: string;
    label_active: string;
    label_inactive: string;
  };
  message_area: {
    prompt: string;
    label: string;
    status: string;
    pid: string;
    summary: string;
  };
}

export interface ThemeData {
  name: string;
  description: string;
  version: string;
  colors: ThemeColors;
}

export interface ThemeInfo {
  name: string;
  displayName: string;
  description: string;
}

// ColorManager specific types
export interface ColorMap {
  [colorName: string]: string;
}

export interface RGBColor {
  hex: string;
  valid: boolean;
}

export interface ColorConfig {
  configPath: string;
  currentThemeFile: string;
  themesDir: string;
}

export interface ThemeMetadata {
  name: string;
  description: string;
  version: string;
  lastUpdated: string;
}

export interface FullThemeData extends ThemeMetadata {
  colors: ThemeColors;
}

export interface ThemeInfoResult {
  name: string;
  description: string;
  version: string;
  lastUpdated: string;
}

// FileMonitor interfaces
export interface FileMonitorConfig {
  watchPaths: string[];
  excludePatterns?: string[];
  depth?: number;
}

export interface ChokidarOptions {
  persistent: boolean;
  ignoreInitial: boolean;
  ignored: string[];
  alwaysStat: boolean;
  depth: number;
  usePolling: boolean;
  interval: number;
  binaryInterval: number;
  atomic?: number;
  awaitWriteFinish?: {
    stabilityThreshold: number;
    pollInterval: number;
  };
}

export interface FileMonitorEvent {
  type: EventType;
  path: string;
  stats: any;
  timestamp: number;
}

export interface FileMonitorStats {
  isRunning: boolean;
  isReady: boolean;
  watchedPaths: string[];
  ignored: string[];
}