/**
 * Header rendering logic for EventTable
 */

import { generateHeaderLine, generateSeparatorLine } from '../utils/columnConfig';

export class HeaderRenderer {
  /**
   * Render table header with column names
   */
  static renderHeader(screenWidth: number): string {
    const headerLine = generateHeaderLine();
    const separatorLine = generateSeparatorLine(screenWidth || 180);
    
    return `${headerLine}\n${separatorLine}`;
  }

  /**
   * Render just the column header line
   */
  static renderColumnLine(): string {
    return generateHeaderLine();
  }

  /**
   * Render just the separator line
   */
  static renderSeparator(width: number): string {
    return generateSeparatorLine(width);
  }
}