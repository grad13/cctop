/**
 * EventRow class for managing individual event row state and rendering
 */

import { EventRow as EventRowData } from '../../../types/event-row';
import { normalizeColumn } from './utils/columnNormalizer';
import { TimeFormatter, EventTypeFormatter, FileSizeFormatter } from './formatters';
import { fg, bg } from '../../utils/styleFormatter';
import { EventTableColors } from './types';
import { ViewConfig } from '../../../config/ViewConfig';

export class EventRow {
  private data: EventRowData;
  private selected: boolean = false;
  private directoryWidth: number;
  private cachedRender?: string;
  private isDirty: boolean = true;
  private colors?: EventTableColors;
  private directoryMutePaths?: string[];
  private viewConfig: ViewConfig;

  constructor(data: EventRowData, viewConfig: ViewConfig, directoryWidth: number = 40, colors?: EventTableColors, directoryMutePaths?: string[]) {
    this.data = data;
    this.viewConfig = viewConfig;
    this.directoryWidth = directoryWidth;
    this.colors = colors;
    this.directoryMutePaths = directoryMutePaths;
  }

  /**
   * Update event data and mark for re-render
   */
  update(data: EventRowData): void {
    // Check if data actually changed
    if (JSON.stringify(this.data) !== JSON.stringify(data)) {
      this.data = data;
      this.isDirty = true;
    }
  }

  /**
   * Get the event ID
   */
  getId(): number {
    return this.data.id;
  }

  /**
   * Set selection state (flip background)
   */
  setSelected(selected: boolean): void {
    if (this.selected !== selected) {
      this.selected = selected;
      this.isDirty = true;
    }
  }

  /**
   * Check if this row is selected
   */
  isSelected(): boolean {
    return this.selected;
  }

  /**
   * Update directory column width
   */
  setDirectoryWidth(width: number): void {
    if (this.directoryWidth !== width) {
      this.directoryWidth = width;
      this.isDirty = true;
    }
  }

  /**
   * Update directory mute paths
   */
  setDirectoryMutePaths(paths: string[] | undefined): void {
    // Only mark dirty if paths actually changed
    const pathsChanged = JSON.stringify(this.directoryMutePaths) !== JSON.stringify(paths);
    if (pathsChanged) {
      this.directoryMutePaths = paths;
      this.isDirty = true;
    }
  }

  /**
   * Generate rendered text for this row
   */
  render(): string {
    // Return cached render if not dirty
    if (!this.isDirty && this.cachedRender) {
      return this.cachedRender;
    }

    // Format column values
    const timestamp = TimeFormatter.formatTimestamp(this.data.timestamp);
    const elapsed = TimeFormatter.formatElapsed(this.data.timestamp);
    const filename = this.data.filename || '';
    const eventTypeRaw = this.data.event_type || '';
    const lines = this.data.lines === null || this.data.lines === undefined ? '-' : this.data.lines.toString();
    const blocks = this.data.blocks === null || this.data.blocks === undefined ? '-' : this.data.blocks.toString();
    const size = FileSizeFormatter.format(this.data.size || 0);
    let directory: string = this.data.directory || '';
    
    // Apply directory mute paths
    if (this.directoryMutePaths && this.directoryMutePaths.length > 0) {
      for (const mutePath of this.directoryMutePaths) {
        if (directory.startsWith(mutePath)) {
          directory = directory.substring(mutePath.length);
          break;  // Apply only the first matching mute path
        }
      }
    }

    // Get column configurations from ViewConfig
    const getColumnConfig = (name: string) => {
      const columnConfig = this.viewConfig.display.columns[name];
      return columnConfig && columnConfig.visible ? columnConfig : null;
    };

    // Build columns according to columns-order from ViewConfig
    const columns = [];
    const columnsOrder = this.viewConfig.display['columns-order'] || [];
    
    // Process columns in the order specified by columns-order
    for (const columnName of columnsOrder) {
      const columnConfig = getColumnConfig(columnName);
      if (!columnConfig) continue;
      
      const width = columnConfig.width === 'auto' ? this.directoryWidth : columnConfig.width as number;
      const align = columnConfig.align === 'right' ? 'right' : 'left';
      
      switch (columnName) {
        case 'timestamp':
          columns.push(normalizeColumn(timestamp, width, align));
          break;
        case 'elapsed':
          columns.push(normalizeColumn(elapsed, width, align));
          break;
        case 'fileName':
          columns.push(normalizeColumn(filename, width, align, 'middle'));
          break;
        case 'event':
          const eventTypeColored = this.colorizeEventType(eventTypeRaw);
          columns.push(normalizeColumn(eventTypeColored, width, align));
          break;
        case 'lines':
          columns.push(normalizeColumn(lines, width, align));
          break;
        case 'blocks':
          columns.push(normalizeColumn(blocks, width, align));
          break;
        case 'size':
          columns.push(normalizeColumn(size, width, align));
          break;
      }
    }
    
    // Add directory column if visible
    const directoryConfig = getColumnConfig('directory');
    if (directoryConfig) {
      // If directory was muted (doesn't start with /), show from beginning
      const wasMuted = !directory.startsWith('/');
      const truncateMode = wasMuted ? 'tail' : 'head';  // tail = truncate end, head = truncate beginning
      const dirWidth = directoryConfig.width === 'auto' ? this.directoryWidth : directoryConfig.width as number;
      const align = directoryConfig.align === 'right' ? 'right' : 'left';
      columns.push(normalizeColumn(directory, dirWidth, align, truncateMode));
    }
    
    // Build result from all columns (including event in the correct position)
    let result = columns.join(' ');
    
    // Apply selection highlight
    if (this.selected) {
      result = bg(result, 'blue');
    } else {
      // Apply green text color for non-selected rows (Claude Code style)
      result = fg(result, 'green');
    }
    
    // Cache the result
    this.cachedRender = result;
    this.isDirty = false;
    
    return result;
  }

  /**
   * Force re-render on next render() call
   */
  invalidate(): void {
    this.isDirty = true;
  }

  /**
   * Colorize event type based on config colors
   */
  private colorizeEventType(eventType: string): string {
    const formatted = EventTypeFormatter.format(eventType);
    
    // Use config colors if available
    if (this.colors) {
      const colorKey = eventType.toLowerCase() as keyof EventTableColors;
      const color = this.colors[colorKey];
      if (color) {
        return fg(formatted, color as any);
      }
    }
    
    // Fallback to default colorize
    return EventTypeFormatter.colorize(eventType);
  }
}