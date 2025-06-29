/**
 * Event Formatter
 * Handles formatting of event data for display
 */

import chalk = require('chalk');
import { padEndWithWidth, padStartWithWidth, truncateWithEllipsis } from '../../utils/display-width';
import { EventData, CLIDisplayLegacyWidthConfig } from '../../types';

export class EventFormatter {
  private widthConfig: CLIDisplayLegacyWidthConfig;

  constructor(widthConfig: CLIDisplayLegacyWidthConfig) {
    this.widthConfig = widthConfig;
  }

  /**
   * Format a complete event line
   */
  formatEventLine(event: EventData): string {
    const parts = [
      this.formatTimestamp(event.timestamp),
      chalk.gray('│'),
      this.formatElapsed(event.elapsed_ms),
      chalk.gray('│'),
      padEndWithWidth(event.file_name, this.widthConfig.fileNameWidth),
      chalk.gray('│'),
      this.formatEventType(event.event_type),
      chalk.gray('│'),
      padEndWithWidth(this.formatDirectory(event.directory), this.widthConfig.directoryWidth),
      chalk.gray('│'),
      this.formatNumber(event.size_bytes, 10),
      chalk.gray('│'),
      this.formatNumber(event.lines, 8)
    ];
    
    return parts.join(' ');
  }

  /**
   * Format timestamp for display (HH:MM:SS format)
   */
  formatTimestamp(date: Date | string | number): string {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    
    return chalk.gray(`${hours}:${minutes}:${seconds}`);
  }

  /**
   * Format elapsed time
   */
  formatElapsed(ms: number | null | undefined): string {
    if (ms === null || ms === undefined) {
      return padStartWithWidth('-', 7);
    }
    
    if (ms < 1000) {
      return padStartWithWidth(`${ms}ms`, 7);
    } else if (ms < 60000) {
      const seconds = (ms / 1000).toFixed(1);
      return padStartWithWidth(`${seconds}s`, 7);
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      return padStartWithWidth(`${minutes}m${seconds}s`, 7);
    }
  }

  /**
   * Format directory path with truncation
   */
  formatDirectory(dirPath: string): string {
    const maxWidth = this.widthConfig.directoryWidth;
    
    if (!dirPath || dirPath === '.') {
      return '.';
    }
    
    // Remove trailing slash
    dirPath = dirPath.replace(/\/$/, '');
    
    // If path fits, return as-is
    const pathWidth = this.calculateStringWidth(dirPath);
    if (pathWidth <= maxWidth) {
      return dirPath;
    }
    
    // Truncate with ellipsis
    return this.truncateDirectoryPathWithWidth(dirPath, maxWidth);
  }

  /**
   * Truncate directory path with width consideration
   */
  private truncateDirectoryPathWithWidth(dirPath: string, maxWidth: number): string {
    // Implementation matching original behavior
    return truncateWithEllipsis(dirPath, maxWidth);
  }

  /**
   * Format event type with color
   */
  formatEventType(eventType: string): string {
    const width = 6;
    
    switch (eventType) {
      case 'find':
        return chalk.gray(padStartWithWidth('find', width));
      case 'create':
        return chalk.green(padStartWithWidth('create', width));
      case 'modify':
        return chalk.yellow(padStartWithWidth('modify', width));
      case 'delete':
        return chalk.red(padStartWithWidth('delete', width));
      case 'move':
        return chalk.cyan(padStartWithWidth('move', width));
      default:
        return padStartWithWidth(eventType, width);
    }
  }

  /**
   * Format number with proper width and alignment
   */
  formatNumber(value: number | null | undefined, width: number): string {
    if (value === null || value === undefined) {
      return padStartWithWidth('-', width);
    }
    
    return padStartWithWidth(value.toLocaleString(), width);
  }

  /**
   * Calculate string width considering East Asian characters
   */
  private calculateStringWidth(str: string): number {
    const stringWidth = require('string-width');
    return stringWidth(str);
  }

  /**
   * Update width configuration
   */
  updateWidthConfig(widthConfig: CLIDisplayLegacyWidthConfig): void {
    this.widthConfig = widthConfig;
  }
}