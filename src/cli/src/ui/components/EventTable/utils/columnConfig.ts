/**
 * Column configuration utilities for EventTable
 */

import { ColumnConfig, COLUMN_CONFIGS } from '../types';
import { normalizeColumn } from './columnNormalizer';

/**
 * Calculate total fixed width of columns
 */
export function calculateFixedWidth(columns: ColumnConfig[]): number {
  return columns
    .filter(col => col.width > 0)
    .reduce((sum, col) => sum + col.width, 0);
}

/**
 * Calculate spacing between columns
 */
export function calculateColumnSpacing(columns: ColumnConfig[]): number {
  // 1 space between each column
  return Math.max(0, columns.length - 1);
}

/**
 * Generate header line with proper alignment for each column
 */
export function generateHeaderLine(directoryWidth: number = 40): string {
  const parts: string[] = [];
  
  for (const col of COLUMN_CONFIGS) {
    const width = col.width === -1 ? directoryWidth : col.width;
    const headerText = col.headerText || col.name;
    const headerAlign = col.headerAlign || col.align;
    
    // Use unified normalizeColumn function
    const formattedHeader = normalizeColumn(headerText, width, headerAlign);
    parts.push(formattedHeader);
  }
  
  return parts.join(' ');
}

/**
 * Generate separator line
 */
export function generateSeparatorLine(width: number): string {
  // Match existing format from UILayoutManager
  return '─'.repeat(width || 180);
}