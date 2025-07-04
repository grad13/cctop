/**
 * CLI Configuration Interface
 */

export interface CLIConfig {
  display: {
    refreshRateMs: number;
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
}

export const defaultCLIConfig: CLIConfig = {
  display: {
    refreshRateMs: 100,
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
  }
};