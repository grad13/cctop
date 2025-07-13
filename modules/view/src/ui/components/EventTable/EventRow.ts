/**
 * EventRow class for managing individual event row state and rendering
 */

import { EventRow as EventRowData } from '../../../types/event-row';
import { normalizeColumn } from './utils/columnNormalizer';
import { TimeFormatter, EventTypeFormatter, FileSizeFormatter } from './formatters';
import { fg, bg } from '../../utils/styleFormatter';
import { EventTableColors, COLUMN_CONFIGS } from './types';

export class EventRow {
  private data: EventRowData;
  private selected: boolean = false;
  private directoryWidth: number;
  private cachedRender?: string;
  private isDirty: boolean = true;
  private colors?: EventTableColors;
  private directoryMutePaths?: string[];

  constructor(data: EventRowData, directoryWidth: number = 40, colors?: EventTableColors, directoryMutePaths?: string[]) {
    this.data = data;
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
    const lines = (this.data.lines || 0).toString();
    const blocks = (this.data.blocks || 0).toString();
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

    // Get column configurations
    const getColumnConfig = (name: string) => {
      return COLUMN_CONFIGS.find(col => col.name === name);
    };

    // Normalize columns using column configurations
    const columns = [];
    
    const timestampConfig = getColumnConfig('timestamp');
    if (timestampConfig) {
      columns.push(normalizeColumn(timestamp, timestampConfig.width, timestampConfig.align));
    }
    
    const elapsedConfig = getColumnConfig('elapsed');
    if (elapsedConfig) {
      columns.push(normalizeColumn(elapsed, elapsedConfig.width, elapsedConfig.align));
    }
    
    const filenameConfig = getColumnConfig('filename');
    if (filenameConfig) {
      columns.push(normalizeColumn(filename, filenameConfig.width, filenameConfig.align, filenameConfig.truncate));
    }
    
    // Event type with color
    const eventTypeColored = this.colorizeEventType(eventTypeRaw);
    
    // Remaining columns
    const afterEventColumns = [];
    
    const linesConfig = getColumnConfig('lines');
    if (linesConfig) {
      afterEventColumns.push(normalizeColumn(lines, linesConfig.width, linesConfig.align));
    }
    
    const blocksConfig = getColumnConfig('blocks');
    if (blocksConfig) {
      afterEventColumns.push(normalizeColumn(blocks, blocksConfig.width, blocksConfig.align));
    }
    
    const sizeConfig = getColumnConfig('size');
    if (sizeConfig) {
      afterEventColumns.push(normalizeColumn(size, sizeConfig.width, sizeConfig.align));
    }
    
    const directoryConfig = getColumnConfig('directory');
    if (directoryConfig) {
      // If directory was muted (doesn't start with /), show from beginning
      const wasMuted = !directory.startsWith('/');
      const truncateMode = wasMuted ? 'tail' : 'head';  // tail = truncate end, head = truncate beginning
      const dirWidth = directoryConfig.width === -1 ? this.directoryWidth : directoryConfig.width;
      afterEventColumns.push(normalizeColumn(directory, dirWidth, directoryConfig.align, truncateMode));
    }
    
    // Build result
    const beforeEvent = columns.join(' ') + ' ';
    const afterEvent = ' ' + afterEventColumns.join(' ');
    let result = beforeEvent + eventTypeColored + afterEvent;
    
    // Apply selection highlight
    if (this.selected) {
      result = bg(result, 'blue');
    } else {
      // Apply green text color for non-selected rows (Claude Code style)
      // Only apply green to parts that don't have event type colors
      result = fg(beforeEvent, 'green') + eventTypeColored + fg(afterEvent, 'green');
    }
    
    // Cache the result
    this.cachedRender = result;
    this.isDirty = false;
    
    // Debug - log muted directory and result
    const fs = require('fs');
    fs.appendFileSync('.cctop/logs/render-debug.log', `EventRow render: mutedDirectory="${directory}", result="${result}"\n`);
    
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