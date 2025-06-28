/**
 * Event Formatter (Single Responsibility: Event line formatting)
 * Extracted from cli-display.js for better maintainability
 * FUNC-207: Integrated with ColorManager for customizable colors
 */

import chalk = require('chalk');
import stringWidth = require('string-width');
import { padEndWithWidth, padStartWithWidth } from '../../utils/display-width';
import ColorManager = require('../../color/ColorManager');
import path = require('path');

interface EventFormatterConfig {
  widthConfig?: WidthConfig;
  startTime?: number;
  configPath?: string;
}

interface WidthConfig {
  directory?: number;
  [key: string]: number | undefined;
}

interface FormattableEvent {
  timestamp: number;
  file_name: string;
  directory: string;
  event_type: string;
  line_count?: number | null;
  block_count?: number | null;
}

class EventFormatter {
  private widthConfig: WidthConfig;
  private startTime: number;
  private colorManager: ColorManager;

  constructor(config: EventFormatterConfig = {}) {
    this.widthConfig = config.widthConfig || {};
    this.startTime = config.startTime || Date.now();
    
    // FUNC-207: Initialize ColorManager
    this.colorManager = new ColorManager(config.configPath || '.cctop');
  }

  /**
   * Format complete event line
   */
  formatEventLine(event: FormattableEvent): string {
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
  formatTimestamp(date: Date): string {
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
  formatElapsed(ms: number): string {
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
  formatDirectory(dirPath: string): string {
    if (!dirPath) return '.';
    
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
    } catch (error: any) {
      return dirPath; // Return original path on error
    }
  }

  /**
   * Truncate directory path with tail priority
   */
  truncateDirectoryPathWithWidth(path: string, maxWidth: number): string {
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
   * Color formatting for event types (FUNC-207: Theme-based coloring)
   */
  formatEventType(eventType: string): string {
    if (!eventType) {
      eventType = 'unknown';
    }
    const formatted = padEndWithWidth(eventType, 8);
    
    // FUNC-207: Use ColorManager for theme-based coloring
    return this.colorManager.colorizeEventType(formatted, eventType);
  }

  /**
   * Format numbers with right alignment
   */
  formatNumber(value: number | null | undefined, width: number): string {
    if (value === null || value === undefined) {
      return padStartWithWidth('-', width);
    }
    return padStartWithWidth(String(value), width);
  }

  /**
   * Update width configuration
   */
  updateWidthConfig(widthConfig: WidthConfig): void {
    this.widthConfig = widthConfig;
  }
}

export = EventFormatter;