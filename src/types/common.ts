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
  clearOnRender?: boolean;
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
  start?(): Promise<void>;
  currentMode?: string;
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

// EventDisplayManager interfaces
export interface EventDisplayManagerConfig {
  maxEvents?: number;
  mode?: 'all' | 'unique';
}

export interface EventData {
  id?: number;
  event_type: EventType;
  file_name: string;
  timestamp: number;
  [key: string]: any;
}

export interface EventDisplayStats {
  displayMode: 'all' | 'unique';
  modeIndicator: string;
  totalEvents: number;
  uniqueFiles: number;
  stats: string;
  displayText: string;
}

export interface EventDisplayStatus {
  displayMode: 'all' | 'unique';
  totalEvents: number;
  uniqueFiles: number;
  maxLines: number;
}

// Filter Manager interface (for EventDisplayManager dependency)
export interface FilterManager {
  filterEvents(events: EventData[]): EventData[];
}

// Database interface (for EventDisplayManager dependency)
export interface EventDatabase {
  getRecentEvents(limit: number): Promise<EventData[]>;
}

// RenderController interfaces
export interface RenderControllerConfig {
  maxEvents?: number;
  configPath?: string;
}

export interface RenderSelectionState {
  isSelecting: boolean;
  selectedIndex: number;
  selectionRenderer: SelectionRenderer | null;
}

export interface SelectionRenderer {
  renderLine(line: string, selected: boolean): string;
}

export interface WidthConfig {
  terminal?: number;
  directory: number;
  [key: string]: any;
}

export interface EventDisplayManager {
  getEventsToDisplay(): EventData[];
  getStats(): EventDisplayStats;
}

export interface EventFormatter {
  formatEventLine(event: EventData): string;
  updateWidthConfig(widthConfig: WidthConfig): void;
}

export interface LayoutManager {
  getWidthConfig(): WidthConfig;
  onResize(callback: (widthConfig: WidthConfig) => void): void;
}

export interface FilterStates {
  [key: string]: boolean;
}

export interface StatusDisplay {
  getDisplayLines(): string[];
}

export interface BufferedRenderer {
  clear(): void;
  addLine(line: string): void;
  render(): void;
  renderDebounced(): void;
  reset(): void;
  cancelPendingRender(): void;
  destroy(): void;
  getStats(): any;
}

// ViewerProcess interfaces
export interface ViewerProcessConfig {
  baseDir?: string;
  database?: {
    path: string;
  };
  [key: string]: any;
}

export interface MonitorStatusLegacy {
  status: 'stopped' | 'running' | 'stale' | 'error';
  pid?: number;
  running?: boolean;
  started_by?: 'viewer' | 'standalone' | 'unknown';
  error?: string;
}

export interface ViewerStatus {
  isRunning: boolean;
  pid: number;
  databaseConnected: boolean;
  displayActive: boolean;
}

export interface StartMonitorOptions {
  started_by?: string;
}

// Manager interfaces (for ViewerProcess dependencies)
export interface DatabaseManager {
  initialize(): Promise<void>;
  close(): Promise<void>;
  isInitialized: boolean;
}

export interface ProcessManager {
  getMonitorStatus(): Promise<ProcessMonitorStatus>;
  startMonitor(scriptPath: string, options?: StartMonitorOptions): Promise<number>;
  stopMonitor(): Promise<boolean>;
  getRecentLogs(lines: number): Promise<string[]>;
}

export interface CLIDisplay {
  start(): Promise<void>;
  stop(): Promise<void>;
  updateMonitorStatus(status: ProcessMonitorStatus): void;
  isRunning: boolean;
}

export interface ConfigManager {
  initialize(): Promise<ViewerProcessConfig>;
}

// CLIDisplay interfaces
export interface CLIDisplayConfig {
  refreshRate?: number;
  showMonitorStatus?: boolean;
  mode?: 'all' | 'unique' | string;
  configPath?: string;
  maxEvents?: number;
  [key: string]: any;
}

export interface CLIDisplayStats {
  displayMode: 'all' | 'unique';
  modeIndicator: string;
  totalEvents: number;
  uniqueFiles: number;
  stats: string;
  displayText: string;
  renderer: any;
  layout: {
    widthConfig: WidthConfig;
    layoutMode: string;
  };
  isRunning: boolean;
}

// Manager interfaces (for CLIDisplay dependencies)
export interface LayoutManager {
  getWidthConfig(): WidthConfig;
  getLayoutMode(): string;
  setupResizeHandler(): void;
  onResize(callback: (widthConfig: WidthConfig) => void): void;
  destroy(): void;
}

export interface InputHandler {
  setupKeyboardHandlers(): void;
  setEventDisplayManager(manager: any): void;
  setFilterManager(manager: any): void;
  setRenderController(controller: any): void;
  setExitCallback(callback: () => void): void;
  destroy(): void;
}

export interface InteractiveFeatures {
  setDisplayRenderer(renderer: any): void;
  initialize(): Promise<void>;
  updateFileListFromEvents(): void;
}

export interface EventFilterManager {
  on(event: string, callback: () => void): void;
  getFilterStates(): FilterStates;
}

// DetailInspector interfaces
export interface DetailInspectorCallbacks {
  onExit?: () => void;
  onUpdate?: (data: DetailInspectorUpdateData) => void;
}

export interface DetailInspectorUpdateData {
  fileId: number;
  fileName: string | null;
  aggregateData: any;
  historyInfo: any;
  focusedItem: any;
}

export interface InspectionState {
  isActive: boolean;
  fileId: number | null;
  fileName: string | null;
  historyPagination: any;
  focusedItem: any;
}

export interface DisplayStats {
  fileId: number;
  fileName: string | null;
  totalHistoryItems: number;
  currentHistoryPage: number;
  totalHistoryPages: number;
  currentFocusIndex: number;
  terminalSize: {
    width: number;
    height: number;
  };
}

// Display interfaces (for DetailInspector dependencies)
export interface AggregateDisplay {
  renderForFile(fileId: number, width: number): Promise<string>;
  getSummaryData(fileId: number): Promise<any>;
}

export interface HistoryDisplay {
  loadHistoryData(fileId: number): Promise<void>;
  renderHistoryDisplay(width: number): string;
  getPaginationInfo(): any;
  getFocusedItemDetails(): any;
  moveFocus(direction: 'up' | 'down'): boolean;
  hasPrevPage(): boolean;
  hasNextPage(): boolean;
  navigatePage(direction: 'prev' | 'next', fileId: number): Promise<void>;
  reset(): void;
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  focusIndex: number;
}

// InstantViewer interfaces
export interface InstantViewerConfig {
  database?: {
    path: string;
  };
  display?: {
    maxEvents?: number;
  };
  [key: string]: any;
}

export interface InstantViewerStatus {
  isRunning: boolean;
  pid: number;
  databaseConnected: boolean;
  displayActive: boolean;
  startupTime: number;
}

// Additional Manager interfaces (for InstantViewer dependencies)
export interface ProgressiveLoader {
  loadRecentEventsFirst(limit: number): Promise<number>;
  getLastLoadedEventId(): number | null;
}

export interface DatabaseWatcher {
  setLastEventId(eventId: number): void;
  on(event: string, callback: (data: any) => void): void;
  start(): void;
  stop(): void;
}

// ConfigManager interfaces
export interface ConfigManagerOptions {
  interactive?: boolean;
  cliInterface?: CLIInterface | null;
  promptHandler?: ((dirPath: string) => Promise<boolean>) | null;
}

export interface CLIArgs {
  config?: string;
  watchPath?: string | string[];
  dbPath?: string;
  maxLines?: string | number;
  [key: string]: any;
}

export interface InotifyConfig {
  requiredMaxUserWatches: number;
  checkOnStartup: boolean;
  warnIfInsufficient: boolean;
  recommendedValue: number;
}

export interface BackgroundMonitorConfig {
  enabled: boolean;
  logLevel: string;
  heartbeatInterval: number;
}

export interface MonitoringConfigFull {
  watchPaths: string[];
  excludePatterns: string[];
  debounceMs: number;
  maxDepth: number;
  eventFilters: FilterState;
  inotify: InotifyConfig;
  backgroundMonitor: BackgroundMonitorConfig;
}

export interface DatabaseConfig {
  path: string;
  mode: string;
}

export interface StatusAreaConfig {
  maxLines: number;
  enabled: boolean;
  scrollSpeed: number;
  updateInterval: number;
}

export interface DisplayConfig {
  maxEvents: number;
  refreshRateMs: number;
  statusArea: StatusAreaConfig;
}

export interface FullConfig {
  version: string;
  monitoring: MonitoringConfigFull;
  database: DatabaseConfig;
  display: DisplayConfig;
}

export interface CLIInterface {
  waitForUserConfirmation(): Promise<boolean>;
  promptAddDirectory(dirPath: string, timeout?: number): Promise<boolean>;
  success(message: string): void;
  info(message: string): void;
}

// ProcessManager interfaces
export interface ProcessManagerConfig {
  baseDir?: string;
  configFile?: string;
  [key: string]: any;
}

export interface ProcessManagerOptions {
  started_by?: string;
  [key: string]: any;
}

export interface PidInfo {
  pid: number;
  started_by: string;
  started_at: number | null;
  startTime: string | null;
  scriptPath: string | null;
  processName?: string;
  parentPid?: number;
  config_path: string | null;
}

export interface ProcessMonitorStatus {
  status: 'stopped' | 'running' | 'stale' | 'error';
  running: boolean;
  pid: number | null;
  started_by?: string;
  started_at?: number | null;
  startTime?: string | null;
  scriptPath?: string | null;
  config_path?: string | null;
  uptime?: number | null;
  error?: string;
}

export interface LogBackupFile {
  name: string;
  path: string;
  timestamp: number;
}

// EventProcessor interfaces
export interface EventProcessorConfig {
  monitoring?: {
    eventFilters?: Partial<FilterState>;
  };
  [key: string]: any;
}

export interface FileEventInput {
  type: string;
  path: string;
  stats?: any;
  retryCount?: number;
}

export interface FileEventMetadata {
  file_path: string;
  file_name: string;
  directory: string;
  timestamp: number;
  event_type?: EventType;
  file_size?: number;
  inode?: number | null;
  line_count?: number | null;
  block_count?: number | null;
}

export interface ProcessedEventResult {
  original: FileEventInput;
  recorded: FileEventMetadata & { id: number };
  eventType: EventType;
}

export interface EventProcessingError {
  event: FileEventInput;
  error: Error;
}

export interface MoveDetectionInfo {
  inode: number;
  timestamp: number;
}

export interface EventProcessorStats {
  isInitialScanMode: boolean;
  processedEvents: number;
  errors: number;
}

export interface DatabaseManager {
  isInitialized: boolean;
  db: any;
  recordEvent(metadata: FileEventMetadata): Promise<number>;
  findByPath(filePath: string): Promise<any>;
  get(sql: string, params?: any[]): Promise<any>;
  getRecentEvents(limit: number): Promise<EventData[]>;
}

// CLI Display Legacy interfaces
export interface CLIDisplayLegacyConfig {
  mode?: 'all' | 'unique';
  maxEvents?: number;
  [key: string]: any;
}

export interface CLIDisplayLegacyStats {
  isRunning: boolean;
  displayMode: 'all' | 'unique';
  totalEvents: number;
  uniqueFiles: number;
  maxLines: number;
  renderer: any;
  statusDisplay: any;
}

export interface CLIDisplayLegacyWidthConfig {
  terminal: number;
  directory: number;
}

// Buffered Renderer interface
export interface BufferedRenderer {
  clear(): void;
  addLine(line: string): void;
  renderDebounced(): void;
  destroy(): void;
  reset(): void;
  getStats(): any;
}

// Event Filter Manager interface
export interface EventFilterManager {
  on(event: string, callback: () => void): void;
  emit(event: string, ...args: any[]): boolean;
  filterEvents(events: EventData[]): EventData[];
}

// Status Display interface
export interface StatusDisplay {
  destroy(): void;
  startStatisticsTimer(db: any): void;
  addMessage(text: string, type?: string): void;
  updateMessage(oldText: string, newText: string, type?: string): void;
  getStatus(): any;
}

// Database Manager extended interfaces
export interface DatabaseConfigExtended {
  path?: string;
  [key: string]: any;
}

export interface SQLiteDatabase {
  run(sql: string, params?: any[], callback?: (err: Error | null, result?: any) => void): void;
  get(sql: string, params?: any[], callback?: (err: Error | null, row?: any) => void): void;
  all(sql: string, params?: any[], callback?: (err: Error | null, rows?: any[]) => void): void;
  close(callback?: (err: Error | null) => void): void;
  serialize(callback?: () => void): void;
  parallelize(callback?: () => void): void;
}

export interface DatabaseSchema {
  tables: { [tableName: string]: string };
  indexes: string[];
  triggers: string[];
}

export interface DatabaseInitialData {
  event_types: Array<{ code: string; name: string }>;
}

export interface EventRecord {
  id?: number;
  timestamp: number;
  event_type: EventType;
  file_path: string;
  file_name: string;
  directory: string;
  file_size?: number;
  line_count?: number | null;
  block_count?: number;
  inode?: number | null;
}

export interface FileRecord {
  id: number;
  file_path: string;
  inode?: number | null;
  is_active: boolean;
  last_event_timestamp: number;
  created_at: string;
  updated_at: string;
}

export interface AggregateRecord {
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

export interface EventTypeRecord {
  id: number;
  code: EventType;
  name: string;
}

export interface MeasurementRecord {
  event_id: number;
  file_size?: number;
  line_count?: number | null;
  block_count?: number;
  inode?: number | null;
}

export interface DatabaseManagerStats {
  isInitialized: boolean;
  transactionActive: boolean;
  dbPath: string;
  totalEvents?: number;
  totalFiles?: number;
}

export interface QueryResult {
  lastID?: number;
  changes?: number;
}

export interface EventWithDetails extends EventRecord {
  event_name?: string;
  measurements?: {
    file_size?: number;
    line_count?: number | null;
    block_count?: number;
    inode?: number | null;
  };
}

// InteractiveFeatures interfaces
export interface InteractiveFeaturesConfig {
  databaseManager: DatabaseManager;
  displayRenderer?: any;
  cliDisplay?: any;
}

export interface InteractiveFeaturesComponents {
  keyInputManager: KeyInputManager;
  selectionManager: SelectionManager;
  detailController: DetailInspectionController;
  aggregateDisplay: AggregateDisplayRenderer;
  historyDisplay: HistoryDisplayRenderer;
}

export interface SelectionManager {
  updateFileList(fileList: string[]): void;
  getSelectionState(): any;
  isSelecting(): boolean;
  exitSelectionMode(): Promise<void>;
}

export interface DetailInspectionController {
  isActive(): boolean;
  exitDetailMode(): Promise<void>;
  refresh(): Promise<void>;
  showFileDetails?(fileId: number, fileName: string): Promise<void>;
}

export interface AggregateDisplayRenderer {
  cleanup(): void;
}

export interface HistoryDisplayRenderer {
  // Add specific methods as needed
}

export interface DisplayRenderer {
  updateMode?(mode: string): void;
  refresh?(): void;
}

export interface CLIDisplayForInteractive {
  eventDisplayManager?: {
    setDisplayMode(mode: 'all' | 'unique'): void;
  };
  filterManager?: {
    toggleFilter(eventType: EventType): void;
  };
}

// DetailInspector interfaces
export interface DetailInspectorCallbacks {
  onExit?: () => void;
  onUpdate?: (data: DetailInspectorUpdateData) => void;
}

export interface DetailInspectorUpdateData {
  fileId: number;
  fileName: string | null;
  aggregateData: any;
  historyInfo: any;
  focusedItem: any;
}

export interface InspectionState {
  isActive: boolean;
  fileId: number | null;
  fileName: string | null;
  historyPagination: any;
  focusedItem: any;
}

export interface DisplayStats {
  fileId: number;
  fileName: string | null;
  totalHistoryItems: number;
  currentHistoryPage: number;
  totalHistoryPages: number;
  currentFocusIndex: number;
  terminalSize: {
    width: number;
    height: number;
  };
}