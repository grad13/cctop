/**
 * UI Data Formatter
 * Handles formatting of event data for display
 */

import stringWidth from 'string-width';
import { EventRow } from '../types/event-row';
import { UIState } from './UIState';

export class UIDataFormatter {
  private uiState: UIState;

  constructor(uiState: UIState) {
    this.uiState = uiState;
  }

  formatEventList(): string[] {
    // Calculate dynamic directory width
    this.uiState.calculateDynamicWidth();
    
    const visibleEvents = this.uiState.getVisibleEvents();
    const viewportStart = this.uiState.getViewportStartIndex();
    
    // Debug: Check if events exist
    if (!visibleEvents || visibleEvents.length === 0) {
      return [];
    }
    
    const formattedEvents = visibleEvents.map((event, index) => {
      // Calculate absolute index for selection highlighting
      const absoluteIndex = viewportStart + index;
      // Rebuild completely to match header exactly
      const timestamp = this.formatTimestamp(event.timestamp);                    // 19 chars
      const elapsed = this.formatElapsed(event.timestamp);                        // 5 chars like "03:33"
      const filename = event.filename || '';                                      
      const eventTypeRaw = event.event_type || '';
      const lines = (event.lines || 0).toString();
      const blocks = (event.blocks || 0).toString();  
      const size = this.formatFileSize(event.size || 0);     // Size column
      const directory = event.directory || '';

      // Build exact spacing to match header: "Event Timestamp      Elapsed  File Name                           Event    Lines  Blocks    Size  Directory"
      let result = '';
      let resultBeforeEvent = '';
      let resultAfterEvent = '';
      
      // Part before event type (will be colored green if not selected)
      resultBeforeEvent += this.padOrTruncate(timestamp, 19);           // Event Timestamp (19 chars)
      resultBeforeEvent += ' ';                                         // 1 space
      resultBeforeEvent += this.padLeft(elapsed, 9);                    // Elapsed (9 chars, right-aligned)
      resultBeforeEvent += ' ';                                         // 1 space
      resultBeforeEvent += this.padOrTruncate(filename, 35);            // File Name (35 chars)
      resultBeforeEvent += ' ';                                         // 1 space
      
      // Event type (has its own colors)
      const eventTypeColored = this.colorizeEventType(eventTypeRaw);   // Event (8 chars, pre-formatted)
      
      // Part after event type (will be colored green if not selected)
      resultAfterEvent += ' ';                                         // 1 space
      resultAfterEvent += this.padLeft(lines, 6);                      // Lines (6 chars, right-aligned)
      resultAfterEvent += ' ';                                         // 1 space
      resultAfterEvent += this.padLeft(blocks, 8);                     // Blocks (8 chars, right-aligned)
      resultAfterEvent += ' ';                                         // 1 space
      resultAfterEvent += this.padLeft(size, 7);                       // Size (7 chars, right-aligned)
      resultAfterEvent += ' ';                                         // 1 space
      resultAfterEvent += this.truncateDirectoryPath(directory, this.uiState.getDirectoryWidth()); // Dynamic width
      
      // Combine parts
      result = resultBeforeEvent + eventTypeColored + resultAfterEvent;
      
      // Apply selection highlight
      if (absoluteIndex === this.uiState.getSelectedIndex()) {
        // Keep blue background for selected row
        result = `{blue-bg}${result}{/blue-bg}`;
      } else {
        // Apply green text color for non-selected rows (Claude Code style)
        // Only apply green to parts that don't have event type colors
        result = `{green-fg}${resultBeforeEvent}{/green-fg}${eventTypeColored}{green-fg}${resultAfterEvent}{/green-fg}`;
      }
      
      return result;
    });
    
    // Add "end of data" message if no more data
    // Check if the last event is visible in the current viewport
    const totalEvents = this.uiState.getEventsCount();
    const viewportEnd = viewportStart + visibleEvents.length;
    const isLastEventVisible = viewportEnd >= totalEvents && totalEvents > 0;
    const hasMore = this.uiState.hasMoreDataToLoad();
    
    if (!hasMore && isLastEventVisible && formattedEvents.length > 0) {
      const terminalWidth = process.stdout.columns || 80;
      const endMessage = '─── end of data ───';
      const padding = Math.max(0, Math.floor((terminalWidth - endMessage.length) / 2));
      formattedEvents.push(' '.repeat(padding) + `{bold}{white-fg}${endMessage}{/white-fg}{/bold}`);
    }
    
    return formattedEvents;
  }

  formatTimestamp(timestamp: string | number): string {
    // Handle both Unix timestamp (number) and ISO string
    const date = typeof timestamp === 'number' ? new Date(timestamp * 1000) : new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  formatElapsed(timestamp: string | number): string {
    const now = Date.now();
    // Handle both Unix timestamp (number) and ISO string
    const eventTime = typeof timestamp === 'number' ? timestamp * 1000 : new Date(timestamp).getTime();
    const diffSeconds = Math.floor((now - eventTime) / 1000);
    
    // Staged elapsed time display
    const MINUTE = 60;
    const HOUR = 3600;
    const DAY = 86400;
    const MONTH = 30 * DAY; // 30 days = 1 month
    
    if (diffSeconds < 60 * MINUTE) {
      // 0-60 minutes: Show as mm:ss
      const minutes = Math.floor(diffSeconds / MINUTE);
      const seconds = diffSeconds % MINUTE;
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } else if (diffSeconds < 72 * HOUR) {
      // 60 minutes to 72 hours: Show as hh:mm:ss
      const hours = Math.floor(diffSeconds / HOUR);
      const minutes = Math.floor((diffSeconds % HOUR) / MINUTE);
      const seconds = diffSeconds % MINUTE;
      // Remove leading zero for hours under 10 (e.g., "6:18:47" instead of "06:18:47")
      const hoursStr = hours < 10 ? String(hours) : String(hours).padStart(2, '0');
      return `${hoursStr}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } else if (diffSeconds < 90 * DAY) {
      // 72 hours to 90 days: Show as "n days"
      const days = Math.floor(diffSeconds / DAY);
      return `${days} days`;
    } else {
      // 90 days or more: Show as "n months"
      const months = Math.floor(diffSeconds / MONTH);
      return `${months} months`;
    }
  }

  colorizeEventType(eventType: string): string {
    // Use blessed tags for colors (now that we're using box instead of list)
    const colors: { [key: string]: string } = {
      find: '{cyan-fg}find    {/cyan-fg}',      // "find    " = 8 chars
      create: '{green-fg}create  {/green-fg}',  // "create  " = 8 chars  
      modify: '{yellow-fg}modify  {/yellow-fg}', // "modify  " = 8 chars
      delete: '{red-fg}delete  {/red-fg}',      // "delete  " = 8 chars
      move: '{magenta-fg}move    {/magenta-fg}', // "move    " = 8 chars
      restore: '{blue-fg}restore {/blue-fg}'    // "restore " = 8 chars
    };
    
    return colors[eventType.toLowerCase()] || eventType.padEnd(8);
  }

  truncateDirectoryPath(path: string, maxWidth: number): string {
    // Tail-first truncation for directories
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

  padOrTruncate(text: string, targetWidth: number): string {
    // East Asian Width support
    // Remove blessed tags for width calculation
    const cleanText = text.replace(/\{[^}]+\}/g, '');
    const currentWidth = stringWidth(cleanText);
    
    if (currentWidth > targetWidth) {
      return this.truncateWithEllipsis(text, targetWidth);
    }
    
    // Preserve tags in original text and add padding
    return text + ' '.repeat(targetWidth - currentWidth);
  }
  
  truncateWithEllipsis(text: string, maxWidth: number): string {
    // Proper truncation with East Asian Width support
    const ellipsis = '...';
    const ellipsisWidth = 3;
    
    if (maxWidth <= ellipsisWidth) {
      return ellipsis.substring(0, maxWidth);
    }
    
    const targetWidth = maxWidth - ellipsisWidth;
    let result = '';
    let currentWidth = 0;
    
    for (const char of text) {
      const charWidth = stringWidth(char);
      if (currentWidth + charWidth <= targetWidth) {
        result += char;
        currentWidth += charWidth;
      } else {
        break;
      }
    }
    
    return result + ellipsis;
  }

  padLeft(text: string, width: number): string {
    const currentWidth = stringWidth(text);
    if (currentWidth >= width) {
      return text;
    }
    return ' '.repeat(width - currentWidth) + text;
  }

  // Dynamic file size formatting
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0B';
    
    if (bytes < 1024) {
      // 0-1023 bytes: show as bytes
      return `${bytes}B`;
    } else if (bytes < 1024 * 1024) {
      // 1KB-1023KB: show as K with 1 decimal
      const kb = bytes / 1024;
      return `${kb.toFixed(1)}K`;
    } else if (bytes < 1024 * 1024 * 1024) {
      // 1MB-1023MB: show as M with 1 decimal
      const mb = bytes / (1024 * 1024);
      return `${mb.toFixed(1)}M`;
    } else {
      // 1GB+: show as G with 1 decimal
      const gb = bytes / (1024 * 1024 * 1024);
      return `${gb.toFixed(1)}G`;
    }
  }
}