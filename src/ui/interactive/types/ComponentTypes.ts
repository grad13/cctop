/**
 * Component type definitions for Interactive Features
 * Defines all types used by interactive components
 */

// Re-export common types
export type {
  DatabaseManager,
  KeyInputManager,
  SelectionManager,
  DetailInspector as DetailInspectionController,
  AggregateDisplay as AggregateDisplayRenderer,
  HistoryDisplay as HistoryDisplayRenderer,
  DisplayManager as DisplayRenderer,
  CLIDisplayConfig as CLIDisplayForInteractive,
  InteractiveFeatures as InteractiveFeaturesComponents
} from '../../../types';

// Event type definition
export type EventType = 'find' | 'create' | 'modify' | 'delete' | 'move' | 'rename';

// File item interface
export interface FileItem {
  id?: number;
  name: string;
  path?: string;
  lastEvent?: string;
  timestamp?: number;
  file_name?: string; // Alternative name field
}

// Component interfaces with required methods
export interface IKeyInputManager {
  setState(state: string): void;
  handleKey?(key: string): boolean;
  start?(): Promise<void>;
  onStateChange?: (newState: string) => void;
  currentMode?: string;
  handleDisplayAll?(): void;
  handleDisplayUnique?(): void;
  handleEventFilter?(eventType: EventType): void;
  destroy?(): void;
}

export interface ISelectionManager {
  updateFileList(fileList: string[]): void;
  getSelectionState(): any;
  isSelecting(): boolean;
  exitSelectionMode(): Promise<void>;
  onSelectionConfirmed?: (selectedFile: string) => void;
  destroy?(): void;
}

export interface IDetailController {
  isActive(): boolean;
  exitDetailMode(): Promise<void>;
  refresh(): Promise<void>;
  showFileDetails?(fileId: number, fileName: string): Promise<void>;
  onExit?: () => void;
  destroy?(): void;
}

export interface IAggregateDisplay {
  cleanup(): void;
}

export interface IHistoryDisplay {
  cleanup?(): void;
}

export interface IDisplayRenderer {
  updateMode?(mode: string): void;
  refresh?(): void;
}

export interface ICLIDisplay {
  eventDisplayManager?: {
    setDisplayMode(mode: string): void;
    getEventsToDisplay?(): any[];
  };
  filterManager?: {
    toggleFilter(eventType: EventType): void;
  };
}

// Interactive modes
export type InteractiveMode = 'waiting' | 'detail' | 'selection';

// Configuration interface
export interface InteractiveConfig {
  debug?: boolean;
  enableDetailMode?: boolean;
  enableAggregateDisplay?: boolean;
  enableHistoryDisplay?: boolean;
}

// Component collection interface
export interface InteractiveComponents {
  keyInputManager: IKeyInputManager;
  selectionManager: ISelectionManager;
  detailController: IDetailController;
  aggregateDisplay: IAggregateDisplay;
  historyDisplay: IHistoryDisplay;
}