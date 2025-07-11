/**
 * Column configuration utilities for EventTable
 */

import { ColumnConfig } from '../types';

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
 * Generate header line matching existing format exactly:
 * "Event Timestamp      Elapsed  File Name                           Event    Lines  Blocks    Size  Directory"
 */
export function generateHeaderLine(): string {
  // This matches the exact format from UILayoutManager.buildHeaderContent()
  return 'Event Timestamp      Elapsed  File Name                           Event    Lines  Blocks    Size  Directory';
}

/**
 * Generate separator line
 */
export function generateSeparatorLine(width: number): string {
  // Match existing format from UILayoutManager
  return '─'.repeat(width || 180);
}