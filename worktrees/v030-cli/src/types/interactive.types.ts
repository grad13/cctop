/**
 * Interactive Feature Type Definitions for cctop
 * Selection, input handling, and detail inspection interfaces
 */

import { EventType, EventData } from './event.types';
import { AggregateData } from './database.types';

// Selection state
export interface SelectionState {
  enabled: boolean;
  index: number;
  count: number;
  mode?: string;
  currentIndex?: number;
  selectedFile?: string | null;
  fileList?: any[];
  isSelecting?: boolean;
  fileCount?: number;
  selectedIndex?: number;
}

// Key input result
export interface KeyInputResult {
  action: string;
  key?: string;
  handled: boolean;
}

// Detail inspection mode
export type DetailMode = 'file' | 'aggregates' | 'history';

// Detail inspector interface
export interface DetailInspector {
  enterDetailMode(eventData: EventData): void;
  exitDetailMode(): void;
  isInDetailMode(): boolean;
  getCurrentMode(): DetailMode | null;
  handleKeyPress(key: string): boolean;
  render(): void;
}

// History entry
export interface HistoryEntry {
  timestamp: number;
  path: string;
  eventType: EventType;
  event_type?: EventType;  // Alias for backward compatibility
  size: number;
  formattedTime: string;
  formattedSize: string;
  event_id?: number;
  event_code?: string;
  line_count?: number;
  block_count?: number;
}

// History display interface
export interface HistoryDisplay {
  show(path: string): Promise<void>;
  hide(): void;
  isVisible(): boolean;
  handleKeyPress(key: string): boolean;
  render(): void;
}

// Aggregate display interface
export interface AggregateDisplay {
  show(data: AggregateData): void;
  hide(): void;
  isVisible(): boolean;
  handleKeyPress(key: string): boolean;
  render(): void;
}

// Interactive features configuration
export interface InteractiveFeaturesConfig {
  enableSelection?: boolean;
  enableDetailInspection?: boolean;
  enableHistory?: boolean;
  enableAggregates?: boolean;
  maxHistoryItems?: number;
  keyBindings?: KeyBindings;
}

// Key bindings
export interface KeyBindings {
  up?: string;
  down?: string;
  select?: string;
  detail?: string;
  history?: string;
  aggregates?: string;
  quit?: string;
  help?: string;
  filter?: Record<EventType, string>;
  [key: string]: any;
}

// Interactive state
export interface InteractiveState {
  mode: 'normal' | 'selection' | 'detail' | 'history' | 'aggregates';
  selection: SelectionState;
  detailMode?: DetailMode;
  lastAction?: string;
  lastKey?: string;
}

// Input handler interface
export interface InputHandler {
  start(): void;
  stop(): void;
  on(event: 'keypress', handler: (key: string) => void): void;
  on(event: 'quit', handler: () => void): void;
  isActive(): boolean;
  setRawMode(enabled: boolean): void;
}

// Selection manager interface
export interface SelectionManager {
  enable(): void;
  disable(): void;
  isEnabled(): boolean;
  moveUp(): boolean;
  moveDown(): boolean;
  getSelectedIndex(): number;
  getSelectedItem<T>(items: T[]): T | null;
  setMaxIndex(max: number): void;
  reset(): void;
}

// Interactive controller interface
export interface InteractiveController {
  initialize(config?: InteractiveFeaturesConfig): void;
  handleInput(key: string): KeyInputResult;
  getState(): InteractiveState;
  enterMode(mode: InteractiveState['mode']): void;
  exitMode(): void;
  destroy(): void;
}

// Key input manager interface
export interface KeyInputManager {
  start(): void;
  stop(): void;
  addHandler(key: string, handler: KeyHandler, options?: any): void;
  removeHandler(key: string): void;
  isActive(): boolean;
  registerHandler?(state: string, key: string, handler: KeyHandler, id?: string): void;
  unregisterHandler?(state: string, key: string): void;
  setState?(state: any): void;
}

// Key handler type
export type KeyHandler = (key: string) => void | boolean;

// Help display interface
export interface HelpDisplay {
  show(): void;
  hide(): void;
  isVisible(): boolean;
  getHelpText(): string;
}

// Interactive features interface (main)
export interface InteractiveFeatures {
  initialize(dependencies: InteractiveDependencies): void;
  handleKeyPress(key: string): boolean;
  updateEventList(events: EventData[]): void;
  getSelectionState(): SelectionState;
  isDetailMode(): boolean;
  destroy(): void;
}

// Dependencies for interactive features
export interface InteractiveDependencies {
  databaseManager?: any;
  displayManager?: any;
  filterManager?: any;
  statusDisplay?: any;
  config?: InteractiveFeaturesConfig;
}

// Scrollable content interface
export interface ScrollableContent {
  content: string[];
  viewportHeight: number;
  scrollPosition: number;
  totalLines: number;
  canScrollUp: boolean;
  canScrollDown: boolean;
}

// Viewport manager interface
export interface ViewportManager {
  setContent(lines: string[]): void;
  setViewportHeight(height: number): void;
  scrollUp(lines?: number): boolean;
  scrollDown(lines?: number): boolean;
  scrollToTop(): void;
  scrollToBottom(): void;
  getVisibleContent(): string[];
  getScrollInfo(): ScrollableContent;
}

// Detail inspector types
export interface DetailInspectorCallbacks {
  onExit?: () => void;
  onModeChange?: (mode: DetailMode) => void;
  onUpdate?: (data: DetailInspectorUpdateData) => void;
}

export interface DetailInspectorUpdateData {
  mode: DetailMode;
  path?: string;
  data?: any;
  fileId?: number;
  fileName?: string;
  aggregateData?: any;
}

export interface InspectionState {
  active: boolean;
  isActive?: boolean;  // Alias for backward compatibility
  mode?: DetailMode;
  targetPath?: string;
  data?: any;
  fileId?: number;
}

export interface DisplayStats {
  totalEvents: number;
  filteredEvents: number;
  displayedEvents: number;
  lastUpdate: number;
  fileId?: number;
  fileName?: string;
  totalHistoryItems?: number;
}

// History display types
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  currentItem?: number;
  itemsOnPage?: number;
}

export interface FocusedItemDetails {
  index: number;
  item: HistoryEntry;
  relativeIndex: number;
  eventId?: number;
  timestamp?: number;
  eventType?: EventType;
}

export interface EventCountResult {
  count: number;
  total_events?: number;  // Alias for count
  firstEvent?: number;
  lastEvent?: number;
}

export interface HistoryDatabaseManager {
  all(query: string, params?: any[]): Promise<any[]>;
  get(query: string, params?: any[]): Promise<any>;
}