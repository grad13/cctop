/**
 * Type definitions for EventTable module
 */

import blessed from 'blessed';
import { EventRow } from '../../../types/event-row';

export interface EventTableOptions {
  parent: blessed.Widgets.Screen | blessed.Widgets.BoxElement;
  top?: number | string;
  left?: number | string;
  width?: number | string;
  height?: number | string;
  style?: blessed.Widgets.BoxOptions['style'];
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

export const COLUMN_CONFIGS: ColumnConfig[] = [
  { name: 'timestamp', width: 19, align: 'left', headerText: 'Event Timestamp', headerAlign: 'left' },
  { name: 'elapsed', width: 8, align: 'right', headerText: 'Elapsed', headerAlign: 'right' },
  { name: 'filename', width: 35, align: 'left', truncate: 'tail', headerText: 'File Name', headerAlign: 'left' },
  { name: 'event_type', width: 8, align: 'left', headerText: 'Event', headerAlign: 'left' },
  { name: 'lines', width: 5, align: 'right', headerText: 'Lines', headerAlign: 'right' },
  { name: 'blocks', width: 4, align: 'right', headerText: 'Blocks', headerAlign: 'right' },
  { name: 'size', width: 7, align: 'right', headerText: 'Size', headerAlign: 'right' },
  { name: 'directory', width: -1, align: 'left', truncate: 'head', headerText: 'Directory', headerAlign: 'left' } // -1 means dynamic width
];