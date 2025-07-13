/**
 * Header rendering logic for EventTable
 */

import { generateHeaderLine, generateSeparatorLine } from '../utils/columnConfig';
import { ViewConfig } from '../../../../config/ViewConfig';

export class HeaderRenderer {
  /**
   * Render table header with column names
   */
  static renderHeader(viewConfig: ViewConfig, screenWidth: number, directoryWidth: number): string {
    const headerLine = generateHeaderLine(viewConfig, directoryWidth);
    const separatorLine = generateSeparatorLine(screenWidth || 180);
    
    return `${headerLine}\n${separatorLine}`;
  }

  /**
   * Render just the column header line
   */
  static renderColumnLine(viewConfig: ViewConfig, directoryWidth: number = 40): string {
    return generateHeaderLine(viewConfig, directoryWidth);
  }

  /**
   * Render just the separator line
   */
  static renderSeparator(width: number): string {
    return generateSeparatorLine(width);
  }
}