/**
 * Basic Display Type Definitions
 * Core display interfaces for rendering and buffer management
 */

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

// Width configuration
export interface WidthConfig {
  eventCode: number;
  timestamp: number;
  fileSize: number;
  filePath: number;
}

// Render selection state
export interface RenderSelectionState {
  enabled: boolean;
  index: number;
  isSelecting?: boolean;
  selectedIndex?: number;
  selectionRenderer?: any;
  count: number;
  highlightedIndex?: number;
}

// Layout manager type
export type LayoutManager = {
  calculateLayout(): LayoutDimensions;
};