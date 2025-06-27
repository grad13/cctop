/**
 * Event Formatter (Single Responsibility: Event line formatting)
 * Extracted from cli-display.js for better maintainability
 */

const chalk = require('chalk');
const stringWidth = require('string-width');
const { padEndWithWidth, padStartWithWidth } = require('../../utils/display-width');

class EventFormatter {
  constructor(config = {}) {
    this.widthConfig = config.widthConfig || {};
    this.startTime = config.startTime || Date.now();
  }

  /**
   * Format complete event line
   */
  formatEventLine(event) {
    const timestamp = new Date(event.timestamp);
    const now = Date.now();
    
    // Format each column
    const modified = this.formatTimestamp(timestamp);
    // Calculate elapsed time from cctop start time, not from event timestamp
    const elapsed = this.formatElapsed(now - this.startTime);
    const fileName = padEndWithWidth(event.file_name, 28);
    const directory = this.truncateDirectoryPathWithWidth(
      this.formatDirectory(event.directory), 
      this.widthConfig.directory || 30
    );
    const eventType = this.formatEventType(event.event_type);
    const lines = this.formatNumber(event.line_count, 5);
    const blocks = this.formatNumber(event.block_count, 6);
    
    // Build line (responsive layout - Directory column at rightmost with dynamic width)
    return `${modified}  ${elapsed}  ${fileName}  ${eventType} ${lines} ${blocks}  ${directory}`;
  }

  /**
   * Format timestamp as YYYY-MM-DD HH:MM:SS
   */
  formatTimestamp(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * Format elapsed time as HH:MM:SS or MM:SS
   */
  formatElapsed(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    } else {
      return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`.padStart(8);
    }
  }

  /**
   * Format directory path (UI002/UI007 compliant)
   * Remove ./ prefix for cleaner display
   */
  formatDirectory(dirPath) {
    if (!dirPath) return '.';
    
    const path = require('path');
    const cwd = process.cwd();
    
    try {
      const absoluteFullPath = path.resolve(dirPath);
      const absoluteWatchPath = path.resolve(cwd);
      
      // Check if under monitored directory
      if (absoluteFullPath.startsWith(absoluteWatchPath + path.sep) || absoluteFullPath === absoluteWatchPath) {
        const relativePath = path.relative(absoluteWatchPath, absoluteFullPath);
        return relativePath || '.';
      }
      
      return dirPath; // Return original path if not under
    } catch (error) {
      return dirPath; // Return original path on error
    }
  }

  /**
   * Truncate directory path with tail priority
   */
  truncateDirectoryPathWithWidth(path, maxWidth) {
    if (stringWidth(path) <= maxWidth) {
      return padEndWithWidth(path, maxWidth);
    }
    
    // Tail-priority truncation (preserve end part of path)
    const ellipsis = '...';
    const ellipsisWidth = stringWidth(ellipsis);
    let truncated = '';
    let width = 0;
    const targetWidth = maxWidth - ellipsisWidth;
    
    // Get characters from the end
    for (let i = path.length - 1; i >= 0; i--) {
      const char = path[i];
      const charWidth = stringWidth(char);
      if (width + charWidth > targetWidth) {
        break;
      }
      truncated = char + truncated;
      width += charWidth;
    }
    
    return padEndWithWidth(ellipsis + truncated, maxWidth);
  }

  /**
   * Color formatting for event types
   */
  formatEventType(eventType) {
    if (!eventType) {
      eventType = 'unknown';
    }
    const formatted = padEndWithWidth(eventType, 8);
    
    switch (eventType) {
      case 'find':
        return chalk.blue(formatted);
      case 'create':
        return chalk.greenBright(formatted);
      case 'modify':
        return formatted; // Default color
      case 'move':
        return chalk.cyan(formatted);
      case 'delete':
        return chalk.gray(formatted);
      case 'restore':
        return chalk.yellowBright(formatted);
      default:
        return formatted;
    }
  }

  /**
   * Format numbers with right alignment
   */
  formatNumber(value, width) {
    if (value === null || value === undefined) {
      return padStartWithWidth('-', width);
    }
    return padStartWithWidth(String(value), width);
  }

  /**
   * Update width configuration
   */
  updateWidthConfig(widthConfig) {
    this.widthConfig = widthConfig;
  }
}

module.exports = EventFormatter;