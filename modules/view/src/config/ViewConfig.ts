/**
 * View Configuration Type Definitions
 * Defines the structure for view-config.json
 */

export interface ViewConfig {
  version: string;
  display: DisplayConfig;
  colors: ColorConfig;
  interactive: InteractiveConfig;
  locale: LocaleConfig;
}

export interface DisplayConfig {
  maxEvents: number;
  refreshRateMs: number;
  dateFormat: string;
  columns: ColumnConfigs;
  directoryMutePaths: string[];
  'columns-order': string[];
}

export interface ColumnConfigs {
  [columnName: string]: ColumnConfig;
}

export interface ColumnConfig {
  label: string;
  width: number | 'auto';
  visible: boolean;
  align: 'left' | 'right' | 'center';
}

export interface ColorConfig {
  find: string;
  create: string;
  modify: string;
  move: string;
  delete: string;
  back: string;
}

export interface InteractiveConfig {
  keyRepeatDelay: number;
  keyRepeatInterval: number;
  selectionHighlight: string;
}

export interface LocaleConfig {
  language: string;
  timezone: string;
}

/**
 * Default view configuration
 */
export const defaultViewConfig: ViewConfig = {
  version: '0.3.0.0',
  display: {
    maxEvents: 20,
    refreshRateMs: 100,
    dateFormat: 'YYYY-MM-DD HH:mm:ss',
    columns: {
      timestamp: {
        label: 'Event Timestamp',
        width: 19,
        visible: true,
        align: 'left'
      },
      elapsed: {
        label: 'Elapsed',
        width: 9,
        visible: true,
        align: 'right'
      },
      fileName: {
        label: 'File Name',
        width: 35,
        visible: true,
        align: 'left'
      },
      event: {
        label: 'Event',
        width: 8,
        visible: true,
        align: 'left'
      },
      lines: {
        label: 'Lines',
        width: 6,
        visible: true,
        align: 'right'
      },
      blocks: {
        label: 'Blks',
        width: 8,
        visible: true,
        align: 'right'
      },
      size: {
        label: 'Size',
        width: 7,
        visible: true,
        align: 'right'
      },
      directory: {
        label: 'Directory',
        width: 'auto',
        visible: true,
        align: 'left'
      }
    },
    directoryMutePaths: [],
    'columns-order': [
      'timestamp',
      'elapsed',
      'fileName',
      'event',
      'size',
      'lines',
      'blocks'
    ]
  },
  colors: {
    find: 'cyan',
    create: 'green',
    modify: 'yellow',
    move: 'blue',
    delete: 'red',
    back: 'magenta'
  },
  interactive: {
    keyRepeatDelay: 500,
    keyRepeatInterval: 100,
    selectionHighlight: 'inverse'
  },
  locale: {
    language: 'en',
    timezone: 'system'
  }
};