/**
 * Monitor Process Type Definitions
 */

import type { 
  DatabaseManager, 
  ProcessManager, 
  ConfigManager, 
  FullConfig,
  FileMonitorStats,
  ProcessMonitorStatus
} from '../types';

// Monitor Process specific configuration
export interface MonitorProcessConfig extends FullConfig {
  monitor?: {
    heartbeatInterval?: number;
  };
}

// Monitor Process status
export interface MonitorProcessStatus {
  isRunning: boolean;
  pid: number;
  fileMonitorStats: FileMonitorStats | null;
  uptime: number;
}

// Monitor components interface
export interface MonitorComponents {
  fileMonitor: any;
  eventProcessor: any;
  databaseManager: any;
  processManager: any;
  config: MonitorProcessConfig;
}

// Event handler interface
export interface MonitorEventHandlers {
  onFileEvent: (event: any) => Promise<void>;
  onReady: () => Promise<void>;
  onError: (error: Error) => Promise<void>;
}

// Signal handler interface
export interface SignalHandlers {
  handleSIGTERM: () => void;
  handleSIGINT: () => void;
  handleSIGUSR1: () => void;
  handleSIGUSR2: () => void;
  handleUncaughtException: (error: Error) => Promise<void>;
  handleUnhandledRejection: (reason: any, promise: Promise<any>) => Promise<void>;
}

// Lifecycle methods interface
export interface MonitorLifecycle {
  start(components: MonitorComponents): Promise<void>;
  stop(): Promise<void>;
  restart(): Promise<void>;
  isRunning(): boolean;
}

// Heartbeat configuration
export interface HeartbeatConfig {
  interval: number;
  onHeartbeat: () => Promise<void>;
}