/**
 * UI Type Definitions for cctop
 * Display, rendering, and theme interfaces
 */

import { EventType, FilterState, EventData } from './event.types';

// Display manager interface
export interface DisplayManager {
  addEvents?(events: any[]): void;
}

// Status display interface
export interface StatusDisplay {
  updateMessage(oldText: string, newText?: string, type?: string): void;
  updateLoadProgress?(loaded: number, total: number): void;
  updateStatus?(status: string): void;
  updateStatistics?(stats: any): void;
  updateError?(error: string): void;
  clearError?(): void;
  getDisplayLines?(): string[];
  update?(message: string): void;
  render?(): string;
  destroy?(): void;
  startStatisticsTimer?(databaseManager?: any): void;
  addMessage?(message: string, type?: string): void;
  getStatus?(): any;
}

// Buffered renderer options
export interface BufferedRendererOptions {
  renderInterval?: number;
  maxBufferSize?: number;
  enableDebounce?: boolean;
  clearOnRender?: boolean;
}

// Renderer statistics
export interface RendererStats {
  bufferSize: number;
  previousBufferSize: number;
  maxBufferSize: number;
  renderInterval: number;
  cursorSaved: boolean;
  enableDebounce: boolean;
}

// Theme color definition
export interface ThemeColor {
  find: string;
  create: string;
  modify: string;
  delete: string;
  move: string;
  restore: string;
  header: string;
  footer: string;
  border: string;
  selection: string;
  default: string;
  table?: string | {
    column_headers: string;
    row: {
      event_timestamp: string;
      elapsed_time: string;
      file_name: string;
      event_type: {
        find: string;
        create: string;
        modify: string;
        delete: string;
        move: string;
        restore: string;
      };
      lines: string;
      blocks: string;
      directory: string;
    };
  };
  status_bar?: string | {
    label: string;
    count: string;
    separator: string;
  };
  [key: string]: any;  // Allow additional properties
}

// Alias for backward compatibility
export interface ThemeColors extends ThemeColor {}

// RGB color components
export interface RGBComponents {
  r: number;
  g: number;
  b: number;
}

// Theme definition
export interface Theme {
  name: string;
  colors: ThemeColor;
}

// Theme configuration
export interface ThemeConfig {
  themes: Theme[];
  default: string;
}

// Current theme state
export interface CurrentTheme {
  name: string;
  timestamp: number;
}

// Display width configuration
export interface DisplayWidth {
  eventCode: number;
  timestamp: number;
  fileSize: number;
  filePath: number;
}

// Column widths for display
export interface ColumnWidths {
  index: number;
  eventType: number;
  time: number;
  size: number;
  path: number;
}

// Event display manager interface
export interface EventDisplayManager {
  displayEvents(events: EventData[], filterState: FilterState): void;
  setColumnWidths(widths: ColumnWidths): void;
  setTheme(theme: Theme): void;
  getDisplayedEvents(): EventData[];
  clear(): void;
  getStats?(): EventDisplayStats;
  getEventsToDisplay?(): EventData[];
}

// Render controller interface
export interface RenderController {
  scheduleRender(renderFn: () => void): void;
  forceRender(renderFn: () => void): void;
  getStats(): RendererStats;
  stop(): void;
  setSelectionState?(state: any): void;
  render?(): void;
  isDetailMode?(): boolean;
}

// Buffered renderer interface
export interface BufferedRenderer {
  addToBuffer(content: string): void;
  scheduleRender(): void;
  forceRender(): void;
  getStats(): RendererStats;
  setOptions(options: BufferedRendererOptions): void;
  stop(): void;
  destroy?(): void;
  isDirty?(): boolean;
  updateDimensions?(width: number, height: number): void;
  clear?(): void;
  renderDebounced?(): void;
  addLine?(line: string): void;
  reset?(): void;
  render?(): void;
}

// CLI display configuration
export interface CLIDisplayConfig {
  maxEvents?: number;
  theme?: string;
  updateInterval?: number;
  refreshRate?: number;  // Alias for updateInterval
  displayWidth?: DisplayWidth;
  useBufferedRenderer?: boolean;
  bufferInterval?: number;
  enableDebounce?: boolean;
  verbose?: boolean;
  debug?: boolean;
  showMonitorStatus?: boolean;
  configPath?: string;
  statusArea?: StatusAreaConfig;
  mode?: string;
}

// Legacy CLI display types (for backward compatibility)
export interface CLIDisplayLegacyConfig extends CLIDisplayConfig {
  configPath?: string;
  databaseManager?: any;
  eventFilterManager?: any;
  statusDisplay?: any;
  mode?: string;
}

export interface CLIDisplayLegacyStats {
  totalEvents: number;
  uniqueFiles: number;
  eventsPerSecond?: number;
  lastUpdate?: number;
  isRunning?: boolean;
  displayMode?: string;
  maxLines?: number;
  renderer?: any;
  statusDisplay?: any;
}

export interface CLIDisplayLegacyWidthConfig {
  eventCode: number;
  timestamp: number;
  fileSize: number;
  filePath: number;
  fileNameWidth?: number;
  directoryWidth?: number;
  totalWidth?: number;
  directory?: number;  // Alias for directoryWidth
  terminal?: number;   // Terminal width
}

export interface CLIInterfaceOptions {
  input?: NodeJS.ReadableStream;
  output?: NodeJS.WritableStream;
}

// Display statistics
export interface DisplayStatistics {
  totalEvents: number;
  visibleEvents: number;
  filteredEvents: number;
  lastUpdate: number;
  renderCount: number;
}

// Layout dimensions
export interface LayoutDimensions {
  terminalWidth: number;
  terminalHeight: number;
  headerHeight: number;
  footerHeight: number;
  contentHeight: number;
}

// Color manager interface
export interface ColorManager {
  getEventColor(eventType: EventType): string;
  getThemeColor(element: keyof ThemeColor): string;
  getCurrentTheme(): Theme;
  setTheme(themeName: string): void;
  listThemes(): string[];
}

// Progress bar options
export interface ProgressBarOptions {
  width?: number;
  complete?: string;
  incomplete?: string;
  head?: string;
  renderThrottle?: number;
}

// Status bar interface
export interface StatusBar {
  update(message: string): void;
  updateProgress(current: number, total: number): void;
  clear(): void;
}

// Additional UI types
export interface EventDisplayManagerConfig {
  maxEvents?: number;
  verbose?: boolean;
  debug?: boolean;
  mode?: string;
}

export interface EventDisplayStats {
  totalEvents: number;
  visibleEvents: number;
  filteredEvents: number;
  lastUpdate: number;
  displayMode?: string;
  modeIndicator?: string;
  uniqueFiles?: number;
  stats?: any;
  displayText?: string;
}

export interface EventDisplayStatus {
  active: boolean;
  mode: string;
  lastError?: Error;
  displayMode?: string;
  totalEvents?: number;
  uniqueFiles?: number;
  maxLines?: number;
}

export interface EventDatabase {
  getEvents(): Promise<any[]>;
  getEventCount(): Promise<number>;
  getRecentEvents?(limit: number): Promise<any[]>;
}

export interface RenderSelectionState {
  enabled: boolean;
  index: number;
  isSelecting?: boolean;
  selectedIndex?: number;
  selectionRenderer?: any;
  count: number;
  highlightedIndex?: number;
}

export interface WidthConfig {
  eventCode: number;
  timestamp: number;
  fileSize: number;
  filePath: number;
}

export type EventFormatter = (event: any) => string;
export type LayoutManager = {
  calculateLayout(): LayoutDimensions;
};

export type FilterStates = FilterState;

// Additional color types
export interface ColorMap {
  [key: string]: string;
}

export interface ColorConfig {
  default: ColorMap;
  custom?: ColorMap;
}

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface ThemeMetadata {
  name: string;
  description?: string;
  author?: string;
  version?: string;
}

export interface FullThemeData extends Theme {
  metadata?: ThemeMetadata;
  lastUpdated?: number;
  description?: string;
  version?: string;
}

export interface ThemeInfoResult {
  name: string;
  isDefault: boolean;
  colors: ThemeColor;
  description?: string;
  version?: string;
  lastUpdated?: number;
}

export interface ThemeData {
  colors: ThemeColor;
  metadata?: ThemeMetadata;
  name?: string;
  description?: string;
  version?: string;
}

export interface ThemeInfo {
  name: string;
  theme: ThemeData;
  isDefault: boolean;
}

// Status area configuration
export interface StatusAreaConfig {
  showStats?: boolean;
  showFilters?: boolean;
  showTime?: boolean;
  showPath?: boolean;
  maxLines?: number;
  enabled?: boolean;
  scrollSpeed?: number;
  updateInterval?: number;
}

// Instant viewer types
export interface InstantViewerConfig {
  targetPath?: string;
  verbose?: boolean;
  debug?: boolean;
  recursive?: boolean;
  configPath?: string;
  database?: any;  // DatabaseManager type
  display?: any;   // CLIDisplay type
}

export interface InstantViewerStatus {
  running: boolean;
  isRunning?: boolean;  // Alias
  pid?: number;
  monitorPid?: number;
  error?: Error | string;
  databaseConnected?: boolean;
  displayActive?: boolean;
  startupTime?: number;
}

export interface CLIDisplay {
  start(): Promise<void>;
  stop(): void;
  addEvent(event: any): void;
  getStats(): any;
}

export interface ProgressiveLoader {
  loadEvents(limit: number): Promise<any[]>;
  getLoadedCount(): number;
  getTotalCount(): Promise<number>;
  loadRecentEventsFirst?(limit: number): Promise<any[]>;
  getLastLoadedEventId?(): number | null;
}

export interface DatabaseWatcher {
  start(): void;
  stop(): void;
  on(event: string, handler: Function): void;
  isWatching(): boolean;
  setLastEventId?(eventId: number): void;
}

// Additional type alias
export type CLIDisplayStats = EventDisplayStats;