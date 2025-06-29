/**
 * Viewer Type Definitions
 * Instant viewer and progressive loader interfaces
 */

// Instant viewer configuration
export interface InstantViewerConfig {
  targetPath?: string;
  verbose?: boolean;
  debug?: boolean;
  recursive?: boolean;
  configPath?: string;
  database?: any;  // DatabaseManager type
  display?: any;   // CLIDisplay type
}

// Instant viewer status
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

// Progressive loader interface
export interface ProgressiveLoader {
  loadEvents(limit: number): Promise<any[]>;
  getLoadedCount(): number;
  getTotalCount(): Promise<number>;
  loadRecentEventsFirst?(limit: number): Promise<any[]>;
  getLastLoadedEventId?(): number | null;
}

// Database watcher interface
export interface DatabaseWatcher {
  start(): void;
  stop(): void;
  on(event: string, handler: Function): void;
  isWatching(): boolean;
  setLastEventId?(eventId: number): void;
}