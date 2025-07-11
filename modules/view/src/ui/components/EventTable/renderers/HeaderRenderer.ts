/**
 * Header rendering logic for EventTable
 */

import { generateHeaderLine, generateSeparatorLine } from '../utils/columnConfig';

export class HeaderRenderer {
  /**
   * Render table header with column names
   */
  static renderHeader(screenWidth: number, directoryWidth: number): string {
    const headerLine = generateHeaderLine(directoryWidth);
    const separatorLine = generateSeparatorLine(screenWidth || 180);
    
    return `${headerLine}\n${separatorLine}`;
  }

  /**
   * Render just the column header line
   */
  static renderColumnLine(directoryWidth: number = 40): string {
    return generateHeaderLine(directoryWidth);
  }

  /**
   * Render just the separator line
   */
  static renderSeparator(width: number): string {
    return generateSeparatorLine(width);
  }
}