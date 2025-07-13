/**
 * Row rendering logic for EventTable
 */

import { EventRow } from '../../../../types/event-row';
import { normalizeColumn } from '../utils/columnNormalizer';
import { TimeFormatter, EventTypeFormatter, FileSizeFormatter } from '../formatters';
import { fg, bg, bold, style } from '../../../utils/styleFormatter';

export class RowRenderer {
  /**
   * Render a single event row (DEPRECATED - Use EventRow class instead)
   */
  static renderRow(
    event: EventRow, 
    index: number, 
    absoluteIndex: number,
    selectedIndex: number,
    directoryWidth: number,
    directoryMutePaths?: string[]
  ): string {
    // DEPRECATED: This method is no longer used. EventRow class handles rendering directly.
    return `DEPRECATED: RowRenderer.renderRow() - Use EventRow.render() instead`;
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