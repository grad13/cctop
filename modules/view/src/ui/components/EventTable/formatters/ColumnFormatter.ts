/**
 * Base formatter class for table columns
 */

import { padOrTruncate, padLeft, truncateDirectoryPath } from '../utils/stringUtils';
import { EventRow } from '../../../../types/event-row';
import { ColumnConfig } from '../types';

export abstract class ColumnFormatter {
  protected columnConfig: ColumnConfig;

  constructor(columnConfig: ColumnConfig) {
    this.columnConfig = columnConfig;
  }

  /**
   * Format column value with proper alignment and width
   */
  formatColumn(value: string, width?: number): string {
    const targetWidth = width || this.columnConfig.width;
    
    switch (this.columnConfig.align) {
      case 'right':
        return padLeft(value, targetWidth);
      
      case 'center':
        // Center alignment (not used in current implementation)
        const padding = Math.max(0, targetWidth - value.length);
        const leftPad = Math.floor(padding / 2);
        const rightPad = padding - leftPad;
        return ' '.repeat(leftPad) + value + ' '.repeat(rightPad);
      
      case 'left':
      default:
        if (this.columnConfig.truncate === 'head' && this.columnConfig.name === 'directory') {
          return truncateDirectoryPath(value, targetWidth);
        }
        return padOrTruncate(value, targetWidth);
    }
  }

  /**
   * Extract and format value from event row
   */
  abstract format(event: EventRow, width?: number): string;
}