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
  { name: 'timestamp', width: 19, align: 'left' },
  { name: 'elapsed', width: 9, align: 'right' },
  { name: 'filename', width: 35, align: 'left', truncate: 'tail' },
  { name: 'event_type', width: 8, align: 'left' },
  { name: 'lines', width: 6, align: 'right' },
  { name: 'blocks', width: 8, align: 'right' },
  { name: 'size', width: 7, align: 'right' },
  { name: 'directory', width: -1, align: 'left', truncate: 'head' } // -1 means dynamic width
];