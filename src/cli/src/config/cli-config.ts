/**
 * CLI Configuration Interface
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
      directory: { visible: boolean; width: number };
    };
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
  version: "0.3.0.0",
  display: {
    maxRows: 20,
    refreshInterval: 100,
    refreshRateMs: 100, // Backward compatibility
    showTimestamps: true,
    dateFormat: "HH:mm:ss",
    columnWidths: {
      time: 8,
      event: 6,
      size: 8,
      path: -1
    },
    columns: {
      timestamp: { visible: true, width: 19 },
      elapsed: { visible: true, width: 7 },
      fileName: { visible: true, width: 35 },
      event: { visible: true, width: 8 },
      lines: { visible: true, width: 6 },
      blocks: { visible: true, width: 7 },
      directory: { visible: true, width: 20 }
    }
  },
  interaction: {
    enableMouse: true,
    enableKeyboard: true,
    scrollSpeed: 3
  },
  colors: {
    info: 'cyan',
    success: 'green',
    warning: 'yellow',
    error: 'red',
    find: 'cyan',
    create: 'green',
    modify: 'yellow',
    delete: 'red',
    move: 'magenta',
    restore: 'blue'
  },
  logFile: "./logs/cli.log",
  // Legacy fields for backward compatibility
  refreshInterval: 100,
  maxRows: 20,
  displayMode: 'all',
  colorEnabled: true
};