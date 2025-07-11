/**
 * Type definitions for EventTable module
 */

import blessed from 'blessed';
import { EventRow } from '../../../types/event-row';
import { CLIConfig } from '../../../config/cli-config';

export interface EventTableOptions {
  parent: blessed.Widgets.Screen | blessed.Widgets.BoxElement;
  top?: number | string;
  left?: number | string;
  width?: number | string;
  height?: number | string;
  style?: blessed.Widgets.BoxOptions['style'];
  config?: CLIConfig;
}

export interface ColumnConfig {
  name: string;
  width: number;
  align: 'left' | 'right' | 'center';
  truncate?: 'head' | 'tail' | 'middle';
  headerText?: string;
  headerAlign?: 'left' | 'right' | 'center';
}

export interface FormatterContext {
  event: EventRow;
  index: number;
  isSelected: boolean;
  columnWidth: number;
}

export interface EventTableColors {
  find: string;
  create: string;
  modify: string;
  delete: string;
  move: string;
  restore: string;
  selected: string;
  normal: string;
}

export const DEFAULT_COLORS: EventTableColors = {
  find: 'cyan',
  create: 'green',
  modify: 'yellow',
  delete: 'red',
  move: 'magenta',
  restore: 'blue',
  selected: 'blue-bg',
  normal: 'green-fg'
};

// Default column configuration - will be overridden by config
export const DEFAULT_COLUMN_CONFIGS: ColumnConfig[] = [
  { name: 'timestamp', width: 19, align: 'left', headerText: 'Event Timestamp', headerAlign: 'left' },
  { name: 'elapsed', width: 8, align: 'right', headerText: 'Elapsed', headerAlign: 'right' },
  { name: 'filename', width: 35, align: 'left', truncate: 'tail', headerText: 'File Name', headerAlign: 'left' },
  { name: 'event_type', width: 6, align: 'left', headerText: 'Event', headerAlign: 'left' },
  { name: 'lines', width: 5, align: 'right', headerText: 'Lines', headerAlign: 'right' },
  { name: 'blocks', width: 4, align: 'right', headerText: 'Blks', headerAlign: 'right' },
  { name: 'size', width: 7, align: 'right', headerText: 'Size', headerAlign: 'right' },
  { name: 'directory', width: -1, align: 'left', truncate: 'head', headerText: 'Directory', headerAlign: 'left' } // -1 means dynamic width
];

// COLUMN_CONFIGS will be generated dynamically from config
export let COLUMN_CONFIGS: ColumnConfig[] = DEFAULT_COLUMN_CONFIGS;

/**
 * Generate column configurations from CLIConfig
 */
export function generateColumnConfigs(config: CLIConfig): ColumnConfig[] {
  const columns: ColumnConfig[] = [];
  const columnsConfig = config.display.columns;
  
  // Map config columns to ColumnConfig
  if (columnsConfig.timestamp.visible) {
    columns.push({
      name: 'timestamp',
      width: columnsConfig.timestamp.width,
      align: 'left',
      headerText: 'Event Timestamp',
      headerAlign: 'left'
    });
  }
  
  if (columnsConfig.elapsed.visible) {
    columns.push({
      name: 'elapsed',
      width: columnsConfig.elapsed.width,
      align: 'right',
      headerText: 'Elapsed',
      headerAlign: 'right'
    });
  }
  
  if (columnsConfig.fileName.visible) {
    columns.push({
      name: 'filename',
      width: columnsConfig.fileName.width,
      align: 'left',
      truncate: 'tail',
      headerText: 'File Name',
      headerAlign: 'left'
    });
  }
  
  if (columnsConfig.event.visible) {
    columns.push({
      name: 'event_type',
      width: columnsConfig.event.width,
      align: 'left',
      headerText: 'Event',
      headerAlign: 'left'
    });
  }
  
  if (columnsConfig.lines.visible) {
    columns.push({
      name: 'lines',
      width: columnsConfig.lines.width,
      align: 'right',
      headerText: 'Lines',
      headerAlign: 'right'
    });
  }
  
  if (columnsConfig.blocks.visible) {
    columns.push({
      name: 'blocks',
      width: columnsConfig.blocks.width,
      align: 'right',
      headerText: 'Blks',
      headerAlign: 'right'
    });
  }
  
  if (columnsConfig.size && columnsConfig.size.visible) {
    columns.push({
      name: 'size',
      width: columnsConfig.size.width,
      align: 'right',
      headerText: 'Size',
      headerAlign: 'right'
    });
  }
  
  if (columnsConfig.directory.visible) {
    columns.push({
      name: 'directory',
      width: -1, // Dynamic width
      align: 'left',
      truncate: 'head',
      headerText: 'Directory',
      headerAlign: 'left'
    });
  }
  
  return columns;
}

/**
 * Update global COLUMN_CONFIGS
 */
export function updateColumnConfigs(config: CLIConfig): void {
  COLUMN_CONFIGS = generateColumnConfigs(config);
}

/**
 * Generate colors from CLIConfig
 */
export function generateColors(config: CLIConfig): EventTableColors {
  return {
    find: config.colors.find || DEFAULT_COLORS.find,
    create: config.colors.create || DEFAULT_COLORS.create,
    modify: config.colors.modify || DEFAULT_COLORS.modify,
    delete: config.colors.delete || DEFAULT_COLORS.delete,
    move: config.colors.move || DEFAULT_COLORS.move,
    restore: config.colors.restore || DEFAULT_COLORS.restore,
    selected: DEFAULT_COLORS.selected,
    normal: DEFAULT_COLORS.normal
  };
}