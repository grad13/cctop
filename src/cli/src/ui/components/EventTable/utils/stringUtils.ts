/**
 * String manipulation utilities for EventTable
 */

import stringWidth from 'string-width';

/**
 * Pad or truncate text to exact width with East Asian Width support
 */
export function padOrTruncate(text: string, targetWidth: number): string {
  // Remove blessed tags for width calculation
  const cleanText = text.replace(/\{[^}]+\}/g, '');
  const currentWidth = stringWidth(cleanText);
  
  if (currentWidth > targetWidth) {
    return truncateWithEllipsis(text, targetWidth);
  }
  
  // Preserve tags in original text and add padding
  return text + ' '.repeat(targetWidth - currentWidth);
}

/**
 * Truncate text with ellipsis, supporting East Asian Width
 */
export function truncateWithEllipsis(text: string, maxWidth: number): string {
  const ellipsis = '...';
  const ellipsisWidth = 3;
  
  // Check if text fits within maxWidth
  const textWidth = stringWidth(text);
  if (textWidth <= maxWidth) {
    return text;
  }
  
  if (maxWidth <= ellipsisWidth) {
    return ellipsis.substring(0, maxWidth);
  }
  
  const targetWidth = maxWidth - ellipsisWidth;
  let result = '';
  let currentWidth = 0;
  
  const chars = Array.from(text);
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const charWidth = stringWidth(char);
    
    if (currentWidth + charWidth <= targetWidth) {
      result += char;
      currentWidth += charWidth;
    } else {
      break;
    }
  }
  
  // Ensure result + ellipsis equals exactly maxWidth
  const finalResult = result + ellipsis;
  const finalWidth = stringWidth(finalResult);
  
  // Pad if needed to reach exact width
  if (finalWidth < maxWidth) {
    return finalResult + ' '.repeat(maxWidth - finalWidth);
  }
  
  return finalResult;
}

/**
 * Pad text with spaces on the left
 */
export function padLeft(text: string, width: number): string {
  const currentWidth = stringWidth(text);
  if (currentWidth >= width) {
    return text;
  }
  return ' '.repeat(width - currentWidth) + text;
}

/**
 * Truncate directory path from head (show tail)
 */
export function truncateDirectoryPath(path: string, maxWidth: number): string {
  const width = stringWidth(path);
  
  if (width <= maxWidth) {
    return path;
  }
  
  const ellipsis = '...';
  const ellipsisWidth = 3;
  const targetWidth = maxWidth - ellipsisWidth;
  
  // Take characters from the end
  let result = '';
  let currentWidth = 0;
  
  // Iterate from the end of the string
  for (let i = path.length - 1; i >= 0 && currentWidth < targetWidth; i--) {
    const char = path[i];
    const charWidth = stringWidth(char);
    if (currentWidth + charWidth <= targetWidth) {
      result = char + result;
      currentWidth += charWidth;
    } else {
      break;
    }
  }
  
  return ellipsis + result;
}

/**
 * Strip blessed color tags from text
 */
export function stripTags(text: string): string {
  return text.replace(/\{[^}]+\}/g, '');
}