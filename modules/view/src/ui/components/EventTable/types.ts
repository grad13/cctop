/**
 * Type definitions for EventTable module
 */

import blessed from 'blessed';
import { EventRow } from '../../../types/event-row';
import { ViewConfig } from '../../../config/ViewConfig';

export interface EventTableOptions {
  parent: blessed.Widgets.Screen | blessed.Widgets.BoxElement;
  top?: number | string;
  left?: number | string;
  width?: number | string;
  height?: number | string;
  style?: blessed.Widgets.BoxOptions['style'];
  viewConfig?: ViewConfig;
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

// No default values - all configuration comes from ViewConfig

// Removed: All default column configurations and global COLUMN_CONFIGS
// All values now come directly from ViewConfig

/**
 * Generate colors from ViewConfig
 */
export function generateColorsFromView(config: ViewConfig): EventTableColors {
  return {
    find: config.colors.find || DEFAULT_COLORS.find,
    create: config.colors.create || DEFAULT_COLORS.create,
    modify: config.colors.modify || DEFAULT_COLORS.modify,
    delete: config.colors.delete || DEFAULT_COLORS.delete,
    move: config.colors.move || DEFAULT_COLORS.move,
    restore: config.colors.back || DEFAULT_COLORS.restore,
    selected: DEFAULT_COLORS.selected,
    normal: DEFAULT_COLORS.normal
  };
}