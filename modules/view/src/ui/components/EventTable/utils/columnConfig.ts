/**
 * Column configuration utilities for EventTable
 */

import { ViewConfig } from '../../../../config/ViewConfig';
import { normalizeColumn } from './columnNormalizer';

/**
 * Generate header line directly from ViewConfig
 */
export function generateHeaderLine(viewConfig: ViewConfig, directoryWidth: number = 40): string {
  const parts: string[] = [];
  const columns = viewConfig.display.columns;
  const columnsOrder = viewConfig.display['columns-order'] || [];
  
  // Generate headers in the order specified by columns-order
  for (const columnName of columnsOrder) {
    const columnConfig = columns[columnName];
    if (columnConfig && columnConfig.visible) {
      const width = columnConfig.width === 'auto' ? directoryWidth : columnConfig.width as number;
      const headerText = getHeaderText(columnName);
      const headerAlign = columnConfig.align === 'right' ? 'right' : 'left';
      
      const formattedHeader = normalizeColumn(headerText, width, headerAlign);
      parts.push(formattedHeader);
    }
  }
  
  // Always add directory column at the end if visible
  if (columns.directory && columns.directory.visible) {
    const headerText = 'Directory';
    const formattedHeader = normalizeColumn(headerText, directoryWidth, 'left');
    parts.push(formattedHeader);
  }
  
  return parts.join(' ');
}

/**
 * Get header text for column name
 */
function getHeaderText(columnName: string): string {
  const headerMap: Record<string, string> = {
    timestamp: 'Event Timestamp',
    elapsed: 'Elapsed',
    fileName: 'File Name',
    event: 'Event',
    lines: 'Lines',
    blocks: 'Blks',
    size: 'Size',
    directory: 'Directory'
  };
  return headerMap[columnName] || columnName;
}

/**
 * Generate separator line
 */
export function generateSeparatorLine(width: number): string {
  // Match existing format from UILayoutManager
  return '─'.repeat(width || 180);
}