/**
 * Row rendering logic for EventTable
 */

import { EventRow } from '../../../../types/event-row';
import { COLUMN_CONFIGS } from '../types';
import { normalizeColumn } from '../utils/columnNormalizer';
import { TimeFormatter, EventTypeFormatter, FileSizeFormatter } from '../formatters';
import { fg, bg, bold, style } from '../../../utils/styleFormatter';

export class RowRenderer {
  /**
   * Render a single event row
   */
  static renderRow(
    event: EventRow, 
    index: number, 
    absoluteIndex: number,
    selectedIndex: number,
    directoryWidth: number,
    directoryMutePaths?: string[]
  ): string {
    // Format column values
    const timestamp = TimeFormatter.formatTimestamp(event.timestamp);
    const elapsed = TimeFormatter.formatElapsed(event.timestamp);
    const filename = event.filename || '';
    const eventTypeRaw = event.event_type || '';
    const lines = (event.lines || 0).toString();
    const blocks = (event.blocks || 0).toString();
    const size = FileSizeFormatter.format(event.size || 0);
    let directory = event.directory || '';
    
    // Apply directory mute paths
    if (directoryMutePaths && directoryMutePaths.length > 0) {
      for (const mutePath of directoryMutePaths) {
        if (directory.startsWith(mutePath)) {
          directory = directory.substring(mutePath.length);
          break;  // Apply only the first matching mute path
        }
      }
    }

    // Normalize columns using unified function
    const columns = [];
    
    // Add columns based on COLUMN_CONFIGS
    columns.push(normalizeColumn(timestamp, 19, 'left'));
    columns.push(normalizeColumn(elapsed, 8, 'right'));
    columns.push(normalizeColumn(filename, 35, 'left', 'tail'));
    
    // Continue with remaining columns
    const afterEventColumns = [];
    afterEventColumns.push(normalizeColumn(lines, 5, 'right'));
    afterEventColumns.push(normalizeColumn(blocks, 4, 'right'));
    afterEventColumns.push(normalizeColumn(size, 7, 'right'));
    afterEventColumns.push(normalizeColumn(directory, directoryWidth, 'left', 'head'));
    
    // Event type needs special handling for color
    const eventTypeColored = EventTypeFormatter.colorize(eventTypeRaw);
    
    // Build result
    const beforeEvent = columns.join(' ') + ' ';
    const afterEvent = ' ' + afterEventColumns.join(' ');
    let result = beforeEvent + eventTypeColored + afterEvent;
    
    // Apply selection highlight
    if (absoluteIndex === selectedIndex) {
      // Keep blue background for selected row
      result = bg(result, 'blue');
    } else {
      // Apply green text color for non-selected rows (Claude Code style)
      // Only apply green to parts that don't have event type colors
      result = fg(beforeEvent, 'green') + eventTypeColored + fg(afterEvent, 'green');
    }
    
    return result;
  }

  /**
   * Render "end of data" message
   */
  static renderEndOfData(terminalWidth: number): string {
    const endMessage = '─── end of data ───';
    const padding = Math.max(0, Math.floor((terminalWidth - endMessage.length) / 2));
    return ' '.repeat(padding) + style(endMessage, { fg: 'white', bold: true });
  }
}