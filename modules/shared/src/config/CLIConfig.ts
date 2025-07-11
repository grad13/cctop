/**
 * CLI Configuration Interface
 * Per FUNC-107 specification
 */

export interface CLIConfig {
  version: string;
  display: {
    maxRows: number;
    refreshInterval: number;
    refreshRateMs: number; // Backward compatibility
    showTimestamps: boolean;
    dateFormat: string;
    columnWidths: {
      time: number;
      event: number;
      size: number;
      path: number;
    };
    columns: {
      timestamp: { visible: boolean; width: number };
      elapsed: { visible: boolean; width: number };
      fileName: { visible: boolean; width: number };
      event: { visible: boolean; width: number };
      lines: { visible: boolean; width: number };
      blocks: { visible: boolean; width: number };
      size: { visible: boolean; width: number };
      directory: { visible: boolean; width: number };
    };
    directoryMutePaths?: string[];  // Base paths to hide in directory column
  };
  interaction: {
    enableMouse: boolean;
    enableKeyboard: boolean;
    scrollSpeed: number;
  };
  colors: {
    info: string;
    success: string;
    warning: string;
    error: string;
    find: string;
    create: string;
    modify: string;
    delete: string;
    move: string;
    restore: string;
  };
  logFile?: string;
  // Legacy fields for backward compatibility
  refreshInterval?: number;
  maxRows?: number;
  displayMode?: string;
  colorEnabled?: boolean;
}

export const defaultCLIConfig: CLIConfig = {
  version: "0.5.2.6",
  display: {
    maxRows: 20,
    refreshInterval: 100,
    refreshRateMs: 100, // Backward compatibility
    showTimestamps: true,
    dateFormat: "YYYY-MM-DD HH:mm:ss",
    columnWidths: {
      time: 19,
      event: 8,
      size: 7,
      path: 40
    },
    columns: {
      timestamp: { visible: true, width: 19 },
      elapsed: { visible: true, width: 8 },
      fileName: { visible: true, width: 35 },
      event: { visible: true, width: 6 },
      lines: { visible: true, width: 6 },
      blocks: { visible: true, width: 4 },
      size: { visible: true, width: 7 },
      directory: { visible: true, width: -1 }
    },
    directoryMutePaths: []
  },
  interaction: {
    enableMouse: true,
    enableKeyboard: true,
    scrollSpeed: 3
  },
  colors: {
    info: 'white',
    success: 'green',
    warning: 'yellow',
    error: 'red',
    find: 'cyan',
    create: 'green',
    modify: 'yellow',
    delete: 'red',
    move: 'blue',
    restore: 'magenta'
  },
  logFile: "./logs/cli.log",
  // Legacy fields for backward compatibility
  refreshInterval: 100,
  maxRows: 20,
  displayMode: 'all',
  colorEnabled: true
};