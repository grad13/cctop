/**
 * CLI Display Type Definitions
 * Command-line interface display configurations and interfaces
 */

import { DisplayWidth } from './display.types';
import { StatusAreaConfig } from './status-area.types';
import { EventDisplayStats } from './event-display.types';

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

// CLI display interface
export interface CLIDisplay {
  start(): Promise<void>;
  stop(): void;
  addEvent(event: any): void;
  getStats(): any;
}

// Additional type alias
export type CLIDisplayStats = EventDisplayStats;