/**
 * Column normalization utility
 * Provides a unified interface for formatting column values with proper width and alignment
 */

import { padOrTruncate, padLeft, truncateDirectoryPath } from './stringUtils';

export type ColumnAlign = 'left' | 'right' | 'center';
export type TruncateMode = 'head' | 'tail' | 'middle';

/**
 * Normalize a column value to exact width with specified alignment and truncation
 * @param value - The value to normalize
 * @param width - Target width in characters
 * @param align - Alignment mode (left, right, center)
 * @param truncate - Truncation mode for overflow (head, tail, middle)
 * @returns Normalized string with exact width
 */
export function normalizeColumn(
  value: string,
  width: number,
  align: ColumnAlign = 'left',
  truncate?: TruncateMode
): string {
  // Special handling for directory truncation
  if (truncate === 'head') {
    // If the value fits, just pad it
    if (value.length <= width) {
      return padOrTruncate(value, width);
    }
    // Only truncate if too long
    const normalized = truncateDirectoryPath(value, width);
    // Ensure exact width
    return padOrTruncate(normalized, width);
  }

  switch (align) {
    case 'right':
      return padLeft(value, width);
    
    case 'center': {
      const cleanValue = value.replace(/\{[^}]+\}/g, '');
      const valueWidth = cleanValue.length;
      if (valueWidth >= width) {
        return padOrTruncate(value, width);
      }
      const totalPadding = width - valueWidth;
      const leftPad = Math.floor(totalPadding / 2);
      const rightPad = totalPadding - leftPad;
      return ' '.repeat(leftPad) + value + ' '.repeat(rightPad);
    }
    
    case 'left':
    default:
      return padOrTruncate(value, width);
  }
}

/**
 * Normalize multiple columns and join them with separator
 * @param columns - Array of column definitions
 * @param separator - Separator between columns (default: single space)
 * @returns Joined normalized columns
 */
export function normalizeRow(
  columns: Array<{
    value: string;
    width: number;
    align?: ColumnAlign;
    truncate?: TruncateMode;
  }>,
  separator: string = ' '
): string {
  return columns
    .map(col => normalizeColumn(col.value, col.width, col.align, col.truncate))
    .join(separator);
}