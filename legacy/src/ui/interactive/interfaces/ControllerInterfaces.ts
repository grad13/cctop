/**
 * Controller Interfaces for Detail Inspection Mode
 * Defines all interfaces used by DetailInspectionController and its components
 */

// Re-export common types for convenience
export type { 
  DetailInspector as IDetailInspectionController,
  KeyInputManager,
  AggregateDisplay,
  HistoryDisplay,
  RenderController
} from '../../../types';

// File selection interfaces
export interface ISelectedFile {
  name?: string;
  path?: string;
  lastEvent?: string;
  timestamp?: number;
  fileId?: number;
  [key: string]: any;
}

export type SelectedFile = string | ISelectedFile;

// Display interfaces with detailed methods
export interface IAggregateDisplay {
  initialize(filePath: string): Promise<void>;
  render(): string | null;
  cleanup?(): void;
}

export interface IHistoryDisplay {
  initialize(filePath: string): Promise<void>;
  render(): string | null;
  navigate?(key: string): Promise<void>;
  cleanup?(): void;
}

// Render controller interface with detail mode support
export interface IRenderController {
  setDetailModeActive?(active: boolean): void;
  isDetailMode?(): boolean;
  render?(): void;
  cliDisplay?: {
    refreshInterval?: NodeJS.Timeout | null;
    updateDisplay?(): void;
  };
}

// State management interface
export interface IDetailModeState {
  activate(file: SelectedFile): void;
  deactivate(): void;
  isActive(): boolean;
  getSelectedFile(): SelectedFile | null;
  validateState(): boolean;
  getStateInfo(): object;
}

// Display coordination interface
export interface IDisplayCoordinator {
  coordinateDisplays(file: SelectedFile): Promise<void>;
  handleKeyNavigation(key: string): Promise<void>;
  cleanupDisplays(): void;
  isReadyForDisplay(): Promise<boolean>;
}

// Renderer interface
export interface IDetailRenderer {
  renderDetailMode(): string | null;
  renderAggregateSection(): string | null;
  renderHistorySection(): string | null;
  getRenderStatus(): object;
}

// Key handler registration
export interface IKeyHandler {
  id: string;
  callback: () => void | Promise<void>;
}

// Debug configuration
export interface IDebugConfig {
  verbose?: boolean;
  logPrefix?: string;
}