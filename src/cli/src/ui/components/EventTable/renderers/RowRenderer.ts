/**
 * Row rendering logic for EventTable
 */

import { EventRow } from '../../../../types/event-row';
import { COLUMN_CONFIGS } from '../types';
import { padOrTruncate, padLeft, truncateDirectoryPath } from '../utils/stringUtils';
import { TimeFormatter, EventTypeFormatter, FileSizeFormatter } from '../formatters';

export class RowRenderer {
  /**
   * Render a single event row
   */
  static renderRow(
    event: EventRow, 
    index: number, 
    absoluteIndex: number,
    selectedIndex: number,
    directoryWidth: number
  ): string {
    // Format each column
    const timestamp = TimeFormatter.formatTimestamp(event.timestamp);               // 19 chars
    const elapsed = TimeFormatter.formatElapsed(event.timestamp);                   // 5 chars like "03:33"
    const filename = event.filename || '';                                      
    const eventTypeRaw = event.event_type || '';
    const lines = (event.lines || 0).toString();
    const blocks = (event.blocks || 0).toString();  
    const size = FileSizeFormatter.format(event.size || 0);                       // Size column
    const directory = event.directory || '';

    // Build exact spacing to match header
    let resultBeforeEvent = '';
    let resultAfterEvent = '';
    
    // Part before event type (will be colored green if not selected)
    resultBeforeEvent += padOrTruncate(timestamp, 19);                            // Event Timestamp (19 chars)
    resultBeforeEvent += ' ';                                                      // 1 space
    resultBeforeEvent += padLeft(elapsed, 9);                                      // Elapsed (9 chars, right-aligned)
    resultBeforeEvent += ' ';                                                      // 1 space
    resultBeforeEvent += padOrTruncate(filename, 35);                             // File Name (35 chars)
    resultBeforeEvent += ' ';                                                      // 1 space
    
    // Event type (has its own colors)
    const eventTypeColored = EventTypeFormatter.colorize(eventTypeRaw);            // Event (8 chars, pre-formatted)
    
    // Part after event type (will be colored green if not selected)
    resultAfterEvent += ' ';                                                       // 1 space
    resultAfterEvent += padLeft(lines, 6);                                        // Lines (6 chars, right-aligned)
    resultAfterEvent += ' ';                                                       // 1 space
    resultAfterEvent += padLeft(blocks, 8);                                       // Blocks (8 chars, right-aligned)
    resultAfterEvent += ' ';                                                       // 1 space
    resultAfterEvent += padLeft(size, 7);                                         // Size (7 chars, right-aligned)
    resultAfterEvent += ' ';                                                       // 1 space
    resultAfterEvent += truncateDirectoryPath(directory, directoryWidth);          // Dynamic width
    
    // Combine parts
    let result = resultBeforeEvent + eventTypeColored + resultAfterEvent;
    
    // Apply selection highlight
    if (absoluteIndex === selectedIndex) {
      // Keep blue background for selected row
      result = `{blue-bg}${result}{/blue-bg}`;
    } else {
      // Apply green text color for non-selected rows (Claude Code style)
      // Only apply green to parts that don't have event type colors
      result = `{green-fg}${resultBeforeEvent}{/green-fg}${eventTypeColored}{green-fg}${resultAfterEvent}{/green-fg}`;
    }
    
    return result;
  }

  /**
   * Render "end of data" message
   */
  static renderEndOfData(terminalWidth: number): string {
    const endMessage = '─── end of data ───';
    const padding = Math.max(0, Math.floor((terminalWidth - endMessage.length) / 2));
    return ' '.repeat(padding) + `{bold}{white-fg}${endMessage}{/white-fg}{/bold}`;
  }
}