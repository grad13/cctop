/**
 * EventRow class for managing individual event row state and rendering
 */

import { EventRow as EventRowData } from '../../../types/event-row';
import { normalizeColumn } from './utils/columnNormalizer';
import { TimeFormatter, EventTypeFormatter, FileSizeFormatter } from './formatters';
import { fg, bg } from '../../utils/styleFormatter';

export class EventRow {
  private data: EventRowData;
  private selected: boolean = false;
  private directoryWidth: number;
  private cachedRender?: string;
  private isDirty: boolean = true;

  constructor(data: EventRowData, directoryWidth: number = 40) {
    this.data = data;
    this.directoryWidth = directoryWidth;
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
    const directory = this.data.directory || '';

    // Normalize columns using unified function
    const columns = [];
    columns.push(normalizeColumn(timestamp, 19, 'left'));
    columns.push(normalizeColumn(elapsed, 8, 'right'));
    columns.push(normalizeColumn(filename, 35, 'left', 'tail'));
    
    // Event type with color
    const eventTypeColored = EventTypeFormatter.colorize(eventTypeRaw);
    
    // Remaining columns
    const afterEventColumns = [];
    afterEventColumns.push(normalizeColumn(lines, 5, 'right'));
    afterEventColumns.push(normalizeColumn(blocks, 4, 'right'));
    afterEventColumns.push(normalizeColumn(size, 7, 'right'));
    afterEventColumns.push(normalizeColumn(directory, this.directoryWidth, 'left', 'head'));
    
    // Build result
    const beforeEvent = columns.join(' ') + ' ';
    const afterEvent = ' ' + afterEventColumns.join(' ');
    let result = beforeEvent + eventTypeColored + afterEvent;
    
    // Apply selection highlight
    if (this.selected) {
      result = bg(result, 'blue');
    } else {
      // Apply green text color for non-selected rows
      result = fg(beforeEvent, 'green') + eventTypeColored + fg(afterEvent, 'green');
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
}